'use strict';

var BraintreeError = require('../../lib/error');
var Bus = require('../../lib/bus');
var Client = require('../../client/client');
var constants = require('../shared/constants');
var errors = require('../shared/errors');
var events = constants.events;
var getHostedFieldsCardForm = require('./get-hosted-fields-cardform');
var UnionPay = require('../shared/unionpay');

function create() {
  global.bus = new Bus({
    channel: getFrameName()
  });

  global.bus.emit(Bus.events.CONFIGURATION_REQUEST, initialize);
}

function initialize(clientConfiguration) {
  var client = new Client(clientConfiguration);
  var unionpay = new UnionPay({client: client});

  global.bus.on(events.HOSTED_FIELDS_FETCH_CAPABILITIES, function (options, reply) {
    var hostedFieldsNumber;
    var hostedFieldsCardForm = getHostedFieldsCardForm.get(client, options.hostedFields);

    if (hostedFieldsCardForm) {
      hostedFieldsNumber = hostedFieldsCardForm.get('number.value');

      unionpay.fetchCapabilities({
        card: {
          number: hostedFieldsNumber
        }
      }, function (err, payload) {
        reply({
          err: err,
          payload: payload
        });
      });
    } else {
      reply({
        err: new BraintreeError(errors.UNIONPAY_HOSTED_FIELDS_INSTANCE_REQUIRED)
      });
    }
  });

  global.bus.on(events.HOSTED_FIELDS_ENROLL, function (options, reply) {
    var hostedFieldsCardData;
    var hostedFieldsCardForm = getHostedFieldsCardForm.get(client, options.hostedFields);

    if (hostedFieldsCardForm) {
      hostedFieldsCardData = hostedFieldsCardForm.getCardData();

      unionpay.enroll({
        card: {
          number: hostedFieldsCardData.number,
          expirationMonth: hostedFieldsCardData.expirationMonth,
          expirationYear: hostedFieldsCardData.expirationYear
        },
        mobile: {
          countryCode: options.mobile.countryCode,
          number: options.mobile.number
        }
      }, function (err, payload) {
        reply({
          err: err,
          payload: payload
        });
      });
    } else {
      reply({
        err: new BraintreeError(errors.UNIONPAY_HOSTED_FIELDS_INSTANCE_REQUIRED)
      });
    }
  });

  global.bus.on(events.HOSTED_FIELDS_TOKENIZE, function (options, reply) {
    var hostedFieldsCardData;
    var hostedFieldsCardForm = getHostedFieldsCardForm.get(client, options.hostedFields);

    if (hostedFieldsCardForm) {
      hostedFieldsCardData = hostedFieldsCardForm.getCardData();

      unionpay.tokenize({
        card: {
          number: hostedFieldsCardData.number,
          expirationMonth: hostedFieldsCardData.expirationMonth,
          expirationYear: hostedFieldsCardData.expirationYear,
          cvv: hostedFieldsCardData.cvv
        },
        enrollmentId: options.enrollmentId,
        smsCode: options.smsCode,
        vault: options.vault === true
      }, function (err, payload) {
        reply({
          err: err,
          payload: payload
        });
      });
    } else {
      reply({
        err: new BraintreeError(errors.UNIONPAY_HOSTED_FIELDS_INSTANCE_REQUIRED)
      });
    }
  });
}

function getFrameName() {
  return global.name.split('_')[1];
}

module.exports = {
  create: create
};
