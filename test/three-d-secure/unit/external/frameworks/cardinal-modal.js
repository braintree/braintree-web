vi.mock("../../../../../src/lib/assets");

import CardinalModalFramework from "../../../../../src/three-d-secure/external/frameworks/cardinal-modal";
import SongbirdFramework from "../../../../../src/three-d-secure/external/frameworks/songbird";
import { fake } from "../../../../helpers";

describe("CardinalModalFramework", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};

    testContext.configuration = {
      authorization: fake.clientToken,
      authorizationFingerprint: "encoded_auth_fingerprint",
      gatewayConfiguration: {
        assetsUrl: "http://example.com/assets",
        creditCard: {
          threeDSecure: {
            cardinalAuthenticationJWT: "jwt",
            cardinalSongbirdUrl:
              "https://songbirdstag.cardinalcommerce.com/edge/v1/songbird.js",
          },
        },
      },
    };
    testContext.client = {
      request: vi.fn().mockResolvedValue({}),
      getConfiguration: () => testContext.configuration,
    };
  });

  it("inherits from SongbirdFramework", () => {
    const framework = new CardinalModalFramework({
      createPromise: Promise.resolve(testContext.client),
      client: testContext.client,
    });

    expect(framework).toBeInstanceOf(SongbirdFramework);
  });
});
