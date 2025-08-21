"use strict";

var wrapPromise = require("@braintree/wrap-promise");

var analytics = require("../lib/analytics");
var BraintreeError = require("../lib/braintree-error");
var constants = require("./constants");
var errors = require("./errors");
var hasMissingOption = require("../lib/has-missing-option");

/**
 * @class
 * @param {object} options see {@link module:braintree-web/payment-ready.create|payment-ready.create}
 * @description <strong>Do not use this constructor directly. Use {@link module:braintree-web/payment-ready.create|braintree-web.payment-ready.create} instead.</strong>
 * @classdesc This class represents a Payment Ready component produced by {@link module:braintree-web/payment-ready.create|braintree-web.payment-ready.create}. Instances provide methods for Payment Ready methods.
 */
function PaymentReady(options) {
  this._instantiatedWithClient = Boolean(!options.useDeferredClient);
  this._client = options.client;
  this._createPromise = options.createPromise;
}

/**
 * Payment Ready Customer data object.
 * @typedef {object} PaymentReady~Customer
 * @property {string} [deviceFingerprintId] - Unique device identifier
 * @property {string} [hashedEmail] - This field must contain a Hex-encoded SHA-256 hashed value of the actual email.
 * The email address must be sanitized before hashing:
 *  * email address in lowercase
 *  * remove leading and trailing whitespace
 * @property {string} [hashedPhoneNumber] - This field must contain a Hex-encoded SHA-256 hashed value of the phone number; and the phone number must be in E.164 format.
 * * E.164 format example 1: '+12345551234' where country code is '1', area code is '234' and subscriber number is '555-1234'
 * * E.164 format example 2: '+6129876543X' where country code is '61', area code is '2' and subscriber number is '9876 543X'
 * @property {boolean} [paypalAppInstalled] - A flag indicating if customer device has paypal application installed.
 * @property {boolean} [venmoAppInstalled] - A flag indicating if customer device has venmo applicaition installed.
 * @property {string} [userAgent] - The user agent string of customer browser describing application, OS, vendor, and version of requesting user agent.
 */

/**
 * Creates a customer session using the Payment Ready API.
 *
 * @public
 * @param {object} options - The options for creating a customer session.
 * @param {PaymentReady~Customer} options.customer - The customer data object. At minimum, this object should contain  either `hashedEmail` or `hashedPhoneNumber` field.
 * @param {string} [options.sessionId] - Optionally, specify a unique identifier for this customer session. It must be at least 36 characters, no more than 100 characters and match the following regex: `[A-Za-z0-9-_.]+`.
 * @returns {Promise<object>} A promise that resolves with the created customer session data.
 * @throws {BraintreeError} If the specified `sessionId` has previously been used or has an invalid format.
 * @example
 * paymentReadyInstance.createCustomerSession({
 *   customer: {
 *     ... // Customer data
 *   }
 * }).then(function (sessionData) {
 *   // Handle the session data
 *   console.log(sessionData.sessionId);
 * }).catch(function (err) {
 *   // Handle errors
 *   console.error(err);
 * });
 */
PaymentReady.prototype.createCustomerSession = function (options) {
  var self = this;

  if (
    !options ||
    hasMissingOption(options, constants.REQUIRED_OPTIONS_CREATE_SESSION)
  ) {
    analytics.sendEvent(
      self._client,
      "payment-ready.create-customer-session.missing-options"
    );

    return Promise.reject(
      new BraintreeError(errors.PAYMENT_READY_MISSING_REQUIRED_OPTION)
    );
  }

  return self._client
    .request({
      api: "graphQLApi",
      data: {
        query: constants.CREATE_PAYMENT_READY_SESSION_QUERY,
        variables: {
          input: {
            sessionId: options.sessionId,
            customer: options.customer,
          },
        },
      },
    })
    .then(function (response) {
      analytics.sendEvent(
        self._client,
        "payment-ready.create-customer-session.succeeded"
      );

      return response.data.createCustomerSession;
    })
    .catch(function (err) {
      analytics.sendEvent(
        self._client,
        "payment-ready.create-customer-session.failed"
      );

      return Promise.reject(
        new BraintreeError({
          type: err.type || errors.PAYMENT_READY_CREATE_SESSION_ERROR.type,
          code: err.code || errors.PAYMENT_READY_CREATE_SESSION_ERROR.code,
          message:
            err.message || errors.PAYMENT_READY_CREATE_SESSION_ERROR.message,
          details: { originalError: err },
        })
      );
    });
};

/**
 * Updates an existing customer session using the Payment Ready API.
 *
 * @public
 * @param {object} options - The options for updating a customer session.
 * @param {string} options.sessionId - The ID of the session to update.
 * @param {PaymentReady~Customer} options.customer - The updated customer data object.
 * @returns {Promise<object>} A promise that resolves with the updated customer session data.
 * @example
 * paymentReadyInstance.updateCustomerSession({
 *   sessionId: "session-abc-123",
 *   customer: {
 *     ... // Updated customer data
 *   }
 * }).then(function (sessionData) {
 *   // Handle the updated session data
 *   console.log(sessionData.sessionId);
 * }).catch(function (err) {
 *   // Handle errors
 *   console.error(err);
 * });
 */
