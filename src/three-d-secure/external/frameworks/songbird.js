"use strict";

var BaseFramework = require("./base");
var assign = require("../../../lib/assign").assign;
var deferred = require("../../../lib/deferred");
var BraintreeError = require("../../../lib/braintree-error");
var convertToBraintreeError = require("../../../lib/convert-to-braintree-error");
var analytics = require("../../../lib/analytics");
var assets = require("../../../lib/assets");
var errors = require("../../shared/errors");
var enumerate = require("../../../lib/enumerate");
var constants = require("../../shared/constants");
var ExtendedPromise = require("@braintree/extended-promise");

var INTEGRATION_TIMEOUT_MS =
  require("../../../lib/constants").INTEGRATION_TIMEOUT_MS;
var PLATFORM = require("../../../lib/constants").PLATFORM;
var VERSION = process.env.npm_package_version;
var CUSTOMER_CANCELED_SONGBIRD_MODAL = "01";
var SONGBIRD_UI_EVENTS = [
  "ui.close",
  "ui.render",

  // TODO these events are not documented in the
  // client reference because so far we have
  // not been able to trigger them in our testing
  "ui.renderHidden",
  "ui.loading.close",
  "ui.loading.render",
];

var SCA_EXEMPTION_TYPES = ["low_value", "transaction_risk_analysis"];

ExtendedPromise.suppressUnhandledPromiseMessage = true;

function SongbirdFramework(options) {
  BaseFramework.call(this, options);

  this._songbirdInitFailed = false;
  this._clientMetadata = {
    requestedThreeDSecureVersion: "2",
    sdkVersion: PLATFORM + "/" + VERSION,
  };
  this.originalSetupOptions = options;
  this._getDfReferenceIdPromisePlus = new ExtendedPromise();
  this.setupSongbird(options);
  this._cardinalEvents = [];
}

SongbirdFramework.prototype = Object.create(BaseFramework.prototype, {
  constructor: SongbirdFramework,
});

SongbirdFramework.events = enumerate(
  [
    "LOOKUP_COMPLETE",
    "CUSTOMER_CANCELED",
    "UI.CLOSE",
    "UI.RENDER",
    "UI.RENDERHIDDEN",
    "UI.LOADING.CLOSE",
    "UI.LOADING.RENDER",
  ],
  "songbird-framework:"
);

SongbirdFramework.prototype.setUpEventListeners = function (reply) {
  this.on(SongbirdFramework.events.LOOKUP_COMPLETE, function (data, next) {
    reply("lookup-complete", data, next);
  });
  this.on(SongbirdFramework.events.CUSTOMER_CANCELED, function () {
    reply("customer-canceled");
  });
  this.on(SongbirdFramework.events["UI.CLOSE"], function () {
    reply("authentication-modal-close");
  });
  this.on(SongbirdFramework.events["UI.RENDER"], function () {
    reply("authentication-modal-render");
  });
  this.on(SongbirdFramework.events["UI.RENDERHIDDEN"], function () {
    reply("authentication-modal-render-hidden");
  });
  this.on(SongbirdFramework.events["UI.LOADING.CLOSE"], function () {
    reply("authentication-modal-loader-close");
  });
  this.on(SongbirdFramework.events["UI.LOADING.RENDER"], function () {
    reply("authentication-modal-loader-render");
  });
};

SongbirdFramework.prototype.prepareLookup = function (options) {
  var data = assign({}, options);
  var self = this;

  return this.getDfReferenceId()
    .then(function (id) {
      data.dfReferenceId = id;
    })
    .then(function () {
      return self._triggerCardinalBinProcess(options.bin);
    })
    .catch(function () {
      // catch and ignore errors from looking up
      // df reference and Cardinal bin process
    })
    .then(function () {
      return self._waitForClient();
    })
    .then(function () {
      data.clientMetadata = self._clientMetadata;
      data.authorizationFingerprint =
        self._client.getConfiguration().authorizationFingerprint;
      data.braintreeLibraryVersion = "braintree/web/" + VERSION;

      return data;
    });
};

