"use strict";

var BraintreeError = require("../../lib/braintree-error");
var Bus = require("framebus");
var Client = require("../../client/client");
var constants = require("../shared/constants");
var errors = require("../shared/errors");
var events = constants.events;
var getHostedFieldsCardForm = require("./get-hosted-fields-cardform");
var UnionPay = require("../shared/unionpay");
var BUS_CONFIGURATION_REQUEST_EVENT =
  require("../../lib/constants").BUS_CONFIGURATION_REQUEST_EVENT;

function create() {
  window.bus = new Bus({
    channel: getFrameName(),
  });

  window.bus.emit(BUS_CONFIGURATION_REQUEST_EVENT, initialize);
}

function initialize(clientConfiguration) {
  var client = new Client(clientConfiguration);
  var unionpay = new UnionPay({ client: client });

  window.bus.on(
    events.HOSTED_FIELDS_FETCH_CAPABILITIES,
    function (options, reply) {
      var hostedFieldsNumber;
      var hostedFieldsCardForm = getHostedFieldsCardForm.get(
        client,
        options.hostedFields
      );

      if (hostedFieldsCardForm) {
        hostedFieldsNumber = hostedFieldsCardForm.get("number.value");

        unionpay.fetchCapabilities(
          {
            card: {
              number: hostedFieldsNumber,
            },
          },
          function (err, payload) {
            reply({
              err: err,
              payload: payload,
            });
          }
        );
      } else {
        reply({
          err: new BraintreeError(
            errors.UNIONPAY_HOSTED_FIELDS_INSTANCE_REQUIRED
          ),
        });
      }
    }
  );

  window.bus.on(events.HOSTED_FIELDS_ENROLL, function (options, reply) {
    var hostedFieldsCardData;
    var hostedFieldsCardForm = getHostedFieldsCardForm.get(
      client,
      options.hostedFields
    );

    if (hostedFieldsCardForm) {
      hostedFieldsCardData = hostedFieldsCardForm.getCardData();

      unionpay.enroll(
        {
          card: {
            number: hostedFieldsCardData.number,
            expirationMonth: hostedFieldsCardData.expirationMonth,
            expirationYear: hostedFieldsCardData.expirationYear,
          },
          mobile: {
            countryCode: options.mobile.countryCode,
            number: options.mobile.number,
          },
        },
        function (err, payload) {
          reply({
            err: err,
            payload: payload,
          });
        }
      );
    } else {
      reply({
        err: new BraintreeError(
          errors.UNIONPAY_HOSTED_FIELDS_INSTANCE_REQUIRED
        ),
      });
    }
  });

  window.bus.on(events.HOSTED_FIELDS_TOKENIZE, function (options, reply) {
    var hostedFieldsCardData;
    var hostedFieldsCardForm = getHostedFieldsCardForm.get(
      client,
      options.hostedFields
    );

    if (hostedFieldsCardForm) {
      hostedFieldsCardData = hostedFieldsCardForm.getCardData();

      unionpay.tokenize(
        {
          card: {
            number: hostedFieldsCardData.number,
            expirationMonth: hostedFieldsCardData.expirationMonth,
            expirationYear: hostedFieldsCardData.expirationYear,
            cvv: hostedFieldsCardData.cvv,
          },
          enrollmentId: options.enrollmentId,
          smsCode: options.smsCode,
          vault: options.vault === true,
        },
        function (err, payload) {
          reply({
            err: err,
            payload: payload,
          });
        }
      );
    } else {
      reply({
        err: new BraintreeError(
          errors.UNIONPAY_HOSTED_FIELDS_INSTANCE_REQUIRED
        ),
      });
    }
  });
}

function getFrameName() {
  return window.name.split("_")[1].split("?")[0];
}

module.exports = {
  create: create,
};
