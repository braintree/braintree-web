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
 * Timeout (ms) for holding frame HTML responses while awaiting CDP profiler readiness.
 * If the CDP session isn't ready within this window, release the response anyway
 * (coverage may be partial but the test won't hang).
 */
const ROUTE_GATE_TIMEOUT_MS = 5000;

/**
 * URL pattern matching frame HTML files served from local-build.
 * Matches both minified and unminified variants.
 */
const FRAME_HTML_ROUTE_PATTERN = "**/local-build/html/*.html";

/**
 * Start JS coverage on every current Frame and on frames that attach later
 * (e.g. Braintree hosted field / wallet iframes).
 *
 * Uses page.route() to gate frame HTML delivery until the CDP profiler is
 * confirmed active on the new frame, preventing a race condition where the
 * inline bundle executes before coverage instrumentation is ready.
 */
export async function startMultiFrameJSCoverage(
  page: Page,
  options?: StartOptions
): Promise<MultiFrameJSCoverageSession> {
  const resetOnNavigation = options?.resetOnNavigation ?? true;
  const reportAnonymousScripts = options?.reportAnonymousScripts ?? false;
  const collectors: FrameJSCoverageCollector[] = [];
  const coveredFrames = new Set<Frame>();

  /*
   * Route-gating: hold frame HTML responses until the CDP profiler is active.
   *
   * pendingAttachPromises tracks attachToFrame() promises for newly attached
   * frames. The route handler awaits ALL pending attach operations before
   * releasing the HTML response.
   */

  let pendingAttachPromises: Promise<void>[] = [];

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
    const attachPromise = attachToFrame(frame).catch(() => {
      /* ignore attach races (e.g. frame detached immediately) */
    });

    pendingAttachPromises.push(attachPromise);

    // Clean up resolved promises to avoid unbounded growth
    attachPromise.finally(() => {
      pendingAttachPromises = pendingAttachPromises.filter(
        (p) => p !== attachPromise
      );
    });
  };

  /*
   * Route handler: intercepts frame HTML requests and holds the response until
   * all pending CDP attach operations have completed. This guarantees the
   * profiler is active before the inline bundle in the HTML executes.
   */
  const frameHtmlRouteHandler = async (
    route: Parameters<Parameters<Page["route"]>[1]>[0]
  ): Promise<void> => {
    if (pendingAttachPromises.length > 0) {
      const gate = Promise.all([...pendingAttachPromises]);
      let timeoutId: ReturnType<typeof setTimeout>;
      const timeout = new Promise<void>((resolve) => {
        timeoutId = setTimeout(() => {
          /* eslint-disable no-console */
          console.warn(
            "[integration-coverage] route gate timeout — releasing frame HTML before CDP confirmed ready:",
            route.request().url()
          );
          /* eslint-enable no-console */
          resolve();
        }, ROUTE_GATE_TIMEOUT_MS);
      });

      await Promise.race([gate, timeout]);
      clearTimeout(timeoutId!);
    }

    try {
      await route.continue();
    } catch {
      /* route may have been aborted if the frame detached */
    }
  };

  // Register route gate BEFORE frame listener to ensure it intercepts the
  // very first frame HTML request triggered by iframe creation.
  await page.route(FRAME_HTML_ROUTE_PATTERN, frameHtmlRouteHandler);

  page.on(FRAME_ATTACHED, onFrameAttached);

  try {
    await Promise.all(page.frames().map((frame) => attachToFrame(frame)));
  } catch (err) {
    page.off(FRAME_ATTACHED, onFrameAttached);
    await page.unroute(FRAME_HTML_ROUTE_PATTERN, frameHtmlRouteHandler);
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
      await page.unroute(FRAME_HTML_ROUTE_PATTERN, frameHtmlRouteHandler);

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