SongbirdFramework.prototype.initializeChallengeWithLookupResponse = function (
  lookupResponse,
  options
) {
  return this.setupSongbird().then(
    function () {
      return BaseFramework.prototype.initializeChallengeWithLookupResponse.call(
        this,
        lookupResponse,
        options
      );
    }.bind(this)
  );
};

SongbirdFramework.prototype.handleSongbirdError = function (errorType) {
  this._songbirdInitFailed = true;
  this._removeSongbirdListeners();
  analytics.sendEvent(
    this._createPromise,
    "three-d-secure.cardinal-sdk.songbird-error." + errorType
  );

  if (this._songbirdPromise) {
    this._songbirdPromise.resolve();
  }
};

SongbirdFramework.prototype._triggerCardinalBinProcess = function (bin) {
  var self = this;
  var issuerStartTime = Date.now();

  return window.Cardinal.trigger("bin.process", bin).then(function (
    binResults
  ) {
    self._clientMetadata.issuerDeviceDataCollectionTimeElapsed =
      Date.now() - issuerStartTime;
    self._clientMetadata.issuerDeviceDataCollectionResult =
      binResults && binResults.Status;
  });
};

SongbirdFramework.prototype.transformBillingAddress = function (
  additionalInformation,
  billingAddress
) {
  if (billingAddress) {
    // map from public API to the API that the Gateway expects
    extractAddressData(billingAddress, additionalInformation, "billing");
    additionalInformation.billingPhoneNumber = billingAddress.phoneNumber;
    additionalInformation.billingGivenName = billingAddress.givenName;
    additionalInformation.billingSurname = billingAddress.surname;
  }

  return additionalInformation;
};

SongbirdFramework.prototype.transformShippingAddress = function (
  additionalInformation
) {
  var shippingAddress = additionalInformation.shippingAddress;

  if (shippingAddress) {
    // map from public API to the API that the Gateway expects
    extractAddressData(shippingAddress, additionalInformation, "shipping");

    delete additionalInformation.shippingAddress;
  }

  return additionalInformation;
};

SongbirdFramework.prototype._createV1IframeModalElement = function (iframe) {
  var modal = document.createElement("div");

  modal.innerHTML =
    '<div data-braintree-v1-fallback-iframe-container="true" style="' +
    "height: 400px;" +
    '"></div>';
  modal
    .querySelector('[data-braintree-v1-fallback-iframe-container="true"]')
    .appendChild(iframe);

  return modal;
};

SongbirdFramework.prototype._createV1IframeModal = function (iframe) {
  var modal = this._createV1IframeModalElement(iframe);
  var btn = modal.querySelector("[data-braintree-v1-fallback-close-button]");
  var backdrop = modal.querySelector("[data-braintree-v1-fallback-backdrop]");
  var self = this;

  function closeHandler() {
    modal.parentNode.removeChild(modal);
    self.cancelVerifyCard(errors.THREEDS_CARDINAL_SDK_CANCELED);
    document.removeEventListener("keyup", self._onV1Keyup);
    self._onV1Keyup = null;
  }

  this._onV1Keyup = function (e) {
    if (e.key !== "Escape") {
      return;
    }

    if (!modal.parentNode) {
      // modal not on page
      return;
    }

    closeHandler();
  };

  if (btn) {
    btn.addEventListener("click", closeHandler);
  }

  if (backdrop) {
    backdrop.addEventListener("click", closeHandler);
  }

  document.addEventListener("keyup", this._onV1Keyup);

  return modal;
};

SongbirdFramework.prototype._addV1IframeToPage = function () {
  document.body.appendChild(this._v1Modal);
};

