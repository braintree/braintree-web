'use strict';

var client = require('./client.debug');
var paypal = require('./paypal.debug');
var hostedFields = require('./hosted-fields.debug');
var dataCollector = require('./data-collector.debug');
var americanExpress = require('./american-express.debug');
var unionpay = require('./unionpay.debug');

module.exports = {
  client: client,
  paypal: paypal,
  hostedFields: hostedFields,
  dataCollector: dataCollector,
  americanExpress: americanExpress,
  unionpay: unionpay,
  VERSION: "3.0.0-beta.9"
};
