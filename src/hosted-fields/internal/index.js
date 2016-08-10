'use strict';

var Bus = require('../../lib/bus');
var frameName = require('./get-frame-name');
var assembleIFrames = require('./assemble-iframes');
var Client = require('../../client/client');
var injectWithWhitelist = require('inject-stylesheet').injectWithWhitelist;
var CreditCardForm = require('./models/credit-card-form').CreditCardForm;
var FieldComponent = require('./components/field-component').FieldComponent;
var normalizeCreditCardFields = require('../../lib/normalize-credit-card-fields').normalizeCreditCardFields;
var analytics = require('../../lib/analytics');
var BraintreeError = require('../../lib/error');
var constants = require('../shared/constants');
var errors = require('../shared/errors');
var assign = require('../../lib/assign').assign;
var events = constants.events;
var whitelistedStyles = constants.whitelistedStyles;

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
  if (global.placeholderShim) {
    global.placeholderShim(document.querySelector('input'));
  }
}

function create() {
  var componentId = location.hash.slice(1, location.hash.length);

  global.bus = new Bus({channel: componentId});

  global.bus.emit(events.FRAME_READY, orchestrate);
}

function createTokenizationHandler(client, cardForm) {
  return function (options, reply) {
    var creditCardDetails, error;
    var isEmpty = cardForm.isEmpty();
    var invalidFieldKeys = cardForm.invalidFieldKeys();
    var isValid = invalidFieldKeys.length === 0;

    if (isEmpty) {
      reply([new BraintreeError(errors.HOSTED_FIELDS_FIELDS_EMPTY)]);
    } else if (isValid) {
      creditCardDetails = normalizeCreditCardFields(cardForm.getCardData());

      options = options || {};
      creditCardDetails.options = {
        validate: options.vault === true
      };

      client.request({
        method: 'post',
        endpoint: 'payment_methods/credit_cards',
        data: {
          _meta: {
            source: 'hosted-fields'
          },
          creditCard: creditCardDetails
        }
      }, function (err, response, status) {
        var tokenizedCard;

        if (err) {
          if (status < 500) {
            error = errors.HOSTED_FIELDS_FAILED_TOKENIZATION;
          } else {
            error = errors.HOSTED_FIELDS_TOKENIZATION_NETWORK_ERROR;
          }
          error = assign({}, error, {
            details: {originalError: err}
          });

          reply([new BraintreeError(error)]);

          analytics.sendEvent(client, 'web.custom.hosted-fields.tokenization.failed');
          return;
        }

        tokenizedCard = {
          nonce: response.creditCards[0].nonce,
          details: response.creditCards[0].details,
          description: response.creditCards[0].description,
          type: response.creditCards[0].type
        };

        reply([null, tokenizedCard]);

        analytics.sendEvent(client, 'web.custom.hosted-fields.tokenization.succeeded');
      });
    } else {
      reply([new BraintreeError({
        type: errors.HOSTED_FIELDS_FIELDS_INVALID.type,
        code: errors.HOSTED_FIELDS_FIELDS_INVALID.code,
        message: errors.HOSTED_FIELDS_FIELDS_INVALID.message,
        details: {invalidFieldKeys: invalidFieldKeys}
      })]);
    }
  };
}

function orchestrate(configuration) {
  var client = new Client(configuration.client);
  var cardForm = new CreditCardForm(configuration);
  var iframes = assembleIFrames.assembleIFrames(window.parent);

  iframes.forEach(function (iframe) {
    iframe.braintree.hostedFields.initialize(cardForm);
  });

  analytics.sendEvent(client, 'web.custom.hosted-fields.load.succeeded');

  global.bus.on(events.TOKENIZATION_REQUEST, function (options, reply) {
    var tokenizationHandler = createTokenizationHandler(client, cardForm);

    tokenizationHandler(options, reply);
  });

  // Globalize cardForm is global so other components (UnionPay) can access it
  global.cardForm = cardForm;
}

module.exports = {
  initialize: initialize,
  create: create,
  createTokenizationHandler: createTokenizationHandler
};