SongbirdFramework.prototype.setupSongbird = function (setupOptions) {
  var self = this;
  var startTime = Date.now();

  if (this._songbirdPromise) {
    return this._songbirdPromise;
  }

  setupOptions = setupOptions || {};

  this._songbirdPromise = new ExtendedPromise();
  this._v2SetupFailureReason = "reason-unknown";

  self
    ._loadCardinalScript(setupOptions)
    .then(function () {
      if (!window.Cardinal) {
        self._v2SetupFailureReason = "cardinal-global-unavailable";

        return Promise.reject(
          new BraintreeError(errors.THREEDS_CARDINAL_SDK_SETUP_FAILED)
        );
      }

      return self._configureCardinalSdk({
        setupOptions: setupOptions,
        setupStartTime: startTime,
      });
    })
    .catch(function (err) {
      var error = convertToBraintreeError(err, {
        type: errors.THREEDS_CARDINAL_SDK_SETUP_FAILED.type,
        code: errors.THREEDS_CARDINAL_SDK_SETUP_FAILED.code,
        message: errors.THREEDS_CARDINAL_SDK_SETUP_FAILED.message,
      });

      self._getDfReferenceIdPromisePlus.reject(error);

      window.clearTimeout(self._songbirdSetupTimeoutReference);
      analytics.sendEvent(
        self._client,
        "three-d-secure.cardinal-sdk.init.setup-failed"
      );
      self.handleSongbirdError(
        "cardinal-sdk-setup-failed." + self._v2SetupFailureReason
      );
    });

  return this._songbirdPromise;
};

SongbirdFramework.prototype._configureCardinalSdk = function (config) {
  var self = this;

  return this._waitForClient()
    .then(function () {
      var threeDSConfig =
        self._client.getConfiguration().gatewayConfiguration.threeDSecure;

      return threeDSConfig;
    })
    .then(function (threeDSConfig) {
      var jwt = threeDSConfig.cardinalAuthenticationJWT;
      var setupOptions = config.setupOptions;
      var setupStartTime = config.setupStartTime;
      var cardinalConfiguration =
        self._createCardinalConfigurationOptions(setupOptions);

      SONGBIRD_UI_EVENTS.forEach(function (eventName) {
        self.setCardinalListener(eventName, function () {
          self._emit(SongbirdFramework.events[eventName.toUpperCase()]);
        });
      });
      self.setCardinalListener(
        "payments.setupComplete",
        self._createPaymentsSetupCompleteCallback()
      );

      self._setupFrameworkSpecificListeners();

      window.Cardinal.configure(cardinalConfiguration);

      window.Cardinal.setup("init", {
        jwt: jwt,
      });

      self._clientMetadata.cardinalDeviceDataCollectionTimeElapsed =
        Date.now() - setupStartTime;

      self.setCardinalListener(
        "payments.validated",
        self._createPaymentsValidatedCallback()
      );
    })
    .catch(function (err) {
      self._v2SetupFailureReason = "cardinal-configuration-threw-error";

      return Promise.reject(err);
    });
};

SongbirdFramework.prototype.setCardinalListener = function (eventName, cb) {
  this._cardinalEvents.push(eventName);
  window.Cardinal.on(eventName, cb);
};

SongbirdFramework.prototype._setupFrameworkSpecificListeners = function () {
  // noop
};

SongbirdFramework.prototype._createCardinalConfigurationOptions = function (
  setupOptions
) {
  var cardinalConfiguration = setupOptions.cardinalSDKConfig || {};
  var paymentSettings = cardinalConfiguration.payment || {};

  if (!cardinalConfiguration.logging && setupOptions.loggingEnabled) {
    cardinalConfiguration.logging = {
      level: "verbose",
    };
  }

  cardinalConfiguration.payment = {};

  if (paymentSettings.hasOwnProperty("displayLoading")) {
    cardinalConfiguration.payment.displayLoading =
      paymentSettings.displayLoading;
  }
  if (paymentSettings.hasOwnProperty("displayExitButton")) {
    cardinalConfiguration.payment.displayExitButton =
      paymentSettings.displayExitButton;
  }

  return cardinalConfiguration;
};

