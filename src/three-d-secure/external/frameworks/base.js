'use strict';

var assign = require('../../../lib/assign').assign;
var analytics = require('../../../lib/analytics');
var BraintreeError = require('../../../lib/braintree-error');
var Promise = require('../../../lib/promise');
var makePromisePlus = require('../../../lib/promise-plus');
var EventEmitter = require('@braintree/event-emitter');
var errors = require('../../shared/errors');

var VERSION = process.env.npm_package_version;

function BaseFramework(options) {
  EventEmitter.call(this);

  this._client = options.client;
  this._isDebug = this._client.getConfiguration().isDebug;
  this._assetsUrl = this._client.getConfiguration().gatewayConfiguration.assetsUrl + '/web/' + VERSION;
}

EventEmitter.createChild(BaseFramework);

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

  return this._formatLookupData(formattedOptions).then(function (data) {
    analytics.sendEvent(self._client, 'three-d-secure.verification-flow.started');

    return self._performLookup(formattedOptions.nonce, data);
  }).then(function (response) {
    analytics.sendEvent(self._client, 'three-d-secure.verification-flow.3ds-version.' + response.lookup.threeDSecureVersion);

    return self._onLookupComplete(response, formattedOptions);
  }).then(function (response) {
    return self.initializeChallengeWithLookupResponse(response, formattedOptions);
  }).then(function (payload) {
    self._resetVerificationState();

    analytics.sendEvent(self._client, 'three-d-secure.verification-flow.completed');

    return payload;
  }).catch(function (err) {
    self._resetVerificationState();

    analytics.sendEvent(self._client, 'three-d-secure.verification-flow.failed');

    return Promise.reject(err);
  });
};

BaseFramework.prototype._checkForFrameworkSpecificVerifyCardErrors = function () {
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
};

BaseFramework.prototype._performLookup = function (nonce, data) {
  var self = this;
  var url = 'payment_methods/' + nonce + '/three_d_secure/lookup';

  return this._client.request({
    endpoint: url,
    method: 'post',
    data: data
  }).catch(function (err) {
    var status = err && err.details && err.details.httpStatus;
    var analyticsMessage = 'three-d-secure.verification-flow.lookup-failed';
    var lookupError;

    if (status === 404) {
      lookupError = errors.THREEDS_LOOKUP_TOKENIZED_CARD_NOT_FOUND_ERROR;
      analyticsMessage += '.404';
    } else if (status === 422) {
      lookupError = errors.THREEDS_LOOKUP_VALIDATION_ERROR;
      analyticsMessage += '.422';
    } else {
      lookupError = errors.THREEDS_LOOKUP_ERROR;
    }

    analytics.sendEvent(self._client, analyticsMessage);

    return Promise.reject(new BraintreeError({
      type: lookupError.type,
      code: lookupError.code,
      message: lookupError.message,
      details: {
        originalError: err
      }
    }));
  });
};

BaseFramework.prototype._checkForVerifyCardError = function (options, privateOptions) {
  var errorOption;

  if (this._verifyCardInProgress === true) {
    return new BraintreeError(errors.THREEDS_AUTHENTICATION_IN_PROGRESS);
  } else if (!options.nonce) {
    errorOption = 'a nonce';
  } else if (!options.amount) {
    errorOption = 'an amount';
  }

  if (!errorOption) {
    errorOption = this._checkForFrameworkSpecificVerifyCardErrors(options, privateOptions);
  }

  if (errorOption) {
    return new BraintreeError({
      type: errors.THREEDS_MISSING_VERIFY_CARD_OPTION.type,
      code: errors.THREEDS_MISSING_VERIFY_CARD_OPTION.code,
      message: 'verifyCard options must include ' + errorOption + '.'
    });
  }

  return null;
};

BaseFramework.prototype.initializeChallengeWithLookupResponse = function (lookupResponse, options) {
  var self = this;

  options = options || {};

  this._lookupPaymentMethod = lookupResponse.paymentMethod;

  // sets this in the case that initializeChallengeWithLookupResponse is
  // called as a standalone method from a server side lookup. In a normal
  // verifyCard flow, this promise will already exist
  self._verifyCardPromisePlus = self._verifyCardPromisePlus || makePromisePlus();
  self._handleLookupResponse(lookupResponse, options);

  return self._verifyCardPromisePlus.then(function (payload) {
    analytics.sendEvent(self._client, 'three-d-secure.verification-flow.liability-shifted.' + String(payload.liabilityShifted));
    analytics.sendEvent(self._client, 'three-d-secure.verification-flow.liability-shift-possible.' + String(payload.liabilityShiftPossible));

    return payload;
  });
};

BaseFramework.prototype._handleLookupResponse = function (lookupResponse, options) {
  var challengeShouldBePresented = Boolean(lookupResponse.lookup && lookupResponse.lookup.acsUrl);
  var details;

  analytics.sendEvent(this._client, 'three-d-secure.verification-flow.challenge-presented.' + String(challengeShouldBePresented));

  if (challengeShouldBePresented) {
    this._presentChallenge(lookupResponse, options);
  } else {
    details = this._formatAuthResponse(lookupResponse.paymentMethod, lookupResponse.threeDSecureInfo);
    details.verificationDetails = lookupResponse.threeDSecureInfo;

    this._verifyCardPromisePlus.resolve(details);
  }
};

BaseFramework.prototype._onLookupComplete = function (response) {
  this._lookupPaymentMethod = response.paymentMethod;
  this._verifyCardPromisePlus = makePromisePlus();

  return Promise.resolve(response);
};

BaseFramework.prototype._formatAuthResponse = function (paymentMethod, threeDSecureInfo) {
  return {
    nonce: paymentMethod.nonce,
    binData: paymentMethod.binData,
    details: paymentMethod.details,
    description: paymentMethod.description && paymentMethod.description.replace(/\+/g, ' '),
    liabilityShifted: threeDSecureInfo && threeDSecureInfo.liabilityShifted,
    liabilityShiftPossible: threeDSecureInfo && threeDSecureInfo.liabilityShiftPossible,
    threeDSecureInfo: paymentMethod.threeDSecureInfo
  };
};

BaseFramework.prototype._formatVerifyCardOptions = function (options) {
  return assign({}, options);
};

BaseFramework.prototype._formatLookupData = function (options) {
  var data = {
    amount: options.amount
  };

  return Promise.resolve(data);
};

BaseFramework.prototype.cancelVerifyCard = function () {
  var response, threeDSecureInfo;

  this._verifyCardInProgress = false;

  if (!this._lookupPaymentMethod) {
    return Promise.reject(new BraintreeError(errors.THREEDS_NO_VERIFICATION_PAYLOAD));
  }

  threeDSecureInfo = this._lookupPaymentMethod.threeDSecureInfo;

  response = assign({}, this._lookupPaymentMethod, {
    liabilityShiftPossible: threeDSecureInfo && threeDSecureInfo.liabilityShiftPossible,
    liabilityShifted: threeDSecureInfo && threeDSecureInfo.liabilityShifted,
    verificationDetails: threeDSecureInfo && threeDSecureInfo.verificationDetails
  });

  return Promise.resolve(response);
};

BaseFramework.prototype.teardown = function () {
  analytics.sendEvent(this._client, 'three-d-secure.teardown-completed');

  return Promise.resolve();
};

module.exports = BaseFramework;
