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
  return function (reply) {
    var creditCardDetails;
    var isEmpty = cardForm.isEmpty();
    var invalidFieldKeys = cardForm.invalidFieldKeys();
    var isValid = invalidFieldKeys.length === 0;

    if (isEmpty) {
      reply([new BraintreeError({
        type: BraintreeError.types.CUSTOMER,
        message: 'All fields are empty. Cannot tokenize empty card fields.'
      })]);
    } else if (isValid) {
      creditCardDetails = normalizeCreditCardFields(cardForm.getCardData());

      creditCardDetails.options = {
        validate: false
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
            reply([new BraintreeError({
              type: BraintreeError.types.CUSTOMER,
              message: 'The supplied card data failed tokenization.',
              details: {
                originalError: err
              }
            })]);
          } else {
            reply([new BraintreeError({
              type: BraintreeError.types.NETWORK,
              message: 'A tokenization network error occurred.',
              details: {
                originalError: err
              }
            })]);
          }

          analytics.sendEvent(client, 'web.custom.hosted-fields.tokenization.failed');
          return;
        }

        tokenizedCard = response.creditCards[0];

        delete tokenizedCard.consumed;
        delete tokenizedCard.threeDSecureInfo;
        delete tokenizedCard.type;

        reply([null, tokenizedCard]);

        analytics.sendEvent(client, 'web.custom.hosted-fields.tokenization.succeeded');
      });
    } else {
      cardForm.strictValidate();

      reply([new BraintreeError({
        type: BraintreeError.types.CUSTOMER,
        message: 'Some payment input fields are invalid. Cannot tokenize invalid card fields.',
        details: {
          invalidFieldKeys: invalidFieldKeys
        }
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

  global.bus.on(events.TOKENIZATION_REQUEST, createTokenizationHandler(client, cardForm));
  global.bus.on(events.VALIDATE_STRICT, function () {
    cardForm.strictValidate();
  });

  // Globalize cardForm is global so other components (UnionPay) can access it
  global.cardForm = cardForm;
}

module.exports = {
  initialize: initialize,
  create: create,
  createTokenizationHandler: createTokenizationHandler
};