SongbirdFramework.prototype._loadCardinalScript = function (setupOptions) {
  var self = this;

  return this._waitForClient()
    .then(function () {
      var scriptSource = self._getCardinalScriptSource();

      self._songbirdSetupTimeoutReference = window.setTimeout(function () {
        analytics.sendEvent(
          self._client,
          "three-d-secure.cardinal-sdk.init.setup-timeout"
        );
        self.handleSongbirdError("cardinal-sdk-setup-timeout");
      }, setupOptions.timeout || INTEGRATION_TIMEOUT_MS);

      return assets.loadScript({ src: scriptSource });
    })
    .catch(function (err) {
      self._v2SetupFailureReason = "songbird-js-failed-to-load";

      return Promise.reject(
        convertToBraintreeError(
          err,
          errors.THREEDS_CARDINAL_SDK_SCRIPT_LOAD_FAILED
        )
      );
    });
};

SongbirdFramework.prototype._getCardinalScriptSource = function () {
  var gatewayConfig = this._client.getConfiguration().gatewayConfiguration;

  if (gatewayConfig && gatewayConfig.environment === "production") {
    return constants.CARDINAL_SCRIPT_SOURCE.production;
  }

  return constants.CARDINAL_SCRIPT_SOURCE.sandbox;
};

SongbirdFramework.prototype._createPaymentsSetupCompleteCallback = function () {
  var self = this;

  return function (data) {
    self._getDfReferenceIdPromisePlus.resolve(data.sessionId);

    window.clearTimeout(self._songbirdSetupTimeoutReference);
    analytics.sendEvent(
      self._createPromise,
      "three-d-secure.cardinal-sdk.init.setup-completed"
    );

    self._songbirdPromise.resolve();
  };
};

SongbirdFramework.prototype.getDfReferenceId = function () {
  return this._getDfReferenceIdPromisePlus;
};

SongbirdFramework.prototype._performJWTValidation = function (
  rawCardinalSDKVerificationData,
  jwt
) {
  var self = this;
  var nonce = this._lookupPaymentMethod.nonce;
  var url =
    "payment_methods/" + nonce + "/three_d_secure/authenticate_from_jwt";
  var cancelCode =
    rawCardinalSDKVerificationData &&
    rawCardinalSDKVerificationData.Payment &&
    rawCardinalSDKVerificationData.Payment.ExtendedData &&
    rawCardinalSDKVerificationData.Payment.ExtendedData.ChallengeCancel;

  if (cancelCode) {
    // see ChallengeCancel docs here for different values:
    // https://cardinaldocs.atlassian.net/wiki/spaces/CC/pages/98315/Response+Objects
    analytics.sendEvent(
      this._createPromise,
      "three-d-secure.verification-flow.cardinal-sdk.cancel-code." + cancelCode
    );

    if (cancelCode === CUSTOMER_CANCELED_SONGBIRD_MODAL) {
      this._emit(SongbirdFramework.events.CUSTOMER_CANCELED);
    }
  }

  analytics.sendEvent(
    this._createPromise,
    "three-d-secure.verification-flow.upgrade-payment-method.started"
  );

  return this._waitForClient()
    .then(function () {
      return self._client.request({
        method: "post",
        endpoint: url,
        data: {
          jwt: jwt,
          paymentMethodNonce: nonce,
        },
      });
    })
    .then(function (response) {
      var paymentMethod = response.paymentMethod || self._lookupPaymentMethod;
      var formattedResponse = self._formatAuthResponse(
        paymentMethod,
        response.threeDSecureInfo
      );

      formattedResponse.rawCardinalSDKVerificationData =
        rawCardinalSDKVerificationData;
      analytics.sendEvent(
        self._client,
        "three-d-secure.verification-flow.upgrade-payment-method.succeeded"
      );

      return Promise.resolve(formattedResponse);
    })
    .catch(function (err) {
      var error = new BraintreeError({
        type: errors.THREEDS_JWT_AUTHENTICATION_FAILED.type,
        code: errors.THREEDS_JWT_AUTHENTICATION_FAILED.code,
        message: errors.THREEDS_JWT_AUTHENTICATION_FAILED.message,
        details: {
          originalError: err,
        },
      });

      analytics.sendEvent(
        self._client,
        "three-d-secure.verification-flow.upgrade-payment-method.errored"
      );

      return Promise.reject(error);
    });
};

