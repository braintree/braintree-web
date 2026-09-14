/**
 * Global Type Definitions for Storybook
 *
 * This file provides type definitions for global objects used in Storybook stories
 * including the Braintree SDK, PayPal SDK, and ApplePaySession.
 */

/* eslint-disable no-unused-vars */

// ============================================================================
// Braintree SDK Types
// ============================================================================

/**
 * Braintree `gatewayConfiguration` returned inside `client.getConfiguration()`.
 */
interface IBraintreeConfiguration {
  environment: string;
  merchantId: string;
  assetsUrl: string;
  clientApiUrl: string;
  // Added by the config adapter from the URL used to fetch config; used by
  // client.js for domain verification. Not returned by the GraphQL query.
  graphQL: {
    url: string;
  };
  creditCard?: {
    supportedCardBrands?: string[] | null;
    challenges?: string[] | null;
    threeDSecureEnabled?: boolean | null;
    threeDSecure?: {
      cardinalAuthenticationJWT?: string | null;
      cardinalSongbirdUrl?: string | null;
      cardinalSongbirdIdentityHash?: string | null;
    } | null;
  } | null;
  applePayWeb?: {
    countryCode?: string | null;
    currencyCode?: string | null;
    merchantIdentifier?: string | null;
    supportedCardBrands?: string[] | null;
  } | null;
  fastlane?: {
    enabled?: boolean | null;
    tokensOnDemand?: {
      enabled?: boolean | null;
      tokenExchange?: {
        enabled?: boolean | null;
      } | null;
    } | null;
  } | null;
  googlePay?: {
    displayName?: string | null;
    supportedCardBrands?: string[] | null;
    environment?: string | null;
    googleAuthorization?: string | null;
    paypalClientId?: string | null;
  } | null;
  ideal?: {
    routeId?: string | null;
    assetsUrl?: string | null;
  } | null;
  openBanking?: {
    businessNames?: string[] | null;
    allowListedDomains?: string[] | null;
    profileId?: string | null;
  } | null;
  paypal?: {
    displayName?: string | null;
    clientId?: string | null;
    assetsUrl?: string | null;
    environment?: string | null;
    environmentNoNetwork?: boolean | null;
    unvettedMerchant?: boolean | null;
    braintreeClientId?: string | null;
    billingAgreementsEnabled?: boolean | null;
    merchantAccountId?: string | null;
    currencyCode?: string | null;
    payeeEmail?: string | null;
  } | null;
  usBankAccount?: {
    routeId?: string | null;
  } | null;
  venmo?: {
    merchantId?: string | null;
    accessToken?: string | null;
    environment?: string | null;
    enrichedCustomerDataEnabled?: boolean | null;
  } | null;
  braintreeApi?: {
    accessToken?: string | null;
    url?: string | null;
  } | null;
  [key: string]: unknown;
}

/**
 * Braintree Client instance
 */
interface IBraintreeClient {
  getConfiguration(): {
    authorizationType: string;
    authorizationFingerprint?: string;
    paymentMethodIdJwt?: string;
    analyticsMetadata: Record<string, unknown>;
    gatewayConfiguration: IBraintreeConfiguration;
  };
  getVersion(): string;
  request(options: unknown): Promise<unknown>;
  teardown(): Promise<void>;
}

// ============================================================================
// Hosted Fields Types
// ============================================================================

type HostedFieldCard =
  import("credit-card-type/dist/types").BuiltInCreditCardType;

/**
 * Field state information
 */
interface IHostedFieldState {
  container: HTMLElement;
  isFocused: boolean;
  isEmpty: boolean;
  isPotentiallyValid: boolean;
  isValid: boolean;
}

/**
 * Hosted Fields state returned by getState() or emitted by events
 */
interface IHostedFieldsState {
  cards: HostedFieldCard[];
  fields: {
    number?: IHostedFieldState;
    cvv?: IHostedFieldState;
    expirationDate?: IHostedFieldState;
    expirationMonth?: IHostedFieldState;
    expirationYear?: IHostedFieldState;
    postalCode?: IHostedFieldState;
    cardholderName?: IHostedFieldState;
  };
}

/**
 * Hosted Fields tokenize payload
 */
interface IHostedFieldsTokenizePayload {
  nonce: string;
  type: string;
  details: {
    bin: string;
    cardType: string;
    expirationMonth: string;
    expirationYear: string;
    lastFour: string;
    lastTwo: string;
  };
  description: string;
  binData: {
    commercial: string;
    countryOfIssuance: string;
    debit: string;
    durbinRegulated: string;
    healthcare: string;
    issuingBank: string;
    payroll: string;
    prepaid: string;
    productId: string;
  };
}

/**
 * Hosted Fields event callback data
 */
interface IHostedFieldsEventData {
  emittedBy: string;
  fields: IHostedFieldsState["fields"];
  cards: HostedFieldCard[];
  bin?: string;
}

/**
 * Hosted Fields instance
 */
interface IHostedFieldsInstance {
  addClass(field: string, className: string): Promise<void>;
  clear(field: string): Promise<void>;
  focus(field: string): Promise<void>;
  getState(): IHostedFieldsState;
  on(
    event: string,
    callback: (data: IHostedFieldsEventData) => void
  ): IHostedFieldsInstance;
  off(
    event: string,
    callback: (data: IHostedFieldsEventData) => void
  ): IHostedFieldsInstance;
  removeAttribute(options: { field: string; attribute: string }): Promise<void>;
  removeClass(field: string, className: string): Promise<void>;
  setAttribute(options: {
    field: string;
    attribute: string;
    value: string | boolean;
  }): Promise<void>;
  setMessage(options: { field: string; message: string }): void;
  setMonthOptions(options: unknown[]): void;
  tokenize(options?: {
    vault?: boolean;
    cardholderName?: string;
    billingAddress?: unknown;
  }): Promise<IHostedFieldsTokenizePayload>;
  teardown(): Promise<void>;
}

