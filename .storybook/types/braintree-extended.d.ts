import "braintree-web";

// Extend Braintree Web types with additional properties and methods
declare module "braintree-web" {
  // Extended PayPal Checkout options
  interface PayPalCheckoutCreatePaymentOptions {
    flow: "checkout" | "vault";
    amount?: string;
    currency?: string;
    intent?: "capture" | "authorize" | "order" | "tokenize";
    enableShippingAddress?: boolean;
    shippingAddressEditable?: boolean;
    shippingAddressOverride?: {
      recipientName?: string;
      line1?: string;
      line2?: string;
      city?: string;
      countryCode?: string;
      postalCode?: string;
      state?: string;
      phone?: string;
    };
    planType?: string;
    planMetadata?: {
      billingCycles?: Array<{
        billingFrequency?: string;
        billingFrequencyUnit?: string;
        numberOfExecutions?: string;
        sequence?: string;
        startDate?: string;
        trial?: boolean;
        pricingScheme?: {
          pricingModel?: string;
          price?: number;
        };
      }>;
      currencyIsoCode?: string;
      name?: string;
      productDescription?: string;
      productQuantity?: string;
      oneTimeFeeAmount?: string;
      shippingAmount?: string;
      productPrice?: string;
      taxAmount?: string;
      totalAmount?: number;
    };
  }

  // Extended Venmo tokenize payload
  interface VenmoTokenizePayload {
    nonce: string;
    type: string;
    details: {
      username: string;
      [key: string]: unknown;
    };
  }

  // Extended Three D Secure types
  interface ThreeDSecureVerifyOptions {
    amount: string;
    nonce: string;
    bin?: string;
    email?: string;
    billingAddress?: {
      givenName?: string;
      surname?: string;
      phoneNumber?: string;
      streetAddress?: string;
      extendedAddress?: string;
      locality?: string;
      region?: string;
      postalCode?: string;
      countryCodeAlpha2?: string;
    };
  }

  interface ThreeDSecureVerifyPayload {
    nonce: string;
    liabilityShifted: boolean;
    liabilityShiftPossible: boolean;
    [key: string]: unknown;
  }

  interface ThreeDSecure {
    verifyCard(
      _options: ThreeDSecureVerifyOptions
    ): Promise<ThreeDSecureVerifyPayload>;
    cancelVerifyCard(_callback?: () => void): void;
    on(
      _event: string,
      _handler: (_payload?: unknown, _next?: () => void) => void
    ): void;
  }

  // Local Payment types
  interface LocalPaymentStartOptions {
    paymentType: string;
    amount: string;
    currency: string;
    countryCode: string;
    fallback?: {
      url: string;
      buttonText: string;
    };
    shippingAddressRequired?: boolean;
    email?: string;
    givenName?: string;
    surname?: string;
    phone?: string;
    streetAddress?: string;
    locality?: string;
    postalCode?: string;
  }

  // BraintreeError interface
  interface BraintreeError {
    type: string;
    code: string;
    message: string;
    details?: unknown;
  }

  interface LocalPayment {
    startPayment(
      _options: LocalPaymentStartOptions,
      _callback: (_error: BraintreeError | null, _payload?: unknown) => void
    ): void;
  }

  // Apple Pay extended types
  interface ApplePayPaymentRequest {
    total: {
      label: string;
      amount: string;
    };
    currencyCode: string;
    countryCode: string;
    supportedNetworks: string[];
    merchantCapabilities: string[];
  }

  interface ApplePay {
    merchantIdentifier: string;
    createPaymentRequest(_options: ApplePayPaymentRequest): unknown;
    performValidation(
      _options: { validationURL: string; displayName: string },
      _callback: (
        _error: BraintreeError | null,
        _merchantSession?: unknown
      ) => void
    ): void;
    tokenize(
      _options: { token: unknown },
      _callback: (_error: BraintreeError | null, _payload?: unknown) => void
    ): void;
  }

  // Venmo instance interface
  interface VenmoInstance {
    isBrowserSupported(): boolean;
    hasTokenizationResult(): boolean;
    tokenize(): Promise<VenmoTokenizePayload>;
    cancelTokenization(): Promise<void>;
    teardown(): Promise<void>;
  }

  // Client interface
  interface Client {
    getConfiguration(): unknown;
    request(_options: unknown): Promise<unknown>;
    teardown(): Promise<void>;
    [key: string]: unknown;
  }

  // HostedFields interface
  interface HostedFields {
    tokenize(): Promise<unknown>;
    teardown(): Promise<void>;
    [key: string]: unknown;
  }

  // Add module creation functions
  namespace client {
    function create(_options: { authorization: string }): Promise<Client>;
  }

  namespace hostedFields {
    function create(_options: unknown): Promise<HostedFields>;
  }

  namespace paypalCheckout {
    function create(_options: { client: Client }): Promise<unknown>;
  }

  namespace venmo {
    function create(_options: {
      client: Client;
      allowDesktop?: boolean;
      allowDesktopWebLogin?: boolean;
      mobileWebFallBack?: boolean;
      paymentMethodUsage?: "single_use" | "multi_use";
      [key: string]: unknown;
    }): Promise<VenmoInstance>;
  }

  namespace threeDSecure {
    function create(_options: {
      client: Client;
      version?: string;
    }): Promise<ThreeDSecure>;
  }

  namespace localPayment {
    function create(_options: { client: Client }): Promise<LocalPayment>;
  }

  namespace applePay {
    function create(_options: { client: Client }): Promise<ApplePay>;
  }
}