SongbirdFramework.prototype._createPaymentsValidatedCallback = function () {
  var self = this;

  /**
   * @param {object} data Response Data
   * @see {@link https://cardinaldocs.atlassian.net/wiki/spaces/CC/pages/98315/Response+Objects#ResponseObjects-ObjectDefinition}
   * @param {string} data.ActionCode The resulting state of the transaction.
   * @param {boolean} data.Validated Represents whether transaction was successfully or not.
   * @param {object} data.Payment Represents additional information about the verification.
   * @param {number} data.ErrorNumber A non-zero value represents the error encountered while attempting the process the message request.
   * @param {string} data.ErrorDescription Application error description for the associated error number.
   * @param {string} validatedJwt Response JWT
   * @returns {void}
   * */
  return function (data, validatedJwt) {
    var formattedError;

    analytics.sendEvent(
      self._createPromise,
      "three-d-secure.verification-flow.cardinal-sdk.action-code." +
        data.ActionCode.toLowerCase()
    );

    if (!self._verifyCardPromisePlus) {
      self.handleSongbirdError(
        "cardinal-sdk-setup-error.number-" + data.ErrorNumber
      );

      return;
    }

    switch (data.ActionCode) {
      // Handle these scenarios based on liability shift information in the response.
      case "SUCCESS":
      case "NOACTION":
      case "FAILURE":
        self
          ._performJWTValidation(data, validatedJwt)
          .then(function (result) {
            self._verifyCardPromisePlus.resolve(result);
          })
          .catch(function (err) {
            self._verifyCardPromisePlus.reject(err);
          });
        break;

      case "ERROR":
        analytics.sendEvent(
          self._createPromise,
          "three-d-secure.verification-flow.cardinal-sdk-error." +
            data.ErrorNumber
        );

        switch (data.ErrorNumber) {
          case 10001: // Cardinal Docs: Timeout when sending an /Init message
          case 10002: // Cardinal Docs: Timeout when sending an /Start message
            formattedError = new BraintreeError(
              errors.THREEDS_CARDINAL_SDK_SETUP_TIMEDOUT
            );
            break;
          case 10003: // Cardinal Docs: Timeout when sending an /Validate message. Although this code exists we do not yet have a flow where a validate message is sent to Midas. This error should not yet be triggered
          case 10007: // Cardinal Docs: Timeout when sending an /Confirm message
          case 10009: // Cardinal Docs: Timeout when sending an /Continue message
            formattedError = new BraintreeError(
              errors.THREEDS_CARDINAL_SDK_RESPONSE_TIMEDOUT
            );
            break;
          case 10005: // Cardinal Docs: Songbird was started without a request jwt.
          case 10006: // Cardinal Docs: This is a general configuration error. The description is populated by the specific configuration error that caused the error.
            formattedError = new BraintreeError(
              errors.THREEDS_CARDINAL_SDK_BAD_CONFIG
            );
            break;
          case 10008: // Cardinal Docs: Songbird was initialized without a merchant JWT.
          case 10010: // Cardinal Docs: The response JWT was
            formattedError = new BraintreeError(
              errors.THREEDS_CARDINAL_SDK_BAD_JWT
            );
            break;
          case 10011:
            // This may never get called, according to the Cardinal docs:
            // The user has canceled the transaction. This is generally found in alternative
            // payments that supply a cancel button on the payment brand side.
            analytics.sendEvent(
              self._createPromise,
              "three-d-secure.verification-flow.canceled"
            );
            formattedError = new BraintreeError(
              errors.THREEDS_CARDINAL_SDK_CANCELED
            );
            break;
          default:
            formattedError = new BraintreeError(
              errors.THREEDS_CARDINAL_SDK_ERROR
            );
        }

        formattedError.details = {
          originalError: {
            code: data.ErrorNumber,
            description: data.ErrorDescription,
          },
        };

        self._verifyCardPromisePlus.reject(formattedError);
        break;

      default:
    }
  };
};

