export function getAuthorizationToken(): string {
  return import.meta.env.STORYBOOK_BRAINTREE_TOKENIZATION_KEY;
}

interface ClientTokenOptions {
  publicKey?: string;
  privateKey?: string;
  customerId?: string;
}

interface IClientTokenResponse {
  data: {
    createClientToken: {
      clientToken: string;
    };
  };
}

// Cache for client tokens (30 min TTL)
const tokenCache = {
  token: null as string | null,
  timestamp: 0,
  ttlMs: 30 * 60 * 1000,
};

function getStaticToken(): string | null {
  return import.meta.env.STORYBOOK_BRAINTREE_CLIENT_TOKEN || null;
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
  customerId: string | undefined
): Promise<string> {
  const gqlAuthorization = window.btoa(`${publicKey}:${privateKey}`);

  const variables: { input: { clientToken: { customerId?: string } } } = {
    input: { clientToken: {} },
  };
  if (customerId) {
    variables.input.clientToken.customerId = customerId;
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
    throw new Error("Invalid response: missing clientToken");
  }

  return clientToken;
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

  // Fall back to static token if credentials not configured
  if (!publicKey || !privateKey) {
    const staticToken = getStaticToken();
    if (staticToken) {
      return staticToken;
    }
    throw new Error("Client token credentials not configured");
  }

  const isUsingDefaults =
    !options.publicKey && !options.privateKey && !options.customerId;

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
      customerId
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
