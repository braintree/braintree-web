export interface BrowserStackCapability {
  browserName: string;
  "bstack:options": {
    browserVersion?: string;
    os?: string;
    osVersion?: string;
    local?: boolean;
    debug?: boolean;
    localIdentifier?: string;
    networkLogs?: boolean;
    deviceName?: string;
    deviceOrientation?: string;
    [key: string]: unknown; // Allow additional properties
  };
  acceptInsecureCerts?: boolean;
}

export interface BrowserSpecification {
  browserName: string;
  browserVersion: string;
  osName: string;
  osVersion: string;
  playwrightName?: string;
}
