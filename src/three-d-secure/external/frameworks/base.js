"use strict";

var assign = require("../../../lib/assign").assign;
var analytics = require("../../../lib/analytics");
var BraintreeError = require("../../../lib/braintree-error");
var isVerifiedDomain = require("../../../lib/is-verified-domain");
var ExtendedPromise = require("@braintree/extended-promise");
var EventEmitter = require("@braintree/event-emitter");
var errors = require("../../shared/errors");
var iFramer = require("@braintree/iframer");
var Bus = require("framebus");
var constants = require("../../shared/constants");
var uuid = require("@braintree/uuid");
var events = require("../../shared/events");
var useMin = require("../../../lib/use-min");
var BUS_CONFIGURATION_REQUEST_EVENT =
  require("../../../lib/constants").BUS_CONFIGURATION_REQUEST_EVENT;

var VERSION = process.env.npm_package_version;
var IFRAME_HEIGHT = 400;
var IFRAME_WIDTH = 400;

ExtendedPromise.suppressUnhandledPromiseMessage = true;

function BaseFramework(options) {
  EventEmitter.call(this);

  this._client = options.client;
  this._createPromise = options.createPromise;
  this._createOptions = options;

  if (this._client) {
    this._isDebug = this._client.getConfiguration().isDebug;
    this._assetsUrl =
      this._client.getConfiguration().gatewayConfiguration.assetsUrl;
  } else {
    this._isDebug = Boolean(options.isDebug);
    this._assetsUrl = options.assetsUrl;
  }
  this._assetsUrl = this._assetsUrl + "/web/" + VERSION;
}

EventEmitter.createChild(BaseFramework);

BaseFramework.prototype._waitForClient = function () {
  if (this._client) {
    return Promise.resolve();
  }

  return this._createPromise.then(
    function (client) {
      this._client = client;
    }.bind(this)
  );
};

BaseFramework.prototype.setUpEventListeners = function () {
  throw new BraintreeError(errors.THREEDS_FRAMEWORK_METHOD_NOT_IMPLEMENTED);
};

BaseFramework.prototype.verifyCard = function (options, privateOptions) {
  var formattedOptions, error;
  var self = this;

  privateOptions = privateOptions || {};

  error = this._checkForVerifyCardError(options, privateOptions);

  if (error) {
    return Promise.reject(error);
  }

  this._verifyCardInProgress = true;

  formattedOptions = this._formatVerifyCardOptions(options);

  return this._formatLookupData(formattedOptions)
    .then(function (data) {
      analytics.sendEvent(
        self._createPromise,
        "three-d-secure.verification-flow.started"
      );

      return self._performLookup(formattedOptions.nonce, data);
    })
    .then(function (response) {
      analytics.sendEvent(
        self._createPromise,
        "three-d-secure.verification-flow.3ds-version." +
          response.lookup.threeDSecureVersion
      );

      return self._onLookupComplete(response, formattedOptions);
    })
    .then(function (response) {
      return self.initializeChallengeWithLookupResponse(
        response,
        formattedOptions
      );
    })
    .then(function (payload) {
      self._resetVerificationState();

      analytics.sendEvent(
        self._createPromise,
        "three-d-secure.verification-flow.completed"
      );

      return payload;
    })
    .catch(function (err) {
      self._resetVerificationState();

      analytics.sendEvent(
        self._createPromise,
        "three-d-secure.verification-flow.failed"
      );

      return Promise.reject(err);
    });
};

BaseFramework.prototype._checkForFrameworkSpecificVerifyCardErrors =
  function () {
    throw new BraintreeError(errors.THREEDS_FRAMEWORK_METHOD_NOT_IMPLEMENTED);
  };

BaseFramework.prototype._presentChallenge = function () {
  throw new BraintreeError(errors.THREEDS_FRAMEWORK_METHOD_NOT_IMPLEMENTED);
};

BaseFramework.prototype.prepareLookup = function () {
  throw new BraintreeError(errors.THREEDS_FRAMEWORK_METHOD_NOT_IMPLEMENTED);
};

BaseFramework.prototype._resetVerificationState = function () {
  this._verifyCardInProgress = false;
  this._verifyCardPromisePlus = null;

  if (typeof this._reloadThreeDSecure === "function") {
    this._reloadThreeDSecure();
  }
};

BaseFramework.prototype._performLookup = function (nonce, data) {
  var self = this;
  var url = "payment_methods/" + nonce + "/three_d_secure/lookup";

  return this._waitForClient().then(function () {
    return self._client
      .request({
        endpoint: url,
        method: "post",
        data: data,
      })
      .catch(function (err) {
        var status = err && err.details && err.details.httpStatus;
        var analyticsMessage = "three-d-secure.verification-flow.lookup-failed";
        var lookupError;

        if (status === 404) {
          lookupError = errors.THREEDS_LOOKUP_TOKENIZED_CARD_NOT_FOUND_ERROR;
          analyticsMessage += ".404";
        } else if (status === 422) {
          lookupError = errors.THREEDS_LOOKUP_VALIDATION_ERROR;
          analyticsMessage += ".422";
        } else {
          lookupError = errors.THREEDS_LOOKUP_ERROR;
        }

        analytics.sendEvent(self._createPromise, analyticsMessage);

        return Promise.reject(
          new BraintreeError({
            type: lookupError.type,
            code: lookupError.code,
            message: lookupError.message,
            details: {
              originalError: err,
            },
          })
        );
      });
  });
};

