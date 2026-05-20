import type { CDPSession, Frame, Page } from "@playwright/test";

/**
 * Shape produced by Playwright page.coverage.stopJSCoverage() and expected by
 * mergePlaywrightV8Coverage in integration-coverage-store.ts.
 */
export type JsCoverageEntry = {
  url: string;
  scriptId?: string;
  source?: string;
  functions?: unknown[];
};

type StartOptions = {
  resetOnNavigation?: boolean;
  reportAnonymousScripts?: boolean;
};

type ScriptParsedEvent = {
  scriptId: string;
  url?: string;
};

type PreciseCoverageEntry = {
  scriptId: string;
  url?: string;
  functions?: unknown[];
};

type TakePreciseCoverageResult = {
  result?: PreciseCoverageEntry[];
};

/**
 * Mirrors playwright-core JSCoverage (crCoverage.js) for a single CDP target
 * (one Frame). page.coverage only instruments the Page's primary target, so
 * SDK code in child iframes is missing unless we attach a session per frame.
 */
class FrameJSCoverageCollector {
  private readonly session: CDPSession;
  private readonly resetOnNavigation: boolean;
  private readonly reportAnonymousScripts: boolean;
  private readonly scriptIds = new Set<string>();
  private readonly scriptSources = new Map<string, string>();
  private readonly boundOnScriptParsed: (_event: ScriptParsedEvent) => void;
  private readonly boundOnCleared: () => void;
  private readonly boundOnPaused: () => void;
  private enabled = false;

  constructor(session: CDPSession, options: Required<StartOptions>) {
    this.session = session;
    this.resetOnNavigation = options.resetOnNavigation;
    this.reportAnonymousScripts = options.reportAnonymousScripts;
    this.boundOnScriptParsed = (event: ScriptParsedEvent) => {
      this.onScriptParsed(event).catch(() => {
        /* ignore async scriptParsed errors */
      });
    };
    this.boundOnCleared = () => {
      this.onExecutionContextsCleared();
    };
    this.boundOnPaused = () => {
      this.session.send("Debugger.resume", {}).catch(() => {
        /* ignore */
      });
    };
  }

  private onExecutionContextsCleared(): void {
    if (!this.resetOnNavigation) {
      return;
    }
    this.scriptIds.clear();
    this.scriptSources.clear();
  }

  private async onScriptParsed(event: ScriptParsedEvent): Promise<void> {
    this.scriptIds.add(event.scriptId);
    if (!event.url && !this.reportAnonymousScripts) {
      return;
    }
    try {
      const response = (await this.session.send("Debugger.getScriptSource", {
        scriptId: event.scriptId,
      })) as { scriptSource?: string } | null;
      if (response && typeof response.scriptSource === "string") {
        this.scriptSources.set(event.scriptId, response.scriptSource);
      }
    } catch {
      /* same as Playwright _sendMayFail */
    }
  }

  async start(): Promise<void> {
    if (this.enabled) {
      throw new Error("FrameJSCoverageCollector.start: already enabled");
    }
    this.enabled = true;
    this.scriptIds.clear();
    this.scriptSources.clear();

    this.session.on("Debugger.scriptParsed", this.boundOnScriptParsed);
    this.session.on("Runtime.executionContextsCleared", this.boundOnCleared);
    this.session.on("Debugger.paused", this.boundOnPaused);

    try {
      await Promise.all([
        this.session.send("Profiler.enable", {}),
        this.session.send("Profiler.startPreciseCoverage", {
          callCount: true,
          detailed: true,
        }),
        this.session.send("Debugger.enable", {}),
        this.session.send("Debugger.setSkipAllPauses", { skip: true }),
      ]);
    } catch (err) {
      this.session.off("Debugger.scriptParsed", this.boundOnScriptParsed);
      this.session.off("Runtime.executionContextsCleared", this.boundOnCleared);
      this.session.off("Debugger.paused", this.boundOnPaused);
      this.enabled = false;
      throw err;
    }
  }