/**
 * Hosted Fields field configuration
 */
interface IHostedFieldConfig {
  placeholder?: string;
  container?: string | HTMLElement;
  type?: string;
  formatInput?: boolean;
  maskInput?: boolean | { character?: string; showLastFour?: boolean };
  select?: boolean | { options: string[] };
  maxCardLength?: number;
  minlength?: number;
  maxlength?: number;
  prefill?: string;
  supportedCardBrands?: Record<string, boolean>;
}

/**
 * Hosted Fields create options
 */
interface IHostedFieldsCreateOptions {
  client?: IBraintreeClient;
  authorization?: string;
  fields: {
    number?: IHostedFieldConfig;
    cvv?: Omit<IHostedFieldConfig, "formatInput" | "maxCardLength">;
    expirationDate?: Pick<
      IHostedFieldConfig,
      "placeholder" | "type" | "container" | "prefill"
    >;
    expirationMonth?: Pick<
      IHostedFieldConfig,
      "placeholder" | "type" | "container" | "prefill" | "select"
    >;
    expirationYear?: Pick<
      IHostedFieldConfig,
      "placeholder" | "type" | "container" | "prefill" | "select"
    >;
    postalCode?: Pick<
      IHostedFieldConfig,
      "placeholder" | "type" | "minlength" | "maxlength" | "prefill"
    >;
    cardholderName?: Pick<
      IHostedFieldConfig,
      | "container"
      | "placeholder"
      | "type"
      | "minlength"
      | "maxlength"
      | "prefill"
    >;
  };
  styles?: {
    input?: Record<string, string>;
    ":focus"?: Record<string, string>;
    ".valid"?: Record<string, string>;
    ".invalid"?: Record<string, string>;
    [key: string]: Record<string, string> | undefined;
  };
  preventAutofill?: boolean;
  binVerificationLength?: 6 | 8;
}

// ============================================================================
// Venmo Types
// ============================================================================

/**
 * Venmo tokenize payload
 */
interface IVenmoTokenizePayload {
  nonce: string;
  type: string;
  details: {
    username: string;
    payerInfo?: {
      email?: string;
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
      externalId?: string;
    };
  };
}

/**
 * Venmo instance
 */
interface IVenmoInstance {
  isBrowserSupported(): boolean;
  tokenize(options?: {
    processResultsDelay?: number;
  }): Promise<IVenmoTokenizePayload>;
  cancelTokenization(): Promise<void>;
  teardown(): Promise<void>;
}

/**
 * Venmo create options
 */
interface IVenmoCreateOptions {
  client?: IBraintreeClient;
  authorization?: string;
  allowDesktop?: boolean;
  allowDesktopWebLogin?: boolean;
  mobileWebFallBack?: boolean;
  paymentMethodUsage: "single_use" | "multi_use";
  profileId?: string;
  deepLinkReturnUrl?: string;
  riskCorrelationId?: string;
  requireManualReturn?: boolean;
  useRedirectForIOS?: boolean;
  useWebLogin?: boolean;
  collectCustomerBillingAddress?: boolean;
  collectCustomerShippingAddress?: boolean;
  displayName?: string;
  lineItems?: Array<{
    kind: "debit" | "credit";
    name: string;
    quantity: number;
    unitAmount: string;
    unitTaxAmount?: string;
    description?: string;
    productCode?: string;
    url?: string;
    imageUrl?: string;
  }>;
  subTotalAmount?: string;
  discountAmount?: string;
  taxAmount?: string;
  shippingAmount?: string;
  totalAmount?: string;
  [key: string]: unknown;
}

// ============================================================================
// Vault Manager Types
// ============================================================================

/**
 * Payment method details
 */
interface IPaymentMethod {
  nonce: string;
  type: string;
  default: boolean;
  description: string;
  details: {
    bin?: string;
    cardType?: string;
    lastFour?: string;
    lastTwo?: string;
    expirationMonth?: string;
    expirationYear?: string;
    username?: string;
    email?: string;
    payerId?: string;
    firstName?: string;
    lastName?: string;
    [key: string]: unknown;
  };
  binData?: {
    commercial: string;
    countryOfIssuance: string;
    debit: string;
    durbinRegulated: string;
    healthcare: string;
    issuingBank: string;
    payroll: string;
    prepaid: string;
    productId: string;
  };
}

/**
 * Vault Manager instance
 */
interface IVaultManagerInstance {
  fetchPaymentMethods(options?: {
    defaultFirst?: boolean;
  }): Promise<IPaymentMethod[]>;
  deletePaymentMethod(nonce: string): Promise<void>;
  teardown(): Promise<void>;
}

// ============================================================================
// PayPal Checkout Types
// ============================================================================

/**
 * PayPal Checkout create payment options
 */
interface IPayPalCheckoutCreatePaymentOptions {
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
  billingAgreementDescription?: string;
  displayName?: string;
  landingPageType?: "login" | "billing";
  locale?: string;
  offerCredit?: boolean;
  offerPayLater?: boolean;
  planType?: string;
  planMetadata?: unknown;
  [key: string]: unknown;
}

/**
 * PayPal Checkout tokenize payload
 */
interface IPayPalCheckoutTokenizePayload {
  nonce: string;
  type: string;
  details: {
    email?: string;
    payerId?: string;
    firstName?: string;
    lastName?: string;
    countryCode?: string;
    phone?: string;
    shippingAddress?: {
      recipientName?: string;
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      countryCode?: string;
    };
    billingAddress?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      countryCode?: string;
    };
    [key: string]: unknown;
  };
  creditFinancingOffered?: unknown;
}

