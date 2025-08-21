/* eslint-disable no-unused-vars */
declare namespace WebdriverIO {
  interface Browser {
    hostedFieldSendInput: (arg: string) => Promise<void>;
    reloadSessionOnRetry: (arg: unknown) => Promise<void>;
    submitPay: () => Promise<void>;
    getResult: () => Promise<Record<string, boolean>>;
  }
}