BaseFramework.prototype._existsAndIsNumeric = function (value) {
  /**
   * Returns true if value is numeric and false if value is:
   *  - undefined
   *  - null
   *  - an array
   *  - an empty string
   *  - boolean
   *  - otherwise non-numeric value (e.g. {}, "cows")
   */
  return !(
    value === undefined ||
    value === null ||
    Array.isArray(value) ||
    typeof value === "boolean" ||
    (typeof value === "string" && value.trim() === "") ||
    isNaN(Number(value))
  );
};

BaseFramework.prototype._checkForVerifyCardError = function (
  options,
  privateOptions
) {
  var errorOption;

  if (this._verifyCardInProgress === true) {
    return new BraintreeError(errors.THREEDS_AUTHENTICATION_IN_PROGRESS);
  }
  if (!options.nonce) {
    errorOption = "a nonce";
  } else if (!this._existsAndIsNumeric(options.amount)) {
    errorOption = "an amount";
  }

  if (!errorOption) {
    errorOption = this._checkForFrameworkSpecificVerifyCardErrors(
      options,
      privateOptions
    );
  }

  if (errorOption) {
    return new BraintreeError({
      type: errors.THREEDS_MISSING_VERIFY_CARD_OPTION.type,
      code: errors.THREEDS_MISSING_VERIFY_CARD_OPTION.code,
      message: "verifyCard options must include " + errorOption + ".",
    });
  }

  return null;
};

BaseFramework.prototype.initializeChallengeWithLookupResponse = function (
  lookupResponse,
  options
) {
  var self = this;

  options = options || {};

  this._lookupPaymentMethod = lookupResponse.paymentMethod;

  // sets this in the case that initializeChallengeWithLookupResponse is
  // called as a standalone method from a server side lookup. In a normal
  // verifyCard flow, this promise will already exist
  self._verifyCardPromisePlus =
    self._verifyCardPromisePlus || new ExtendedPromise();
  self._handleLookupResponse(lookupResponse, options);

  return self._verifyCardPromisePlus.then(function (payload) {
    analytics.sendEvent(
      self._createPromise,
      "three-d-secure.verification-flow.liability-shifted." +
        String(payload.liabilityShifted)
    );
    analytics.sendEvent(
      self._createPromise,
      "three-d-secure.verification-flow.liability-shift-possible." +
        String(payload.liabilityShiftPossible)
    );

    return payload;
  });
};

BaseFramework.prototype._handleLookupResponse = function (
  lookupResponse,
  options
) {
  var challengeShouldBePresented = Boolean(
    lookupResponse.lookup && lookupResponse.lookup.acsUrl
  );
  var details;

  analytics.sendEvent(
    this._createPromise,
    "three-d-secure.verification-flow.challenge-presented." +
      String(challengeShouldBePresented)
  );

  if (challengeShouldBePresented) {
    this._presentChallenge(lookupResponse, options);
  } else {
    details = this._formatAuthResponse(
      lookupResponse.paymentMethod,
      lookupResponse.threeDSecureInfo
    );
    details.verificationDetails = lookupResponse.threeDSecureInfo;

    this._verifyCardPromisePlus.resolve(details);
  }
};

BaseFramework.prototype._onLookupComplete = function (response) {
  this._lookupPaymentMethod = response.paymentMethod;
  this._verifyCardPromisePlus = new ExtendedPromise();

  return Promise.resolve(response);
};

BaseFramework.prototype._formatAuthResponse = function (
  paymentMethod,
  threeDSecureInfo
) {
  return {
    nonce: paymentMethod.nonce,
    type: paymentMethod.type,
    binData: paymentMethod.binData,
    details: paymentMethod.details,
    description:
      paymentMethod.description &&
      paymentMethod.description.replace(/\+/g, " "),
    liabilityShifted: threeDSecureInfo && threeDSecureInfo.liabilityShifted,
    liabilityShiftPossible:
      threeDSecureInfo && threeDSecureInfo.liabilityShiftPossible,
    threeDSecureInfo: paymentMethod.threeDSecureInfo,
  };
};

BaseFramework.prototype._formatVerifyCardOptions = function (options) {
  return assign({}, options);
};