PaymentReady.prototype.updateCustomerSession = function (options) {
  var self = this;

  if (
    !options ||
    hasMissingOption(options, constants.REQUIRED_OPTIONS_UPDATE_SESSION)
  ) {
    analytics.sendEvent(
      self._client,
      "payment-ready.update-customer-session.missing-options"
    );

    return Promise.reject(
      new BraintreeError(errors.PAYMENT_READY_MISSING_REQUIRED_OPTION)
    );
  }

  return self._client
    .request({
      api: "graphQLApi",
      data: {
        query: constants.UPDATE_PAYMENT_READY_SESSION_QUERY,
        variables: {
          input: {
            sessionId: options.sessionId,
            customer: options.customer,
          },
        },
      },
    })
    .then(function (response) {
      analytics.sendEvent(
        self._client,
        "payment-ready.update-customer-session.succeeded"
      );

      return response.data.updateCustomerSession;
    })
    .catch(function (err) {
      analytics.sendEvent(
        self._client,
        "payment-ready.update-customer-session.failed"
      );

      return Promise.reject(
        new BraintreeError({
          type: err.type || errors.PAYMENT_READY_UPDATE_SESSION_ERROR.type,
          code: err.code || errors.PAYMENT_READY_UPDATE_SESSION_ERROR.code,
          message:
            err.message || errors.PAYMENT_READY_UPDATE_SESSION_ERROR.message,
          details: { originalError: err },
        })
      );
    });
};

/**
 * Generates customer payment recommendations using the Payment Ready API.
 *
 * @public
 * @param {object} options - The options for generating customer recommendations.
 * @param {string} options.sessionId - The ID of the session to get recommendations for.
 * @param {PaymentReady~Customer} [options.customer] - Optional customer data object.
 * @param {string} [options.domain] - Optional domain parameter.
 * @param {Array} [options.purchaseUnits] - Optional purchase units array.
 * @returns {Promise<object>} A promise that resolves with the customer recommendations data.
 * @example
 * paymentReadyInstance.getCustomerRecommendations({
 *   sessionId: "session-abc-123",
 *   customer: {
 *     // Optional customer data
 *   },
 *   domain: "example.com",
 *   purchaseUnits: [
 *     // Purchase unit data
 *   ]
 * }).then(function (recommendations) {
 *   // Handle the recommendations data
 *   console.log(recommendations.paymentRecommendations);
 * }).catch(function (err) {
 *   // Handle errors
 *   console.error(err);
 * });
 */
PaymentReady.prototype.getCustomerRecommendations = function (options) {
  var self = this;

  if (
    !options ||
    hasMissingOption(options, constants.REQUIRED_OPTIONS_GET_RECOMMENDATIONS)
  ) {
    analytics.sendEvent(
      self._client,
      "payment-ready.get-customer-recommendations.missing-options"
    );

    return Promise.reject(
      new BraintreeError(errors.PAYMENT_READY_NO_SESSION_ID)
    );
  }

  return self._client
    .request({
      api: "graphQLApi",
      data: {
        query: constants.GENERATE_CUSTOMER_RECOMMENDATIONS_QUERY,
        variables: {
          input: {
            sessionId: options.sessionId,
            customer: options.customer,
            domain: options.domain,
            purchaseUnits: options.purchaseUnits,
          },
        },
      },
    })
    .then(function (response) {
      analytics.sendEvent(
        self._client,
        "payment-ready.get-customer-recommendations.succeeded"
      );

      return response.data.generateCustomerRecommendations;
    })
    .catch(function (err) {
      analytics.sendEvent(
        self._client,
        "payment-ready.get-customer-recommendations.failed"
      );

      return Promise.reject(
        new BraintreeError({
          type: err.type || errors.PAYMENT_READY_GET_RECOMMENDATIONS_ERROR.type,
          code: err.code || errors.PAYMENT_READY_GET_RECOMMENDATIONS_ERROR.code,
          message:
            err.message ||
            errors.PAYMENT_READY_GET_RECOMMENDATIONS_ERROR.message,
          details: { originalError: err },
        })
      );
    });
};