/**
 * PayPal Checkout update payment (patch) options (subset; SDK allows more).
 */
interface IPayPalCheckoutUpdatePaymentOptions {
  paymentId: string;
  currency: string;
  amount?: string;
  lineItems?: unknown[];
  shippingOptions?: unknown[];
  amountBreakdown?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * PayPal Checkout instance
 */
interface IPayPalCheckoutInstance {
  createPayment(options?: IPayPalCheckoutCreatePaymentOptions): Promise<string>;
  updatePayment(
    options?: IPayPalCheckoutUpdatePaymentOptions
  ): Promise<unknown>;
  tokenizePayment(
    tokenizeOptions: unknown
  ): Promise<IPayPalCheckoutTokenizePayload>;
  getClientId(): Promise<string>;
  loadPayPalSDK(options: {
    pageType: string;
    currency?: string;
    intent?: string;
    isCreditEnabled?: boolean;
    "disable-funding"?: string;
    "enable-funding"?: string;
    [key: string]: unknown;
  }): Promise<void>;
  startVaultInitiatedCheckout(options: {
    vaultInitiatedCheckoutPaymentMethodToken: string;
    amount: string;
    currency: string;
    optOutOfModalBackdrop?: boolean;
    [key: string]: unknown;
  }): Promise<IPayPalCheckoutTokenizePayload>;
  teardown(): Promise<void>;
}

// ============================================================================
// Three D Secure Types
// ============================================================================

/**
 * 3D Secure verify options
 */
interface IThreeDSecureVerifyOptions {
  amount: string;
  nonce: string;
  bin?: string;
  email?: string;
  mobilePhoneNumber?: string;
  billingAddress?: {
    givenName?: string;
    surname?: string;
    phoneNumber?: string;
    streetAddress?: string;
    extendedAddress?: string;
    line3?: string;
    locality?: string;
    region?: string;
    postalCode?: string;
    countryCodeAlpha2?: string;
  };
  additionalInformation?: {
    workPhoneNumber?: string;
    shippingGivenName?: string;
    shippingSurname?: string;
    shippingPhone?: string;
    shippingAddress?: {
      streetAddress?: string;
      extendedAddress?: string;
      line3?: string;
      locality?: string;
      region?: string;
      postalCode?: string;
      countryCodeAlpha2?: string;
    };
    [key: string]: unknown;
  };
  challengeRequested?: boolean;
  requestedExemptionType?: string;
  dataOnlyRequested?: boolean;
  cardAddChallengeRequested?: boolean;
  onLookupComplete?: (data: unknown, next: () => void) => void;
  [key: string]: unknown;
}

/**
 * 3D Secure verify payload
 */
interface IThreeDSecureVerifyPayload {
  nonce: string;
  type: string;
  threeDSecureInfo: {
    liabilityShifted: boolean;
    liabilityShiftPossible: boolean;
    [key: string]: unknown;
  };
  authenticationResponse?: string;
  lookup?: {
    threeDSecureVersion: string;
    transactionId: string;
  };
  details?: {
    bin?: string;
    cardType?: string;
    lastFour?: string;
    lastTwo?: string;
  };
  binData?: unknown;
  [key: string]: unknown;
}

/**
 * 3D Secure instance
 */
interface IThreeDSecureInstance {
  verifyCard(
    options: IThreeDSecureVerifyOptions
  ): Promise<IThreeDSecureVerifyPayload>;
  cancelVerifyCard(callback?: () => void): void;
  on(
    event: string,
    handler: (
      payload?: { next: () => void; element: HTMLElement },
      next?: () => void
    ) => void
  ): IThreeDSecureInstance;
  off(
    event: string,
    handler: (payload?: unknown, next?: () => void) => void
  ): IThreeDSecureInstance;
  prepareLookup(options: { nonce: string; bin?: string }): Promise<string>;
  initializeChallengeWithLookupResponse(
    lookupResponse: string
  ): Promise<IThreeDSecureVerifyPayload>;
  teardown(): Promise<void>;
}

/**
 * 3D Secure create options
 */
interface IThreeDSecureCreateOptions {
  client?: IBraintreeClient;
  authorization?: string;
  challengeDisplay?: "modal" | "inline-iframe";
  cardinalSDKConfig?: unknown;
}

// ============================================================================
// Local Payment Types
// ============================================================================

/**
 * Local Payment start options
 */
interface ILocalPaymentStartOptions {
  paymentType: string;
  amount?: string;
  fallback?: {
    url: string;
    buttonText?: string;
  };
  currencyCode?: string;
  shippingAddressRequired?: boolean;
  email?: string;
  phone?: string;
  givenName?: string;
  surname?: string;
  address?: {
    streetAddress?: string;
    extendedAddress?: string;
    locality?: string;
    postalCode?: string;
    region?: string;
    countryCode?: string;
  };
  paymentTypeCountryCode?: string;
  bic?: string;
  displayName?: string;
  windowOptions?: {
    width?: number;
    height?: number;
  };
  onPaymentStart?: (data: { paymentId: string }, start: () => void) => void;
  [key: string]: unknown;
}

/**
 * Local Payment tokenize payload
 */
interface ILocalPaymentTokenizePayload {
  nonce: string;
  type: string;
  details: {
    email?: string;
    payerId?: string;
    correlationId?: string;
    [key: string]: unknown;
  };
}

/**
 * Local Payment instance
 */
interface ILocalPaymentInstance {
  startPayment(
    options: ILocalPaymentStartOptions
  ): Promise<ILocalPaymentTokenizePayload | void>;
  hasTokenizationParams(): boolean;
  /** Set by `index.js` when `create` tokenizes on return with `redirectUrl` */
  tokenizePayload?: ILocalPaymentTokenizePayload;
  tokenize(
    params?: Record<string, unknown>
  ): Promise<ILocalPaymentTokenizePayload>;
  focusWindow(): void;
  closeWindow(): void;
  teardown(): Promise<void>;
}

// ============================================================================
// Apple Pay Types
// ============================================================================

/**
 * Apple Pay tokenize payload
 */
interface IApplePayTokenizePayload {
  nonce: string;
  type: string;
  description: string;
  details: {
    cardType: string;
    cardholderName?: string;
    dpanLastTwo: string;
    rawCardType: string;
    [key: string]: unknown;
  };
  binData: {
    commercial: string;
    countryOfIssuance: string;
    debit: string;
    durbinRegulated: string;
    healthcare: string;
    issuingBank: string;
    payroll: string;
    prepaid: string;
    productId: string;
  };
  consumed: boolean;
}

/**
 * Apple Pay instance
 */
interface IApplePayInstance {
  merchantIdentifier: string;
  createPaymentRequest(
    options: Partial<ApplePayJS.ApplePayPaymentRequest>
  ): ApplePayJS.ApplePayPaymentRequest;
  performValidation(options: {
    validationURL: string;
    displayName?: string;
  }): Promise<unknown>;
  tokenize(options: {
    token: ApplePayJS.ApplePayPaymentToken;
  }): Promise<IApplePayTokenizePayload>;
  applePayCapabilities(): Promise<ApplePayJS.PaymentCredentialStatusResponse>;
  teardown(): Promise<void>;
}

// ============================================================================
// Google Payment Types
// ============================================================================

interface IGooglePaymentCreateOptions {
  client?: IBraintreeClient;
  authorization?: string;
  googleMerchantId?: string;
  googlePayVersion?: number;
  useDeferredClient?: boolean;
}

interface IGooglePaymentTokenizePayload {
  nonce: string;
  type: string;
  description: string;
  details?: {
    cardType: string;
    lastFour: string;
    lastTwo: string;
    isNetworkTokenized: boolean;
    bin: string;
  };
  binData?: {
    commercial: string;
    countryOfIssuance: string;
    debit: string;
    durbinRegulated: string;
    healthcare: string;
    issuingBank: string;
    payroll: string;
    prepaid: string;
    productId: string;
    business: string;
    consumer: string;
    purchase: string;
    corporate: string;
  };
}

interface IGooglePaymentInstance {
  createPaymentDataRequest(
    overrides?: Record<string, unknown>
  ): Record<string, unknown>;
  parseResponse(
    response: Record<string, unknown>
  ): Promise<IGooglePaymentTokenizePayload>;
  teardown(): Promise<void>;
}

interface IGooglePaymentsClient {
  isReadyToPay(
    request: Record<string, unknown>
  ): Promise<{ result: boolean; paymentMethodPresent?: boolean }>;
  loadPaymentData(
    request: Record<string, unknown>
  ): Promise<Record<string, unknown>>;
  createButton(options: Record<string, unknown>): HTMLElement;
}

// ============================================================================
// Data Collector Types
// ============================================================================

/**
 * Data Collector instance
 */
interface IDataCollectorInstance {
  deviceData?: string;
  rawDeviceData?: Record<string, unknown>;
  getDeviceData(options?: {
    raw?: boolean;
  }): Promise<string | Record<string, unknown>>;
  teardown(): Promise<void>;
}

// ============================================================================
// American Express Types
// ============================================================================

/**
 * American Express rewards balance response
 */
interface IAmexRewardsBalancePayload {
  rewardsAmount?: string;
  rewardsUnit?: string;
  currencyAmount?: string;
  currencyIsoCode?: string;
  conversationId?: string;
  requestId?: string;
  error?: {
    code: string;
    message: string;
  } | null;
}

/**
 * American Express Express Checkout profile response
 */
interface IAmexExpressCheckoutProfilePayload {
  amexExpressCheckoutCards?: Array<{
    nonce: string;
    cardType: string;
    lastTwo: string;
    expirationMonth: string;
    expirationYear: string;
    bin: string;
    subscriberId?: string;
  }>;
}

/**
 * American Express instance
 */
interface IAmericanExpressInstance {
  getRewardsBalance(options: {
    nonce: string;
    [key: string]: unknown;
  }): Promise<IAmexRewardsBalancePayload>;
  getExpressCheckoutProfile(options: {
    nonce: string;
  }): Promise<IAmexExpressCheckoutProfilePayload>;
  teardown(): Promise<void>;
}

// ============================================================================
// Braintree Error Type
// ============================================================================

/**
 * Braintree error structure
 */
interface IBraintreeError extends Error {
  type: "CUSTOMER" | "MERCHANT" | "NETWORK" | "INTERNAL" | "UNKNOWN";
  code: string;
  message: string;
  details?: {
    originalError?: Error | unknown;
    httpStatus?: number;
    [key: string]: unknown;
  };
}

// ============================================================================
// PayPal SDK Types
// ============================================================================

/**
 * PayPal Buttons configuration
 */
interface IPayPalButtonsConfig {
  fundingSource?: string;
  style?: {
    layout?: "vertical" | "horizontal";
    color?: "gold" | "blue" | "silver" | "black" | "white";
    shape?: "rect" | "pill";
    label?: "paypal" | "checkout" | "buynow" | "pay" | "installment";
    height?: number;
    tagline?: boolean;
  };
  createOrder?: () => Promise<string>;
  createBillingAgreement?: () => Promise<string>;
  onApprove?: (data: {
    orderID?: string;
    payerID?: string;
    billingToken?: string;
    facilitatorAccessToken?: string;
  }) => Promise<void> | void;
  onCancel?: (data: unknown) => void;
  onError?: (err: Error) => void;
  onInit?: (
    data: unknown,
    actions: { disable: () => void; enable: () => void }
  ) => void;
  onClick?: (
    data: unknown,
    actions: { resolve: () => Promise<void>; reject: () => Promise<void> }
  ) => Promise<void> | void;
  onShippingAddressChange?: (data: unknown, actions: unknown) => Promise<void>;
  onShippingOptionsChange?: (data: unknown, actions: unknown) => Promise<void>;
  [key: string]: unknown;
}

/**
 * PayPal Buttons instance
 */
interface IPayPalButtons {
  render(container: string | HTMLElement): Promise<void>;
  close(): Promise<void>;
  isEligible(): boolean;
}

/**
 * PayPal FUNDING enum
 */
interface IPayPalFunding {
  PAYPAL: string;
  VENMO: string;
  CREDIT: string;
  CARD: string;
  PAYLATER: string;
  BANCONTACT: string;
  BLIK: string;
  EPS: string;
  GIROPAY: string;
  IDEAL: string;
  MERCADOPAGO: string;
  MYBANK: string;
  P24: string;
  SEPA: string;
  SOFORT: string;
  TRUSTLY: string;
  ZIMPLER: string;
}

/**
 * PayPal SDK
 */
interface IPayPalSDK {
  Buttons(config?: IPayPalButtonsConfig): IPayPalButtons;
  FUNDING: IPayPalFunding;
  version?: string;
  mock_triggerApproval: () => void;
  mock_triggerCancel: () => void;
  mock_triggerBillingAgreementApproval: () => void;
  mock_triggerBillingAgreementCancel: () => void;
}

// ============================================================================
// PayPal Checkout V6 Instance
// ============================================================================

/**
 * Pricing scheme for billing cycles
 */
interface IPricingScheme {
  pricingModel: string;
  price: string;
  reloadThresholdAmount?: string;
}

/**
 * Billing cycle configuration for billing agreements
 */
interface IBillingCycle {
  billingFrequency: string;
  billingFrequencyUnit: string;
  numberOfExecutions: string;
  sequence: string;
  startDate: string;
  trial: boolean;
  pricingScheme: IPricingScheme;
}

/**
 * Plan metadata for billing agreements
 */
interface IBillingAgreementPlanMetadata {
  billingCycles?: IBillingCycle[];
  currencyIsoCode: string;
  name: string;
  productDescription: string;
  productQuantity?: string;
  oneTimeFeeAmount?: string;
  shippingAmount?: string;
  productPrice?: string;
  taxAmount?: string;
  totalAmount?: string;
}

/**
 * Configuration for billing agreement plan stories
 */
interface IBillingAgreementPlanConfig {
  billingAgreementDescription: string;
  planType: string;
  amount?: string;
  currency?: string;
  planMetadata?: IBillingAgreementPlanMetadata;
}

/**
 * PayPal V6 Approve Data from onApprove callback
 */
interface IPayPalV6ApproveData {
  payerID?: string;
  payerId?: string;
  PayerID?: string;
  orderID?: string;
  orderId?: string;
  OrderID?: string;
  billingToken?: string;
}

/**
 * PayPal V6 Shipping Address Change Data from onShippingAddressChange callback
 */
interface IPayPalV6ShippingAddressChangeData {
  errors: Record<string, string>;
  orderId: string;
  shippingAddress: {
    city?: string;
    countryCode?: string;
    postalCode?: string;
    state?: string;
  };
}

/**
 * PayPal V6 Shipping Options Change Data from onShippingOptionsChange callback
 */
interface IPayPalV6ShippingOptionsChangeData {
  errors: Record<string, string>;
  orderId: string;
  selectedShippingOption: {
    amount: {
      currencyCode: string;
      value: string;
    };
    id: string;
    label: string;
    selected: boolean;
    type: string;
  };
}

/**
 * PayPal Checkout V6 Session returned by createOneTimePaymentSession and createBillingAgreementSession
 */
interface IPayPalCheckoutV6Session {
  start: (options?: {
    presentationMode?:
      | "auto"
      | "popup"
      | "modal"
      | "redirect"
      | "payment-handler"
      | "direct-app-switch";
    autoRedirect?: { enabled: boolean };
    fullPageOverlay?: { enabled: boolean };
  }) => Promise<{ redirectURL?: string } | undefined | false>;
  hasReturned?: () => boolean;
  resume: () => Promise<void>;
}

/**
 * PayPal Checkout V6 Tokenize Payload
 */
interface IPayPalCheckoutV6TokenizePayload {
  nonce: string;
  type: string;
  details: {
    email?: string;
    payerEmail?: string;
    payerId?: string;
    firstName?: string;
    lastName?: string;
  };
  shippingOptionId?: string;
  /** Persistent payment method token, present when the tokenized payment method was implicitly vaulted. */
  implicitlyVaultedPaymentMethodToken?: string;
}

/**
 * PayPal Checkout V6 Instance
 */
interface IPayPalCheckoutV6Instance {
  loadPayPalSDK: (options?: { env?: string }) => Promise<unknown>;
  getClientId: () => Promise<string>;
  createPayment: (options: {
    flow: string;
    amount?: string;
    currency?: string;
    intent?: string;
  }) => Promise<string>;
  createOneTimePaymentSession: (options: {
    amount: string;
    currency: string;
    intent?: "capture" | "authorize" | "order";
    commit?: boolean;
    returnUrl?: string;
    cancelUrl?: string;
    lineItems?: Array<{
      quantity: string;
      unitAmount: string;
      name: string;
      kind: "debit" | "credit";
      unitTaxAmount?: string;
      description?: string;
    }>;
    shippingOptions?: Array<{
      id: string;
      label: string;
      selected: boolean;
      type: "SHIPPING" | "PICKUP";
      amount: { currency: string; value: string };
    }>;
    amountBreakdown?: {
      itemTotal?: string;
      shipping?: string;
      handling?: string;
      taxTotal?: string;
      insurance?: string;
      shippingDiscount?: string;
      discount?: string;
    };
    offerCredit?: boolean;
    displayName?: string;
    locale?: string;
    landingPageType?: string;
    userAction?: string;
    enableShippingAddress?: boolean;
    shippingAddressEditable?: boolean;
    riskCorrelationId?: string;
    userAuthenticationEmail?: string;
    presentationMode?: string;
    autoRedirect?: { enabled: boolean };
    fullPageOverlay?: { enabled: boolean };
    shippingCallbackUrl?: string;
    contactPreference?:
      | "NO_CONTACT_INFO"
      | "RETAIN_CONTACT_INFO"
      | "UPDATE_CONTACT_INFO";
    shippingAddressOverride?: {
      recipientName?: string;
      recipientEmail?: string;
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      countryCode?: string;
      phone?: string;
    };
    onShippingAddressChange?: (
      data: IPayPalV6ShippingAddressChangeData
    ) => void | Promise<unknown>;
    onShippingOptionsChange?: (
      data: IPayPalV6ShippingOptionsChangeData
    ) => void | Promise<unknown>;
    onApprove: (data: IPayPalV6ApproveData) => void | Promise<void>;
    onCancel?: () => void;
    onError?: (err: IBraintreeError) => void;
  }) => IPayPalCheckoutV6Session;
  createPayLaterSession: (options: {
    amount: string;
    currency: string;
    intent?: "capture" | "authorize" | "order";
    returnUrl?: string;
    cancelUrl?: string;
    lineItems?: Array<{
      quantity: string;
      unitAmount: string;
      name: string;
      kind: "debit" | "credit";
      unitTaxAmount?: string;
      description?: string;
    }>;
    shippingOptions?: Array<{
      id: string;
      label: string;
      selected: boolean;
      type: "SHIPPING" | "PICKUP";
      amount: { currency: string; value: string };
    }>;
    amountBreakdown?: {
      itemTotal?: string;
      shipping?: string;
      handling?: string;
      taxTotal?: string;
      insurance?: string;
      shippingDiscount?: string;
      discount?: string;
    };
    displayName?: string;
    locale?: string;
    landingPageType?: string;
    userAction?: string;
    enableShippingAddress?: boolean;
    shippingAddressEditable?: boolean;
    riskCorrelationId?: string;
    userAuthenticationEmail?: string;
    presentationMode?: string;
    autoRedirect?: { enabled: boolean };
    fullPageOverlay?: { enabled: boolean };
    shippingCallbackUrl?: string;
    contactPreference?:
      | "NO_CONTACT_INFO"
      | "RETAIN_CONTACT_INFO"
      | "UPDATE_CONTACT_INFO";
    shippingAddressOverride?: {
      recipientName?: string;
      recipientEmail?: string;
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      countryCode?: string;
      phone?: string;
    };
    onShippingAddressChange?: (
      data: IPayPalV6ShippingAddressChangeData
    ) => void | Promise<unknown>;
    onShippingOptionsChange?: (
      data: IPayPalV6ShippingOptionsChangeData
    ) => void | Promise<unknown>;
    onApprove: (data: IPayPalV6ApproveData) => void | Promise<void>;
    onCancel?: () => void;
    onComplete?: () => void;
    onError?: (err: IBraintreeError) => void;
  }) => IPayPalCheckoutV6Session;
  createBillingAgreementSession: (options: {
    billingAgreementDescription?: string;
    planType?: "RECURRING" | "SUBSCRIPTION" | "UNSCHEDULED" | "INSTALLMENTS";
    planMetadata?: IBillingAgreementPlanMetadata;
    amount?: string;
    currency?: string;
    locale?: string;
    landingPageType?: "login" | "billing";
    enableShippingAddress?: boolean;
    shippingAddressEditable?: boolean;
    offerCredit?: boolean;
    shippingAddressOverride?: {
      recipientName?: string;
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      countryCode?: string;
    };
    userAction?: "CONTINUE" | "COMMIT" | "SETUP_NOW";
    displayName?: string;
    riskCorrelationId?: string;
    presentationMode?: string;
    autoRedirect?: { enabled: boolean };
    fullPageOverlay?: { enabled: boolean };
    onApprove: (data: IPayPalV6ApproveData) => void | Promise<void>;
    onCancel?: () => void;
    onError?: (err: IBraintreeError) => void;
  }) => IPayPalCheckoutV6Session;
  createCheckoutWithVaultSession: (options: {
    amount: string;
    currency: string;
    intent?: "capture" | "authorize" | "order";
    commit?: boolean;
    billingAgreementDetails?: {
      description: string;
    };
    returnUrl?: string;
    cancelUrl?: string;
    lineItems?: Array<{
      quantity: string;
      unitAmount: string;
      name: string;
      kind: "debit" | "credit";
      unitTaxAmount?: string;
      description?: string;
    }>;
    shippingOptions?: Array<{
      id: string;
      label: string;
      selected: boolean;
      type: "SHIPPING" | "PICKUP";
      amount: { currency: string; value: string };
    }>;
    amountBreakdown?: {
      itemTotal?: string;
      shipping?: string;
      handling?: string;
      taxTotal?: string;
      insurance?: string;
      shippingDiscount?: string;
      discount?: string;
    };
    displayName?: string;
    locale?: string;
    landingPageType?: string;
    userAction?: string;
    enableShippingAddress?: boolean;
    shippingAddressEditable?: boolean;
    riskCorrelationId?: string;
    userAuthenticationEmail?: string;
    presentationMode?: string;
    autoRedirect?: { enabled: boolean };
    fullPageOverlay?: { enabled: boolean };
    shippingCallbackUrl?: string;
    planType?: "RECURRING" | "SUBSCRIPTION" | "UNSCHEDULED" | "INSTALLMENTS";
    planMetadata?: IBillingAgreementPlanMetadata;
    contactPreference?:
      | "NO_CONTACT_INFO"
      | "RETAIN_CONTACT_INFO"
      | "UPDATE_CONTACT_INFO";
    shippingAddressOverride?: {
      recipientName?: string;
      recipientEmail?: string;
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      countryCode?: string;
      phone?: string;
    };
    onShippingAddressChange?: (
      data: IPayPalV6ShippingAddressChangeData
    ) => void | Promise<unknown>;
    onShippingOptionsChange?: (
      data: IPayPalV6ShippingOptionsChangeData
    ) => void | Promise<unknown>;
    onApprove: (data: IPayPalV6ApproveData) => void | Promise<void>;
    onCancel?: () => void;
    onError?: (err: IBraintreeError) => void;
  }) => IPayPalCheckoutV6Session;
  tokenizePayment: (data: {
    billingToken?: string;
    payerID?: string;
    payerId?: string;
    orderID?: string;
    orderId?: string;
    vault?: boolean;
  }) => Promise<IPayPalCheckoutV6TokenizePayload>;
  updatePayment: (options: {
    paymentId: string;
    amount: string;
    currency: string;
    lineItems?: Array<{
      quantity: string;
      unitAmount: string;
      name: string;
      kind: string;
    }>;
    shippingOptions?: Array<{
      id: string;
      label: string;
      selected: boolean;
      type: string;
      amount: {
        currency: string;
        value: string;
      };
    }>;
    amountBreakdown?: {
      itemTotal?: string;
      shipping?: string;
      handling?: string;
      taxTotal?: string;
      insurance?: string;
      shippingDiscount?: string;
      discount?: string;
    };
  }) => Promise<unknown>;
  findEligibleMethods: (options: {
    currency: string;
    amount?: string;
    countryCode?: string;
    paymentFlow?:
      | "ONE_TIME_PAYMENT"
      | "VAULT_WITH_PAYMENT"
      | "VAULT_WITHOUT_PAYMENT"
      | "RECURRING_PAYMENT";
  }) => Promise<{
    paypal: boolean;
    paylater: boolean;
    credit: boolean;
    getDetails: (method: "paypal" | "paylater" | "credit") => {
      productCode?: string;
      countryCode?: string;
      canBeVaulted?: boolean;
    } | null;
  }>;
  createMessages: (options?: {
    buyerCountry?: string;
    currencyCode?: string;
  }) => Promise<{
    fetchContent: (options: unknown) => Promise<unknown>;
    [key: string]: unknown;
  }>;
  startVaultInitiatedCheckout: (options: {
    vaultInitiatedCheckoutPaymentMethodToken: string;
    amount: string;
    currency: string;
    intent?: "capture" | "authorize" | "order";
    lineItems?: Array<{
      quantity: string;
      unitAmount: string;
      name: string;
      kind: "debit" | "credit";
      unitTaxAmount?: string;
      description?: string;
    }>;
    shippingOptions?: Array<{
      id: string;
      label: string;
      selected: boolean;
      type: "SHIPPING" | "PICKUP";
      amount: { currency: string; value: string };
    }>;
    amountBreakdown?: {
      itemTotal?: string;
      shipping?: string;
      handling?: string;
      taxTotal?: string;
      insurance?: string;
      shippingDiscount?: string;
      discount?: string;
    };
    shippingAddressOverride?: {
      recipientName?: string;
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      countryCode?: string;
      phone?: string;
    };
    billingAgreementDetails?: {
      description?: string;
    };
    contactPreference?:
      | "NO_CONTACT_INFO"
      | "RETAIN_CONTACT_INFO"
      | "UPDATE_CONTACT_INFO";
    optOutOfModalBackdrop?: boolean;
  }) => Promise<IPayPalCheckoutV6TokenizePayload>;
  createEditSavedPaymentSession: (options: {
    amount: string;
    currency: string;
    intent?: "authorize" | "capture" | "order";
    commit?: boolean;
    presentationMode?: "auto" | "popup" | "modal";
    onApprove: (data: IPayPalV6ApproveData) => void | Promise<void>;
    onCancel?: (data?: unknown) => void;
    onComplete?: (data?: unknown) => void;
    onError?: (err: IBraintreeError) => void;
  }) => IPayPalCheckoutV6Session;
  closeVaultInitiatedCheckoutWindow: () => Promise<void>;
  focusVaultInitiatedCheckoutWindow: () => Promise<void>;
  teardown: () => Promise<void>;
}

/** Options accepted by {@link IPayPalCheckoutV6Instance.createOneTimePaymentSession} */
type IPayPalCheckoutV6OneTimePaymentOptions = Parameters<
  IPayPalCheckoutV6Instance["createOneTimePaymentSession"]
>[0];

/** Options accepted by {@link IPayPalCheckoutV6Instance.createPayLaterSession} */
type IPayPalCheckoutV6PayLaterOptions = Parameters<
  IPayPalCheckoutV6Instance["createPayLaterSession"]
>[0];

/** Options accepted by {@link IPayPalCheckoutV6Instance.createCheckoutWithVaultSession} */
type IPayPalCheckoutV6CheckoutWithVaultOptions = Parameters<
  IPayPalCheckoutV6Instance["createCheckoutWithVaultSession"]
>[0];

// ============================================================================
// Global Window Extension
// ============================================================================

declare global {
  interface Window {
    braintree?: {
      client: {
        create(options: { authorization: string }): Promise<IBraintreeClient>;
        VERSION?: string;
      };
      hostedFields: {
        create(
          options: IHostedFieldsCreateOptions
        ): Promise<IHostedFieldsInstance>;
        VERSION?: string;
      };
      venmo: {
        create(options: IVenmoCreateOptions): Promise<IVenmoInstance>;
        isBrowserSupported(options?: Partial<IVenmoCreateOptions>): boolean;
        VERSION?: string;
      };
      vaultManager: {
        create(options: {
          client?: IBraintreeClient;
          authorization?: string;
        }): Promise<IVaultManagerInstance>;
        VERSION?: string;
      };
      paypalCheckout: {
        create(options: {
          client?: IBraintreeClient;
          authorization?: string;
        }): Promise<IPayPalCheckoutInstance>;
        VERSION?: string;
      };
      paypalCheckoutV6: {
        create(options: {
          client: IBraintreeClient;
        }): Promise<IPayPalCheckoutV6Instance>;
        VERSION?: string;
      };
      threeDSecure: {
        create(
          options: IThreeDSecureCreateOptions
        ): Promise<IThreeDSecureInstance>;
        VERSION?: string;
      };
      localPayment: {
        create(options: {
          client?: IBraintreeClient;
          authorization?: string;
          merchantAccountId?: string;
          redirectUrl?: string;
          debug?: boolean;
        }): Promise<ILocalPaymentInstance>;
        VERSION?: string;
      };
      applePay: {
        create(options: {
          client?: IBraintreeClient;
          authorization?: string;
        }): Promise<IApplePayInstance>;
        VERSION?: string;
      };
      googlePayment: {
        create(
          options: IGooglePaymentCreateOptions
        ): Promise<IGooglePaymentInstance>;
        VERSION?: string;
      };
      americanExpress: {
        create(options: {
          client?: IBraintreeClient;
          authorization?: string;
        }): Promise<IAmericanExpressInstance>;
        VERSION?: string;
      };
      dataCollector: {
        create(options: {
          client?: IBraintreeClient;
          authorization?: string;
          riskCorrelationId?: string;
          useDeferredClient?: boolean;
          cb1?: string;
          beacon?: boolean;
        }): Promise<IDataCollectorInstance>;
        VERSION?: string;
      };
      VERSION?: string;
    };
    paypal?: IPayPalSDK;
    google?: {
      payments: {
        api: {
          PaymentsClient: new (config: {
            environment: string;
            paymentDataCallbacks?: Record<string, unknown>;
          }) => IGooglePaymentsClient;
        };
      };
    };
    ApplePaySession?: typeof ApplePaySession;
    hostedFieldsInstance?: IHostedFieldsInstance;
    threeDSecureInstance?: IThreeDSecureInstance;
    __venmoInstance?: IVenmoInstance;
    __testClient?: IBraintreeClient;
    /**
     * Test-only: `localPayment.create` instance for Playwright API tests
     * under `.storybook/tests/local-payment/`. Set in Local Payment stories
     * (not merchant API).
     */
    __btLocalPayment?: ILocalPaymentInstance;
    /**
     * Test-only: `paypalCheckout.create` instance for Playwright API tests
     * under `.storybook/tests/paypal-checkout/`. Set in PayPal legacy stories
     * (not merchant API).
     */
    __btPayPalCheckout?: IPayPalCheckoutInstance;
  }

  // Global braintree reference (for convenience)
  const braintree: NonNullable<Window["braintree"]>;
  const paypal: NonNullable<Window["paypal"]>;
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

export {
  HostedFieldCard,
  IBraintreeClient,
  IBraintreeConfiguration,
  IBraintreeError,
  IHostedFieldsInstance,
  IHostedFieldsCreateOptions,
  IHostedFieldsState,
  IHostedFieldsTokenizePayload,
  IHostedFieldsEventData,
  IHostedFieldConfig,
  IHostedFieldState,
  IVenmoInstance,
  IVenmoCreateOptions,
  IVenmoTokenizePayload,
  IVaultManagerInstance,
  IPaymentMethod,
  IPayPalCheckoutInstance,
  IPayPalCheckoutCreatePaymentOptions,
  IPayPalCheckoutUpdatePaymentOptions,
  IPayPalCheckoutTokenizePayload,
  IThreeDSecureInstance,
  IThreeDSecureCreateOptions,
  IThreeDSecureVerifyOptions,
  IThreeDSecureVerifyPayload,
  ILocalPaymentInstance,
  ILocalPaymentStartOptions,
  ILocalPaymentTokenizePayload,
  IApplePayInstance,
  IApplePayTokenizePayload,
  IDataCollectorInstance,
  IAmericanExpressInstance,
  IAmexRewardsBalancePayload,
  IAmexExpressCheckoutProfilePayload,
  IGooglePaymentCreateOptions,
  IGooglePaymentInstance,
  IGooglePaymentTokenizePayload,
  IGooglePaymentsClient,
  IPayPalSDK,
  IPayPalButtons,
  IPayPalButtonsConfig,
  IPayPalFunding,
  IPayPalCheckoutV6Instance,
  IPayPalCheckoutV6Session,
  IPayPalCheckoutV6TokenizePayload,
  IPayPalV6ApproveData,
  IPayPalV6ShippingAddressChangeData,
  IPayPalV6ShippingOptionsChangeData,
  IPricingScheme,
  IBillingCycle,
  IBillingAgreementPlanMetadata,
  IBillingAgreementPlanConfig,
  IPayPalCheckoutV6OneTimePaymentOptions,
  IPayPalCheckoutV6PayLaterOptions,
  IPayPalCheckoutV6CheckoutWithVaultOptions,
};