BaseFramework.prototype._formatLookupData = function (options) {
  var data = {
    amount: options.amount,
  };

  if (options.collectDeviceData === true) {
    data.browserColorDepth = window.screen.colorDepth;
    data.browserJavaEnabled = window.navigator.javaEnabled();
    data.browserJavascriptEnabled = true;
    data.browserLanguage = window.navigator.language;
    data.browserScreenHeight = window.screen.height;
    data.browserScreenWidth = window.screen.width;
    data.browserTimeZone = new Date().getTimezoneOffset();
    data.deviceChannel = "Browser";
  }

  return Promise.resolve(data);
};

BaseFramework.prototype._handleV1AuthResponse = function (data) {
  var authResponse = JSON.parse(data.auth_response);

  if (authResponse.success) {
    this._verifyCardPromisePlus.resolve(
      this._formatAuthResponse(
        authResponse.paymentMethod,
        authResponse.threeDSecureInfo
      )
    );
  } else if (
    authResponse.threeDSecureInfo &&
    authResponse.threeDSecureInfo.liabilityShiftPossible
  ) {
    this._verifyCardPromisePlus.resolve(
      this._formatAuthResponse(
        this._lookupPaymentMethod,
        authResponse.threeDSecureInfo
      )
    );
  } else {
    this._verifyCardPromisePlus.reject(
      new BraintreeError({
        type: BraintreeError.types.UNKNOWN,
        code: "UNKNOWN_AUTH_RESPONSE",
        message: authResponse.error.message,
      })
    );
  }
};

BaseFramework.prototype.cancelVerifyCard = function () {
  var response, threeDSecureInfo;

  this._verifyCardInProgress = false;

  if (!this._lookupPaymentMethod) {
    return Promise.reject(
      new BraintreeError(errors.THREEDS_NO_VERIFICATION_PAYLOAD)
    );
  }

  threeDSecureInfo = this._lookupPaymentMethod.threeDSecureInfo;

  response = assign({}, this._lookupPaymentMethod, {
    liabilityShiftPossible:
      threeDSecureInfo && threeDSecureInfo.liabilityShiftPossible,
    liabilityShifted: threeDSecureInfo && threeDSecureInfo.liabilityShifted,
    verificationDetails:
      threeDSecureInfo && threeDSecureInfo.verificationDetails,
  });

  return Promise.resolve(response);
};

BaseFramework.prototype._setupV1Bus = function (options) {
  var clientConfiguration = this._client.getConfiguration();
  var parentURL = window.location.href.split("#")[0];
  var lookupResponse = options.lookupResponse;
  var channel = uuid();
  var bus = new Bus({
    channel: channel,
    verifyDomain: isVerifiedDomain,
  });
  var authenticationCompleteBaseUrl =
    this._assetsUrl +
    "/html/three-d-secure-authentication-complete-frame.html?channel=" +
    encodeURIComponent(channel) +
    "&";

  bus.on(BUS_CONFIGURATION_REQUEST_EVENT, function (reply) {
    reply({
      clientConfiguration: clientConfiguration,
      nonce: options.nonce,
      acsUrl: lookupResponse.acsUrl,
      pareq: lookupResponse.pareq,
      termUrl:
        lookupResponse.termUrl +
        "&three_d_secure_version=" +
        VERSION +
        "&authentication_complete_base_url=" +
        encodeURIComponent(authenticationCompleteBaseUrl),
      md: lookupResponse.md,
      parentUrl: parentURL,
    });
  });

  bus.on(events.AUTHENTICATION_COMPLETE, options.handleAuthResponse);

  return bus;
};

BaseFramework.prototype._setupV1Iframe = function (options) {
  var url =
    this._assetsUrl +
    "/html/three-d-secure-bank-frame" +
    useMin(this._isDebug) +
    ".html?showLoader=" +
    options.showLoader;
  var bankIframe = iFramer({
    src: url,
    height: IFRAME_HEIGHT,
    width: IFRAME_WIDTH,
    name: constants.LANDING_FRAME_NAME + "_" + this._v1Bus.channel,
    title: "3D Secure Authorization Frame",
  });

  return bankIframe;
};

BaseFramework.prototype._setupV1Elements = function (options) {
  this._v1Bus = this._setupV1Bus(options);
  this._v1Iframe = this._setupV1Iframe(options);
};

BaseFramework.prototype._teardownV1Elements = function () {
  if (this._v1Bus) {
    this._v1Bus.teardown();
    this._v1Bus = null;
  }

  if (this._v1Iframe && this._v1Iframe.parentNode) {
    this._v1Iframe.parentNode.removeChild(this._v1Iframe);
    this._v1Iframe = null;
  }

  if (this._onV1Keyup) {
    document.removeEventListener("keyup", this._onV1Keyup);
    this._onV1Keyup = null;
  }
};

BaseFramework.prototype.teardown = function () {
  analytics.sendEvent(this._createPromise, "three-d-secure.teardown-completed");

  this._teardownV1Elements();

  return Promise.resolve();
};

module.exports = BaseFramework;
