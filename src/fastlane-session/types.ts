import type {
  HostedFieldsBillingAddress,
  HostedFieldsField,
  HostedFieldsTokenizePayload,
} from "../hosted-fields/types";
import type {
  ModuleCreateOptions,
  RiskCorrelationOptions,
  TokenizationComponent,
} from "../lib/types";

export type FastlaneSessionCreateOptions = ModuleCreateOptions &
  RiskCorrelationOptions & {
    target?: unknown;
    locale?: string;
  };

export type FastlaneSessionLookupOptions = {
  type: "email";
  value: string;
};

export type FastlaneSessionLookupResult = {
  recognized: boolean;
};

export type FastlaneSessionAuthenticationState =
  | "succeeded"
  | "failed"
  | "canceled";

export type FastlaneShippingAddress = {
  company?: string;
  countryCode?: string;
  countryCodeAlpha2?: string;
  countryCodeAlpha3?: string;
  countryName?: string;
  extendedAddress?: string;
  firstName?: string;
  lastName?: string;
  locality?: string;
  phoneNumber?: string;
  postalCode?: string;
  recipientName?: string;
  region?: string;
  streetAddress?: string;
};

export type FastlaneName = {
  firstName?: string;
  fullName?: string;
  lastName?: string;
};

export type FastlanePhone = {
  countryCode?: string;
  nationalNumber?: string;
  number?: string;
  type?: string;
};

export type FastlaneCard = Pick<
  HostedFieldsTokenizePayload,
  "nonce" | "type" | "description" | "details"
> & {
  billingAddress?: HostedFieldsBillingAddress;
};

export type FastlaneProfileData = {
  shippingAddress?: FastlaneShippingAddress;
  card?: FastlaneCard;
  name?: FastlaneName;
  phones?: FastlanePhone[];
};

export type FastlaneSessionAuthenticationResult = {
  authenticationState: FastlaneSessionAuthenticationState;
  profileData?: FastlaneProfileData;
};

export type FastlaneSessionCardSelectorResult = {
  selectionChanged: boolean;
  selectedCard: FastlaneCard | null;
};

export type FastlaneSessionShippingAddressSelectorResult = {
  selectionChanged: boolean;
  selectedAddress: FastlaneShippingAddress | null;
};

export type FastlaneSessionTokenizeOptions = {
  authenticationInsight?: {
    merchantAccountId: string;
  };
  billingAddress?: HostedFieldsBillingAddress;
  cardholderName?: string;
  fieldsToTokenize?: HostedFieldsField[];
  vault?: boolean;
};

export type FastlaneSessionTokenizeSource = "fastlane" | "target";

export type FastlaneSessionTokenizeResult = HostedFieldsTokenizePayload & {
  source: FastlaneSessionTokenizeSource;
};

export type FastlaneSession = TokenizationComponent<
  FastlaneSessionTokenizeOptions,
  FastlaneSessionTokenizeResult
> & {
  lookupCustomer(
    options: FastlaneSessionLookupOptions
  ): Promise<FastlaneSessionLookupResult>;
  authenticateCustomer(): Promise<FastlaneSessionAuthenticationResult>;
  showShippingAddressSelector(): Promise<FastlaneSessionShippingAddressSelectorResult>;
  showCardSelector(): Promise<FastlaneSessionCardSelectorResult>;
  setLocale(locale: string): Promise<void>;
};
