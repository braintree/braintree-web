// Define basic Braintree types for the global window object
// cspell:ignore Braintree
interface IBraintreeConfiguration {
  authorization: string;
  environment: string;
  clientApiUrl: string;
  assetsUrl: string;
  analytics: {
    url: string;
  };
  merchantId: string;
  venmo?: {
    accessToken: string;
    environment: string;
  };
}

interface IBraintreeClient {
  getConfiguration(): IBraintreeConfiguration;
}

interface IVenmoInstance {
  isBrowserSupported(): boolean;
  hasTokenizationResult(): boolean;
  tokenize(): Promise<{
    nonce: string;
    details: {
      username: string;
    };
  }>;
  cancelTokenization(): Promise<void>;
  teardown(): Promise<void>;
}

interface IPaymentMethod {
  nonce: string;
  type: string;
  details: Record<string, unknown>;
}

interface IVaultManagerInstance {
  fetchPaymentMethods(): Promise<IPaymentMethod[]>;
  deletePaymentMethod(_nonce: string): Promise<void>;
  teardown(): Promise<void>;
}

declare global {
  interface Window {
    braintree: {
      client: {
        create: (_options: {
          authorization: string;
        }) => Promise<IBraintreeClient>;
      };
      venmo: {
        create: (_options: {
          client: IBraintreeClient;
          allowDesktop?: boolean;
          allowDesktopWebLogin?: boolean;
          mobileWebFallBack?: boolean;
          paymentMethodUsage?: "single_use" | "multi_use";
          [key: string]: unknown;
        }) => Promise<IVenmoInstance>;
      };
      vaultManager: {
        create: (_options: {
          client: IBraintreeClient;
        }) => Promise<IVaultManagerInstance>;
      };
    };
    paypal: {
      Buttons: (_options: Record<string, unknown>) => {
        render: (_selector: string) => Promise<void>;
      };
      FUNDING: {
        PAYPAL: string;
        CREDIT: string;
        CARD: string;
      };
    };
    ApplePaySession: Record<string, unknown>;
  }

  // Extend the global braintree object for direct access
  const braintree: Window["braintree"];
  const paypal: Window["paypal"];
}

// PayPal Checkout Components types
declare module "paypal-checkout-components" {
  export interface AuthorizationResponse {
    orderID?: string;
    paymentID?: string;
    payerID?: string;
    email?: string;
    status?: string;
  }
}

export {};