/**
 * Call this method when a payment button has been successfully displayed to the buyer.
 * This method sends analytics to help improve the Shopper Insights feature experience.
 *
 * @public
 * @param {object} options - The options for the event.
 * @param {string} options.buttonType Type of button presented to the user.
 * @param {string} options.paymentReadySessionId - The id of paymentReady session created with createCustomerSession method.
 * @param {object} [options.presentmentDetails] Details of presentment. Includes experimentType, pageType, and buttonOrder.
 * @param {PaymentReady~EXPERIMENT_TYPE} [options.presentmentDetails.experimentType] Experiment type being used.
 * @param {PaymentReady~PAGE_TYPE} [options.presentmentDetails.pageType] Page type where the SDK is being used.
 * @param {PaymentReady~BUTTON_ORDER} [options.presentmentDetails.buttonOrder] Where in the list of buttons this button was presented.
 *
 * @example
 * paymentReadyInstance.sendPresentedEvent({
 *   buttonType: "paypal",
 *   paymentReadySessionId: "SESSION_ID_123",
 *   presentmentDetails: {
 *     experimentType: "control",
 *     pageType: "checkout",
 *     buttonOrder: "second"
 * });
 * @returns {void} This method does not return any value.
 */
PaymentReady.prototype.sendPresentedEvent = function (options) {
  var experimentType = options.presentmentDetails
    ? options.presentmentDetails.experimentType
    : null;
  var pageType = options.presentmentDetails
    ? options.presentmentDetails.pageType
    : null;
  var buttonOrder = options.presentmentDetails
    ? options.presentmentDetails.buttonOrder
    : null;

  if (
    !options.paymentReadySessionId ||
    typeof options.paymentReadySessionId !== "string"
  ) {
    // eslint-disable-next-line no-console
    console.warn(
      "sendPresentedEvent: paymentReadySessionId is missing or invalid"
    );

    return;
  }

  if (!options.buttonType || typeof options.buttonType !== "string") {
    // eslint-disable-next-line no-console
    console.warn("sendPresentedEvent: buttonType is missing");

    return;
  }

  var buttonSelected = options.buttonType;
  var presentAnalyticFields;

  if (!Object.values(constants.BUTTON_TYPE).includes(buttonSelected)) {
    buttonSelected = constants.BUTTON_TYPE.OTHER;
  }

  if (
    buttonOrder &&
    !Object.values(constants.BUTTON_ORDER).includes(buttonOrder)
  ) {
    buttonOrder = constants.BUTTON_ORDER.OTHER;
  }

  if (
    experimentType &&
    !Object.values(constants.EXPERIMENT_TYPE).includes(experimentType)
  ) {
    experimentType = constants.EXPERIMENT_TYPE.TEST;
  }

  if (pageType && !Object.values(constants.PAGE_TYPE).includes(pageType)) {
    pageType = constants.PAGE_TYPE.OTHER;
  }

  presentAnalyticFields = buildPresentmentAnalyticFields({
    buttonOrder: buttonOrder,
    buttonType: buttonSelected,
    experimentType: experimentType,
    pageType: pageType,
    sessionId: options.paymentReadySessionId,
  });

  analytics.sendEventPlus(
    this._client,
    constants.EVENT_BUTTON_PRESENTED,
    presentAnalyticFields
  );
};

function buildPresentmentAnalyticFields(options) {
  var pkg = {
    // eslint-disable-next-line camelcase
    button_type: options.buttonType,
    // eslint-disable-next-line camelcase
    payment_ready_session_id: options.sessionId,
  };
  if (options.buttonOrder) {
    pkg["payment_ready_button_order"] = options.buttonOrder;
  }
  if (options.experimentType) {
    pkg["payment_ready_experiment_type"] = options.experimentType;
  }
  if (options.pageType) {
    pkg["payment_ready_page_type"] = options.pageType;
  }

  return pkg;
}
/**
 * Use PayPal Payment Ready to optimize your checkout experience by sending analytics events.
 *
 * @public
 * @param {object} options - The options for the event
 * @param {string} options.paymentReadySessionId - The ID of the session to update.
 * @param {PaymentReady~BUTTON_TYPE} options.buttonType Type of button presented to the user.
 * @returns {void}
 * @example
 * <caption>Sending analytics event</caption>
 * paymentReadyInstance.sendSelectedEvent({
 *   paymentReadySessionId: "session-abc-123",
 *   buttonType: "paypal"
 * });
 */
PaymentReady.prototype.sendSelectedEvent = function (options) {
  if (
    !options.paymentReadySessionId ||
    typeof options.paymentReadySessionId !== "string"
  ) {
    // eslint-disable-next-line no-console
    console.warn(
      "sendSelectedEvent: paymentReadySessionId is missing or invalid"
    );

    return;
  }
  if (!options.buttonType || typeof options.buttonType !== "string") {
    // eslint-disable-next-line no-console
    console.warn("sendSelectedEvent: buttonType is missing");

    return;
  }

  var buttonSelected = options.buttonType;

  if (!Object.values(constants.BUTTON_TYPE).includes(buttonSelected)) {
    buttonSelected = constants.BUTTON_TYPE.OTHER;
  }

  analytics.sendEventPlus(this._client, constants.EVENT_BUTTON_SELECTED, {
    // eslint-disable-next-line camelcase
    payment_ready_session_id: options.paymentReadySessionId,
    // eslint-disable-next-line camelcase
    button_type: buttonSelected,
  });
};

module.exports = wrapPromise.wrapPrototype(PaymentReady);
