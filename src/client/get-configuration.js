import request from "./request";
import uuid from "@braintree/uuid";
import constants from "../lib/constants";
import { assign } from "../lib/assign";
import { GRAPHQL_URLS } from "../lib/constants";
import { classifyRequestError } from "./request/request-error";
import { buildClientSdkMetadata } from "./request/graphql/client-sdk-metadata";
import clientConstants from "./constants";
const BRAINTREE_VERSION = clientConstants.BRAINTREE_VERSION;
const CONFIGURATION_QUERY = clientConstants.CONFIGURATION_QUERY;
const CONFIGURATION_OPERATION_NAME =
  clientConstants.CONFIGURATION_OPERATION_NAME;

// A client token that carries its own graphQL.url uses it (supports
// merchant-specific/proxy endpoints); everything else resolves to the
// environment's default GraphQL endpoint.
function getGraphQLUrl(authData) {
  if (authData.attrs.authorizationFingerprint && authData.graphQL) {
    return authData.graphQL.url;
  }

  return GRAPHQL_URLS[authData.environment];
}

function buildGraphQLRequestOptions(authData, analyticsMetadata, graphQLUrl) {
  const { attrs } = authData;
  const authorization = attrs.authorizationFingerprint || attrs.tokenizationKey;

  return {
    url: graphQLUrl,
    method: "POST",
    headers: {
      Authorization: `Bearer ${authorization}`,
      "Braintree-Version": BRAINTREE_VERSION,
    },
    data: buildGraphQLBody(analyticsMetadata),
  };
}

function buildGraphQLBody(analyticsMetadata) {
  return {
    query: CONFIGURATION_QUERY,
    operationName: CONFIGURATION_OPERATION_NAME,
    clientSdkMetadata: buildClientSdkMetadata(analyticsMetadata),
  };
}

function adaptGraphQLConfigurationResponse(responseBody, graphQLUrl) {
  const configuration = responseBody?.data?.clientConfiguration;

  if (!configuration) {
    return null;
  }

  return assign({}, configuration, {
    environment: configuration.environment.toLowerCase(),
    graphQL: {
      url: graphQLUrl,
    },
  });
}

function getConfiguration(authData, inputSessionId) {
  const { attrs } = authData;
  const graphQLUrl = getGraphQLUrl(authData);
  const sessionId = inputSessionId || uuid();
  const analyticsMetadata = {
    merchantAppId: window.location.host,
    platform: constants.PLATFORM,
    sdkVersion: constants.VERSION,
    source: constants.SOURCE,
    integration: constants.INTEGRATION,
    sessionId,
  };

  const reqOptions = buildGraphQLRequestOptions(
    authData,
    analyticsMetadata,
    graphQLUrl
  );

  return new Promise((resolve, reject) => {
    request(reqOptions, (err, response, status) => {
      const requestError = classifyRequestError(status, err, response);

      if (requestError) {
        reject(requestError);

        return;
      }

      resolve({
        authorizationType: attrs.tokenizationKey
          ? "TOKENIZATION_KEY"
          : "CLIENT_TOKEN",
        authorizationFingerprint: attrs.authorizationFingerprint,
        paymentMethodIdJwt: authData.paymentMethodIdJwt,
        analyticsMetadata,
        gatewayConfiguration: adaptGraphQLConfigurationResponse(
          response,
          graphQLUrl
        ),
      });
    });
  });
}

export { getConfiguration };

export default {
  getConfiguration,
};
