/* eslint-disable no-console */

export function isScriptLoaded(url: string): boolean {
  return Boolean(document.querySelector(`script[src="${url}"]`));
}

export function loadScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isScriptLoaded(url)) {
      resolve();
      return;
    }

    const script = document.createElement("script");

    script.src = url;

    script.onload = () => {
      console.log(`Loaded: ${url}`);
      resolve();
    };

    script.onerror = () => {
      console.error(`Failed to load: ${url}`);
      reject(new Error(`Failed to load ${url}`));
    };

    document.head.appendChild(script);
  });
}

export function removeScript(url: string): void {
  const script = document.querySelector(`script[src="${url}"]`);
  if (script) {
    script.remove();
  }
}

export function removeScriptsByPattern(patterns: string[]): void {
  const selector = patterns
    .map((pattern) => `script[src*="${pattern}"]`)
    .join(", ");

  if (selector) {
    const scripts = document.querySelectorAll(selector);
    scripts.forEach((script) => script.remove());
  }
}

export async function loadScriptsSequentially(urls: string[]): Promise<void> {
  for (const url of urls) {
    await loadScript(url);
  }
}
