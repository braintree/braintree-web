'use strict';

var assign = require('../../lib/assign').assign;
var Bus = require('../../lib/bus');
var frameName = require('./get-frame-name');
var assembleIFrames = require('./assemble-iframes');
var Client = require('../../client/client');
var injectWithWhitelist = require('inject-stylesheet').injectWithWhitelist;
var CreditCardForm = require('./models/credit-card-form').CreditCardForm;
var FieldComponent = require('./components/field-component').FieldComponent;
var analytics = require('../../lib/analytics');
var BraintreeError = require('../../lib/braintree-error');
var constants = require('../shared/constants');
var errors = require('../shared/errors');
var sharedErrors = require('../../lib/errors');
var Promise = require('../../lib/promise');
var events = constants.events;
var whitelistedStyles = constants.whitelistedStyles;
var formatCardRequestData = require('./format-card-request-data');
var formatBraintreeApiCardResponse = require('./format-braintree-api-card-response');

function initialize(cardForm) {
  var fieldComponent;

  injectWithWhitelist(
    cardForm.configuration.styles,
    whitelistedStyles
  );

  fieldComponent = new FieldComponent({
    cardForm: cardForm,
    type: frameName.getFrameName()
  });

  document.body.appendChild(fieldComponent.element);
  shimPlaceholder();
}

function shimPlaceholder() {
  var input;

  if (!global.placeholderShim) { return; }

  input = document.querySelector('input');
  if (!input) { return; }

  global.placeholderShim(input);
}

function create() {
  var componentId = location.hash.slice(1, location.hash.length);

  global.bus = new Bus({channel: componentId});

  global.bus.emit(events.FRAME_READY, orchestrate);
}

function createTokenizationHandler(client, cardForm) {
  var supportedGateways = client.getConfiguration().gatewayConfiguration.creditCards.supportedGateways || [{
    name: 'clientApi'
  }];
  var braintreeApiCreditCardConfiguration = supportedGateways.filter(function (gateway) {
    return gateway.name === 'braintreeApi';
  })[0];

  return function (options, reply) {
    var braintreeApiRequest, clientApiRequest, gateways, mergedCardData, requests, shouldRequestBraintreeApi;
    var isEmpty = cardForm.isEmpty();
    var invalidFieldKeys = cardForm.invalidFieldKeys();
    var isValid = invalidFieldKeys.length === 0;

    if (isEmpty) {
      reply([new BraintreeError(errors.HOSTED_FIELDS_FIELDS_EMPTY)]);
      return;
    } else if (!isValid) {
      reply([new BraintreeError({
        type: errors.HOSTED_FIELDS_FIELDS_INVALID.type,
        code: errors.HOSTED_FIELDS_FIELDS_INVALID.code,
        message: errors.HOSTED_FIELDS_FIELDS_INVALID.message,
        details: {invalidFieldKeys: invalidFieldKeys}
      })]);
      return;
    }

    options = options || {};
    gateways = options.gateways || {clientApi: true};

    if (!gateways.clientApi) {
      reply([new BraintreeError({
        type: sharedErrors.INVALID_OPTION.type,
        code: sharedErrors.INVALID_OPTION.code,
        message: 'options.gateways is invalid.'
      })]);
      return;
    }

    mergedCardData = mergeCardData(cardForm.getCardData(), options);

    clientApiRequest = Promise.resolve().then(function () {
      var creditCardDetails = formatCardRequestData(mergedCardData);

      creditCardDetails.options = {
        validate: options.vault === true
      };

      return client.request({
        api: 'clientApi',
        method: 'post',
        endpoint: 'payment_methods/credit_cards',
        data: {
          _meta: {
            source: 'hosted-fields'
          },
          creditCard: creditCardDetails
        }
      }).catch(function (err) {
        return err;
      });
    });

    requests = [clientApiRequest];

    shouldRequestBraintreeApi = gateways.braintreeApi && Boolean(braintreeApiCreditCardConfiguration);
    if (shouldRequestBraintreeApi) {
      braintreeApiRequest = Promise.resolve().then(function () {
        var data = formatCardRequestData(mergedCardData);

        data.type = 'credit_card';

        return client.request({
          api: 'braintreeApi',
          endpoint: 'tokens',
          method: 'post',
          data: data,
          timeout: braintreeApiCreditCardConfiguration.timeout
        }).catch(function (err) {
          return err;
        });
      });

      requests.push(braintreeApiRequest);
    }

    Promise.all(requests).then(function (results) {
      var err, result, clientApiCreditCard, status;
      var clientApiResult = results[0];
      var braintreeApiResult = results[1];
      var clientApiSucceeded = !(clientApiResult instanceof Error);
      var braintreeApiSucceeded = !(braintreeApiResult instanceof Error);

      if (!clientApiSucceeded && (!braintreeApiResult || !braintreeApiSucceeded)) {
        status = clientApiResult.details && clientApiResult.details.httpStatus;

        if (status === 403) {
          err = clientApiResult;
        } else if (status < 500) {
          err = new BraintreeError(errors.HOSTED_FIELDS_FAILED_TOKENIZATION);
          err.details = {originalError: clientApiResult};
        } else {
          err = new BraintreeError(errors.HOSTED_FIELDS_TOKENIZATION_NETWORK_ERROR);
          err.details = {originalError: clientApiResult};
        }

        analytics.sendEvent(client, 'custom.hosted-fields.tokenization.failed');

        reply([err]);

        return;
      }

      result = {};

      if (braintreeApiResult && braintreeApiSucceeded) {
        result = formatBraintreeApiCardResponse(braintreeApiResult);

        analytics.sendEvent(client, 'custom.hosted-fields.braintree-api.tokenization.succeeded');
      }

      if (clientApiSucceeded) {
        clientApiCreditCard = clientApiResult.creditCards[0];
        result.nonce = clientApiCreditCard.nonce;
        result.details = clientApiCreditCard.details;
        result.description = clientApiCreditCard.description;
        result.type = clientApiCreditCard.type;
      }

      analytics.sendEvent(client, 'custom.hosted-fields.tokenization.succeeded');

      reply([null, result]);
    });
  };
}

function orchestrate(configuration) {
  var client = new Client(configuration.client);
  var cardForm = new CreditCardForm(configuration);
  var iframes = assembleIFrames.assembleIFrames(window.parent);

  iframes.forEach(function (iframe) {
    iframe.braintree.hostedFields.initialize(cardForm);
  });

  analytics.sendEvent(client, 'custom.hosted-fields.load.succeeded');

  global.bus.on(events.TOKENIZATION_REQUEST, function (options, reply) {
    var tokenizationHandler = createTokenizationHandler(client, cardForm);

    tokenizationHandler(options, reply);
  });

  // Globalize cardForm is global so other components (UnionPay) can access it
  global.cardForm = cardForm;
}

function mergeCardData(cardData, options) {
  var newCardData = cardData;
  var postalCode = options.billingAddress && options.billingAddress.postalCode;

  if (postalCode && !cardData.hasOwnProperty('postalCode')) {
    newCardData = assign({}, newCardData, {postalCode: postalCode});
  }

  return newCardData;
}

module.exports = {
  initialize: initialize,
  create: create,
  createTokenizationHandler: createTokenizationHandler
};