SongbirdFramework.prototype._checkForVerifyCardError = function (
  options,
  privateOptions
) {
  if (!options.bin) {
    return new BraintreeError({
      type: errors.THREEDS_MISSING_VERIFY_CARD_OPTION.type,
      code: errors.THREEDS_MISSING_VERIFY_CARD_OPTION.code,
      message: "verifyCard options must include a BIN.",
    });
  }

  return BaseFramework.prototype._checkForVerifyCardError.call(
    this,
    options,
    privateOptions
  );
};

SongbirdFramework.prototype._checkForFrameworkSpecificVerifyCardErrors =
  function (options, privateOptions) {
    var errorOption;

    if (
      typeof options.onLookupComplete !== "function" &&
      !privateOptions.ignoreOnLookupCompleteRequirement
    ) {
      errorOption = "an onLookupComplete function";
    }

    return errorOption;
  };

SongbirdFramework.prototype._formatVerifyCardOptions = function (options) {
  var modifiedOptions = BaseFramework.prototype._formatVerifyCardOptions.call(
    this,
    options
  );
  var additionalInformation = modifiedOptions.additionalInformation || {};

  additionalInformation = this.transformBillingAddress(
    additionalInformation,
    options.billingAddress
  );
  additionalInformation = this.transformShippingAddress(additionalInformation);

  if (options.onLookupComplete) {
    modifiedOptions.onLookupComplete = deferred(options.onLookupComplete);
  }
  if (options.email) {
    additionalInformation.email = options.email;
  }
  if (options.mobilePhoneNumber) {
    additionalInformation.mobilePhoneNumber = options.mobilePhoneNumber;
  }

  modifiedOptions.additionalInformation = additionalInformation;

  return modifiedOptions;
};

SongbirdFramework.prototype._onLookupComplete = function (
  lookupResponse,
  options
) {
  var self = this;

  return BaseFramework.prototype._onLookupComplete
    .call(this, lookupResponse)
    .then(function (response) {
      return new Promise(function (resolve, reject) {
        // NEXT_MAJOR_VERSION format this response object to look like the mobile sdk response
        // which is basically the lookup param at the top level with some additional accessors
        response.requiresUserAuthentication = Boolean(
          response.lookup && response.lookup.acsUrl
        );

        function next() {
          resolve(response);
        }

        self._verifyCardPromisePlus.catch(reject);

        // If both event and callback are mistakenly used together,
        // prefer the callback when it is passed into the verifyCard options
        if (options.onLookupComplete) {
          options.onLookupComplete(response, next);
        } else {
          self._emit(SongbirdFramework.events.LOOKUP_COMPLETE, response, next);
        }
      });
    });
};

SongbirdFramework.prototype._presentChallenge = function (lookupResponse) {
  // transactionId is required for the Songbird flow, so if it
  // does not exist, we just return
  if (this._songbirdInitFailed || !lookupResponse.lookup.transactionId) {
    return;
  }

  // set up listener for ref id to call out to bt before calling verify callback
  window.Cardinal.continue(
    "cca",
    {
      AcsUrl: lookupResponse.lookup.acsUrl,
      Payload: lookupResponse.lookup.pareq,
    },
    {
      OrderDetails: { TransactionId: lookupResponse.lookup.transactionId },
    }
  );
};

