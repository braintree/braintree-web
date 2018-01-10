'use strict';

var assign = require('../../lib/assign').assign;
var Bus = require('../../lib/bus');
var constants = require('../shared/constants');
var clone = require('../../lib/json-clone');
var Client = require('../../client/client');
var Promise = require('../../lib/promise');

function create() {
  var componentId = global.location.hash.slice(1, global.location.hash.length);

  global.bus = new Bus({channel: componentId});

  global.bus.on(constants.events.PAYMENT_REQUEST_INITIALIZED, initializePaymentRequest);

  global.bus.emit(constants.events.FRAME_READY, function (response) {
    global.client = new Client(response);
    global.bus.emit(constants.events.FRAME_CAN_MAKE_REQUESTS);
  });

  global.bus.on(constants.events.UPDATE_SHIPPING_ADDRESS, function (data) {
    if (global.shippingAddressChangeEvent) {
      global.shippingAddressChangeEvent.updateWith(data);
    }
  });

  global.bus.on(constants.events.UPDATE_SHIPPING_OPTION, function (data) {
    if (global.shippingOptionChangeEvent) {
      global.shippingOptionChangeEvent.updateWith(data);
    }
  });
}

function initializePaymentRequest(data) {
  var paymentRequest, paymentResponse;

  try {
    paymentRequest = new PaymentRequest(data.supportedPaymentMethods, data.details, data.options); // eslint-disable-line no-undef
  } catch (err) {
    global.bus.emit(constants.events.PAYMENT_REQUEST_FAILED, {
      name: 'PAYMENT_REQUEST_INITIALIZATION_FAILED'
    });

    return Promise.resolve();
  }

  if (data.options && data.options.requestShipping) {
    paymentRequest.addEventListener('shippingaddresschange', function (event) {
      global.shippingAddressChangeEvent = event;
      global.bus.emit(constants.events.SHIPPING_ADDRESS_CHANGE, event.target.shippingAddress);
    });

    paymentRequest.addEventListener('shippingoptionchange', function (event) {
      global.shippingOptionChangeEvent = event;
      global.bus.emit(constants.events.SHIPPING_OPTION_CHANGE, event.target.shippingOption);
    });
  }

  return paymentRequest.show().then(function (response) {
    paymentResponse = response;

    return paymentResponse;
  }).then(tokenize).then(function (payload) {
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

    global.bus.emit(constants.events.PAYMENT_REQUEST_SUCCESSFUL, payload);
  }).catch(function (err) {
    global.bus.emit(constants.events.PAYMENT_REQUEST_FAILED, err);
  }).then(function () {
    delete global.shippingAddressChangeEvent;
    delete global.shippingOptionChangeEvent;

    if (paymentResponse) {
      paymentResponse.complete();
    }
  });
}

function tokenize(paymentResponse) {
  var parsedResponse;

  if (paymentResponse.methodName === 'basic-card') {
    return global.client.request({
      endpoint: 'payment_methods/credit_cards',
      method: 'post',
      data: formatPaymentResponse(paymentResponse)
    }).then(function (response) {
      var tokenizedCard = response.creditCards[0];

      return tokenizedCard;
    });
  } else if (paymentResponse.methodName === 'https://google.com/pay') {
    try {
      parsedResponse = JSON.parse(paymentResponse.details.paymentMethodToken.token);

      if (parsedResponse.error) {
        return Promise.reject({
          name: 'BRAINTREE_GATEWAY_GOOGLE_PAYMENT_TOKENIZATION_ERROR',
          error: parsedResponse.error
        });
      }

      return parsedResponse.androidPayCards[0];
    } catch (err) {
      return Promise.reject({
        name: 'BRAINTREE_GATEWAY_GOOGLE_PAYMENT_PARSING_ERROR',
        error: err
      });
    }
  }

  return Promise.reject({
    name: 'UNSUPPORTED_METHOD_NAME'
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
      cvv: rawPaymentResponse.details.cardSecurityCode
    }
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
        countryCodeAlpha2: billingAddress.country
      }
    });
  }

  return data;
}

module.exports = {
  create: create,
  initializePaymentRequest: initializePaymentRequest
};