  async stop(): Promise<JsCoverageEntry[]> {
    if (!this.enabled) {
      return [];
    }

    /* Keep Debugger enabled until after we may call getScriptSource for scripts
     * that appear in takePreciseCoverage but never fired scriptParsed on this session
     * (e.g. iframe bundle parsed before the listener attached). */
    const [profileResponse] = await Promise.all([
      this.session.send("Profiler.takePreciseCoverage", {}),
      this.session.send("Profiler.stopPreciseCoverage", {}),
    ]);

    const entries: JsCoverageEntry[] = [];
    const result = (profileResponse as TakePreciseCoverageResult).result ?? [];

    for (const entry of result) {
      if (!this.scriptIds.has(entry.scriptId)) {
        try {
          const response = (await this.session.send(
            "Debugger.getScriptSource",
            {
              scriptId: entry.scriptId,
            }
          )) as { scriptSource?: string } | null;

          if (response && typeof response.scriptSource === "string") {
            this.scriptIds.add(entry.scriptId);
            this.scriptSources.set(entry.scriptId, response.scriptSource);
          }
        } catch {
          /* script may be unknown to this target */
        }
      }

      if (!this.scriptIds.has(entry.scriptId)) {
        continue;
      }

      if (!entry.url && !this.reportAnonymousScripts) {
        continue;
      }

      const source = this.scriptSources.get(entry.scriptId);
      const url = entry.url ?? "";

      if (source) {
        entries.push({
          url,
          scriptId: entry.scriptId,
          functions: entry.functions,
          source,
        });
      } else {
        entries.push({
          url,
          scriptId: entry.scriptId,
          functions: entry.functions,
        });
      }
    }

    await Promise.all([
      this.session.send("Profiler.disable", {}),
      this.session.send("Debugger.disable", {}),
    ]);

    this.session.off("Debugger.scriptParsed", this.boundOnScriptParsed);
    this.session.off("Runtime.executionContextsCleared", this.boundOnCleared);
    this.session.off("Debugger.paused", this.boundOnPaused);
    this.enabled = false;

    return entries;
  }

  async detach(): Promise<void> {
    try {
      await this.session.detach();
    } catch {
      /* frame/target may already be gone */
    }
  }
}

export type MultiFrameJSCoverageSession = {
  /** Stop collectors, detach CDP sessions, unregister frame listener. */
  finish: () => Promise<JsCoverageEntry[]>;
};

const FRAME_ATTACHED = "frameattached" as const;

/**
 * Start JS coverage on every current Frame and on frames that attach later
 * (e.g. Braintree hosted field / wallet iframes).
 */
export async function startMultiFrameJSCoverage(
  page: Page,
  options?: StartOptions
): Promise<MultiFrameJSCoverageSession> {
  const resetOnNavigation = options?.resetOnNavigation ?? true;
  const reportAnonymousScripts = options?.reportAnonymousScripts ?? false;
  const collectors: FrameJSCoverageCollector[] = [];
  const coveredFrames = new Set<Frame>();

  async function attachToFrame(frame: Frame): Promise<void> {
    if (coveredFrames.has(frame)) {
      return;
    }
    if (frame.isDetached()) {
      return;
    }

    coveredFrames.add(frame);

    let session: CDPSession | null = null;
    try {
      session = await page.context().newCDPSession(frame);
    } catch {
      coveredFrames.delete(frame);
      return;
    }

    const collector = new FrameJSCoverageCollector(session, {
      resetOnNavigation,
      reportAnonymousScripts,
    });

    try {
      await collector.start();
      collectors.push(collector);
    } catch (err) {
      coveredFrames.delete(frame);
      await session.detach().catch(() => {
        /* ignore */
      });
      throw err;
    }
  }

  const onFrameAttached = (frame: Frame) => {
    attachToFrame(frame).catch(() => {
      /* ignore attach races (e.g. frame detached immediately) */
    });
  };

  page.on(FRAME_ATTACHED, onFrameAttached);

  try {
    await Promise.all(page.frames().map((frame) => attachToFrame(frame)));
  } catch (err) {
    page.off(FRAME_ATTACHED, onFrameAttached);
    for (let i = collectors.length - 1; i >= 0; i -= 1) {
      await collectors[i].stop().catch(() => {
        /* ignore */
      });
      await collectors[i].detach();
    }
    collectors.length = 0;
    coveredFrames.clear();
    throw err;
  }

  return {
    finish: async () => {
      page.off(FRAME_ATTACHED, onFrameAttached);

      const allEntries: JsCoverageEntry[] = [];

      for (let i = collectors.length - 1; i >= 0; i -= 1) {
        const collector = collectors[i];
        try {
          const entries = await collector.stop();
          allEntries.push(...entries);
        } catch {
          /* frame closed or CDP already torn down */
        }
        await collector.detach();
      }

      collectors.length = 0;
      coveredFrames.clear();

      return allEntries;
    },
  };
}
