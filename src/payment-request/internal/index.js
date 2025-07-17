"use strict";

var assign = require("../../lib/assign").assign;
var Bus = require("framebus");
var constants = require("../shared/constants");
var clone = require("../../lib/json-clone");
var Client = require("../../client/client");

function create() {
  var componentId = window.location.hash.slice(1, window.location.hash.length);

  window.bus = new Bus({ channel: componentId });

  window.bus.on(
    constants.events.PAYMENT_REQUEST_INITIALIZED,
    initializePaymentRequest
  );

  window.bus.on(constants.events.CAN_MAKE_PAYMENT, canMakePayment);

  window.bus.emit(constants.events.FRAME_READY, function (response) {
    window.client = new Client(response);
    window.bus.emit(constants.events.FRAME_CAN_MAKE_REQUESTS);
  });

  window.bus.on(constants.events.UPDATE_SHIPPING_ADDRESS, function (data) {
    if (window.shippingAddressChangeResolveFunction) {
      window.shippingAddressChangeResolveFunction(data);
    }
  });

  window.bus.on(constants.events.UPDATE_SHIPPING_OPTION, function (data) {
    if (window.shippingOptionChangeResolveFunction) {
      window.shippingOptionChangeResolveFunction(data);
    }
  });
}

function makePaymentRequest(data) {
  var paymentRequest;

  try {
    paymentRequest = new window.PaymentRequest(
      data.supportedPaymentMethods,
      data.details,
      data.options
    );
  } catch (err) {
    return Promise.reject({
      name: "PAYMENT_REQUEST_INITIALIZATION_FAILED",
      message: err.message,
      code: err.code,
    });
  }

  return Promise.resolve(paymentRequest);
}

function canMakePayment(data, reply) {
  return makePaymentRequest(data)
    .then(function (paymentRequest) {
      return paymentRequest.canMakePayment();
    })
    .then(function (result) {
      reply([null, result]);
    })
    .catch(function (err) {
      reply([
        {
          code: err.code,
          name: err.name,
          message: err.message,
        },
      ]);
    });
}

function initializePaymentRequest(data, reply) {
  var paymentResponse;

  return makePaymentRequest(data)
    .then(function (paymentRequest) {
      if (data.options && data.options.requestShipping) {
        paymentRequest.addEventListener(
          "shippingaddresschange",
          function (event) {
            event.updateWith(
              new Promise(function (resolve) {
                window.shippingAddressChangeResolveFunction = resolve;
              })
            );

            window.bus.emit(
              constants.events.SHIPPING_ADDRESS_CHANGE,
              event.target.shippingAddress
            );
          }
        );

        paymentRequest.addEventListener(
          "shippingoptionchange",
          function (event) {
            event.updateWith(
              new Promise(function (resolve) {
                window.shippingOptionChangeResolveFunction = resolve;
              })
            );

            window.bus.emit(
              constants.events.SHIPPING_OPTION_CHANGE,
              event.target.shippingOption
            );
          }
        );
      }

      return paymentRequest.show().then(function (response) {
        paymentResponse = response;

        return paymentResponse;
      });
    })
    .then(tokenize)
    .then(function (payload) {
      var rawPaymentResponse = clone(paymentResponse);
      var billingAddress = rawPaymentResponse.details.billingAddress;
      var cardholderName = rawPaymentResponse.details.cardholderName;

      // we overwrite the details object so credit card information
      // is not exposed back to the merchant
      rawPaymentResponse.details = {};

      if (billingAddress) {
        rawPaymentResponse.details.billingAddress = billingAddress;
      }
      if (cardholderName) {
        rawPaymentResponse.details.cardholderName = cardholderName;
      }

      payload.details.rawPaymentResponse = rawPaymentResponse;

      reply([null, payload]);
    })
    .catch(function (err) {
      reply([
        {
          code: err.code,
          message: err.message,
          name: err.name,
        },
      ]);
    })
    .then(function () {
      delete window.shippingAddressChangeResolveFunction;
      delete window.shippingOptionChangeResolveFunction;

      if (paymentResponse) {
        paymentResponse.complete();
      }
    });
}

function tokenize(paymentResponse) {
  var parsedResponse;

  if (paymentResponse.methodName === "basic-card") {
    return window.client
      .request({
        endpoint: "payment_methods/credit_cards",
        method: "post",
        data: formatPaymentResponse(paymentResponse),
      })
      .then(function (response) {
        var tokenizedCard = response.creditCards[0];

        return tokenizedCard;
      });
  }
  if (paymentResponse.methodName === "https://google.com/pay") {
    try {
      parsedResponse = JSON.parse(
        paymentResponse.details.paymentMethodToken.token
      );

      if (parsedResponse.error) {
        return Promise.reject({
          name: "BRAINTREE_GATEWAY_GOOGLE_PAYMENT_TOKENIZATION_ERROR",
          error: parsedResponse.error,
        });
      }

      return parsedResponse.androidPayCards[0];
    } catch (err) {
      return Promise.reject({
        name: "BRAINTREE_GATEWAY_GOOGLE_PAYMENT_PARSING_ERROR",
        error: err,
      });
    }
  }

  return Promise.reject({
    name: "UNSUPPORTED_METHOD_NAME",
  });
}

function formatPaymentResponse(rawPaymentResponse) {
  var billingAddress;
  var data = {
    creditCard: {
      number: rawPaymentResponse.details.cardNumber,
      cardholderName: rawPaymentResponse.details.cardholderName,
      expirationMonth: rawPaymentResponse.details.expiryMonth,
      expirationYear: rawPaymentResponse.details.expiryYear,
      cvv: rawPaymentResponse.details.cardSecurityCode,
    },
  };

  billingAddress = rawPaymentResponse.details.billingAddress;

  if (billingAddress) {
    data.creditCard = assign(data.creditCard, {
      billingAddress: {
        company: billingAddress.organization,
        locality: billingAddress.city,
        region: billingAddress.region,
        postalCode: billingAddress.postalCode,
        streetAddress: billingAddress.addressLine[0],
        extendedAddress: billingAddress.addressLine[1],
        countryCodeAlpha2: billingAddress.country,
      },
    });
  }

  return data;
}

module.exports = {
  create: create,
  initializePaymentRequest: initializePaymentRequest,
  canMakePayment: canMakePayment,
};