SongbirdFramework.prototype._formatLookupData = function (options) {
  var self = this;

  return BaseFramework.prototype._formatLookupData
    .call(this, options)
    .then(function (data) {
      data.additionalInfo = options.additionalInformation;

      if (options.accountType) {
        data.accountType = options.accountType;
      }
      if (options.challengeRequested) {
        data.challengeRequested = options.challengeRequested;
      }
      if (options.requestedExemptionType) {
        if (!SCA_EXEMPTION_TYPES.includes(options.requestedExemptionType)) {
          throw new BraintreeError({
            code: errors.THREEDS_REQUESTED_EXEMPTION_TYPE_INVALID.code,
            type: errors.THREEDS_REQUESTED_EXEMPTION_TYPE_INVALID.type,
            message:
              "requestedExemptionType `" +
              options.requestedExemptionType +
              "` is not a valid exemption. The accepted values are: `" +
              SCA_EXEMPTION_TYPES.join("`, `") +
              "`",
          });
        }
        data.requestedExemptionType = options.requestedExemptionType;
      }
      if (options.customFields) {
        data.customFields = options.customFields;
      }
      if (options.dataOnlyRequested) {
        data.dataOnlyRequested = options.dataOnlyRequested;
      }
      if (options.exemptionRequested) {
        data.exemptionRequested = options.exemptionRequested;
      }
      if (options.requestVisaDAF) {
        data.requestVisaDAF = options.requestVisaDAF;
      }
      if (options.bin) {
        data.bin = options.bin;
      }
      // NEXT_MAJOR_VERSION remove cardAdd in favor of cardAddChallengeRequested
      if (options.cardAdd != null) {
        data.cardAdd = options.cardAdd;
      }
      if (options.cardAddChallengeRequested != null) {
        data.cardAdd = options.cardAddChallengeRequested;
      }
      if (options.merchantName) {
        data.merchantName = options.merchantName;
      }

      return self.prepareLookup(data);
    });
};

SongbirdFramework.prototype.cancelVerifyCard = function (verifyCardError) {
  var self = this;

  return BaseFramework.prototype.cancelVerifyCard
    .call(this)
    .then(function (response) {
      if (self._verifyCardPromisePlus) {
        verifyCardError =
          verifyCardError ||
          new BraintreeError(errors.THREEDS_VERIFY_CARD_CANCELED_BY_MERCHANT);

        self._verifyCardPromisePlus.reject(verifyCardError);
      }

      return response;
    });
};

SongbirdFramework.prototype._removeSongbirdListeners = function () {
  this._cardinalEvents.forEach(function (eventName) {
    window.Cardinal.off(eventName);
  });

  this._cardinalEvents = [];
};

SongbirdFramework.prototype.teardown = function () {
  if (window.Cardinal) {
    this._removeSongbirdListeners();
  }

  // we intentionally do not remove the Cardinal SDK
  // from the page when tearing down. Subsequent
  // component creations will be faster because
  // the asset is already on the page

  return BaseFramework.prototype.teardown.call(this);
};

SongbirdFramework.prototype._reloadThreeDSecure = function () {
  var self = this;
  var startTime = Date.now();

  return self.teardown().then(function () {
    self._configureCardinalSdk({
      setupOptions: self.originalSetupOptions,
      setupStartTime: startTime,
    });
  });
};

function extractAddressData(source, target, prefix) {
  target[prefix + "Line1"] = source.streetAddress;
  target[prefix + "Line2"] = source.extendedAddress;
  target[prefix + "Line3"] = source.line3;
  target[prefix + "City"] = source.locality;
  target[prefix + "State"] = source.region;
  target[prefix + "PostalCode"] = source.postalCode;
  target[prefix + "CountryCode"] = source.countryCodeAlpha2;
}

module.exports = SongbirdFramework;
