export function getAuthorizationToken(): string {
  return "sandbox_mock_mocktoken";
}

interface ClientTokenOptions {
  publicKey?: string;
  privateKey?: string;
  customerId?: string;
  preferredPaymentMethodToken?: string;
}

interface IClientTokenResponse {
  data?: {
    createClientToken: {
      clientToken: string;
    };
  };
  errors?: Array<{ message: string }>;
}

// Cache for client tokens (30 min TTL)
const tokenCache = {
  token: null as string | null,
  timestamp: 0,
  ttlMs: 30 * 60 * 1000,
};

const SANDBOX_GRAPHQL_URL =
  "https://payments.sandbox.braintree-api.com/graphql";

function getStaticToken(): string | null {
  return btoa(
    JSON.stringify({
      environment: "SANDBOX",
      authorizationFingerprint: "MOCK_FINGERPRINT",
      graphQL: { url: SANDBOX_GRAPHQL_URL },
    })
  );
}

function getCachedToken(isUsingDefaults: boolean): string | null {
  if (!isUsingDefaults) {
    return null;
  }
  const now = Date.now();
  if (tokenCache.token && now - tokenCache.timestamp < tokenCache.ttlMs) {
    return tokenCache.token;
  }
  return null;
}

function updateCache(token: string, timestamp: number): void {
  tokenCache.token = token;
  tokenCache.timestamp = timestamp;
}

async function fetchClientToken(
  publicKey: string,
  privateKey: string,
  customerId: string | undefined,
  preferredPaymentMethodToken?: string
): Promise<string> {
  const gqlAuthorization = window.btoa(`${publicKey}:${privateKey}`);

  const variables: {
    input: {
      clientToken: {
        customerId?: string;
        paymentMethodId?: string;
      };
    };
  } = {
    input: { clientToken: {} },
  };
  if (customerId) {
    variables.input.clientToken.customerId = customerId;
  }
  if (preferredPaymentMethodToken) {
    // GraphQL's ClientTokenInput calls this field `paymentMethodId`, not `preferredPaymentMethodToken`
    variables.input.clientToken.paymentMethodId = preferredPaymentMethodToken;
  }

  const response = await fetch(
    "https://payments.sandbox.braintree-api.com/graphql",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${gqlAuthorization}`,
        "Braintree-version": "2023-07-03",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query:
          "mutation CreateClientToken($input: CreateClientTokenInput!) { createClientToken(input: $input) { clientToken } }",
        variables,
      }),
    }
  );

  const clientTokenResponse: IClientTokenResponse = await response.json();
  const clientToken = clientTokenResponse?.data?.createClientToken?.clientToken;

  if (!clientToken) {
    const graphQLErrorMessage = clientTokenResponse?.errors
      ?.map((graphQLError) => graphQLError.message)
      .join("; ");

    throw new Error(
      graphQLErrorMessage
        ? `Invalid response: ${graphQLErrorMessage}`
        : "Invalid response: missing clientToken"
    );
  }

  return clientToken;
}

interface IVaultPaymentMethodResponse {
  data?: {
    vaultPaymentMethod: {
      paymentMethod: {
        legacyId: string;
      };
    };
  };
  errors?: Array<{ message: string }>;
}

/**
 * Vaults a single-use payment method nonce (e.g. from tokenizePayment) into a
 * persistent, reusable payment method, returning its legacy (REST-style) token.
 * A client token's `preferredPaymentMethodToken` must reference an already
 * vaulted payment method, not a single-use nonce.
 */
export async function vaultPaymentMethod(
  nonce: string,
  options: { publicKey?: string; privateKey?: string; customerId?: string } = {}
): Promise<string> {
  const publicKey =
    options.publicKey || import.meta.env.STORYBOOK_BRAINTREE_PUBLIC_KEY;
  const privateKey =
    options.privateKey || import.meta.env.STORYBOOK_BRAINTREE_PRIVATE_KEY;
  const customerId =
    options.customerId || import.meta.env.STORYBOOK_BRAINTREE_CUSTOMER_ID;

  if (!publicKey || !privateKey) {
    throw new Error("Client token credentials not configured");
  }

  const gqlAuthorization = window.btoa(`${publicKey}:${privateKey}`);

  const variables: {
    input: { paymentMethodId: string; customerId?: string };
  } = {
    input: { paymentMethodId: nonce },
  };
  if (customerId) {
    variables.input.customerId = customerId;
  }

  const response = await fetch(
    "https://payments.sandbox.braintree-api.com/graphql",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${gqlAuthorization}`,
        "Braintree-version": "2023-07-03",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query:
          "mutation VaultPaymentMethod($input: VaultPaymentMethodInput!) { vaultPaymentMethod(input: $input) { paymentMethod { legacyId } } }",
        variables,
      }),
    }
  );

  const vaultResponse: IVaultPaymentMethodResponse = await response.json();
  const legacyId =
    vaultResponse?.data?.vaultPaymentMethod?.paymentMethod?.legacyId;

  if (!legacyId) {
    const graphQLErrorMessage = vaultResponse?.errors
      ?.map((graphQLError) => graphQLError.message)
      .join("; ");

    throw new Error(
      graphQLErrorMessage
        ? `Invalid response: ${graphQLErrorMessage}`
        : "Invalid response: missing vaulted payment method"
    );
  }

  return legacyId;
}

export async function getClientToken(
  options: ClientTokenOptions = {}
): Promise<string> {
  const publicKey =
    options.publicKey || import.meta.env.STORYBOOK_BRAINTREE_PUBLIC_KEY;
  const privateKey =
    options.privateKey || import.meta.env.STORYBOOK_BRAINTREE_PRIVATE_KEY;
  const customerId =
    options.customerId || import.meta.env.STORYBOOK_BRAINTREE_CUSTOMER_ID;
  const preferredPaymentMethodToken =
    options.preferredPaymentMethodToken ||
    import.meta.env.STORYBOOK_BRAINTREE_PREFERRED_PAYMENT_METHOD_TOKEN;

  // Fall back to static token if credentials not configured
  if (!publicKey || !privateKey) {
    const staticToken = getStaticToken();
    if (staticToken) {
      return staticToken;
    }
    throw new Error("Client token credentials not configured");
  }

  const isUsingDefaults =
    !options.publicKey &&
    !options.privateKey &&
    !options.customerId &&
    !options.preferredPaymentMethodToken;

  // Check cache
  const cachedToken = getCachedToken(isUsingDefaults);
  if (cachedToken) {
    return cachedToken;
  }

  const now = Date.now();

  try {
    const clientToken = await fetchClientToken(
      publicKey,
      privateKey,
      customerId,
      preferredPaymentMethodToken
    );

    // Update cache for default credentials
    if (isUsingDefaults) {
      updateCache(clientToken, now);
    }

    return clientToken;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Client Token error:", error);

    // Fall back to static token
    const staticToken = getStaticToken();
    if (staticToken) {
      // eslint-disable-next-line no-console
      console.warn("Falling back to static client token");
      return staticToken;
    }
    throw error;
  }
}

export function clearClientTokenCache(): void {
  tokenCache.token = null;
  tokenCache.timestamp = 0;
}
