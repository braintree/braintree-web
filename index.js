'use strict';

var client = require('./client');
var paypal = require('./paypal');
var hostedFields = require('./hosted-fields');
var dataCollector = require('./data-collector');
var americanExpress = require('./american-express');
var unionpay = require('./unionpay');
var packageVersion = require('./package.json').version;

module.exports = {
  client: client,
  paypal: paypal,
  hostedFields: hostedFields,
  dataCollector: dataCollector,
  americanExpress: americanExpress,
  unionpay: unionpay,
  VERSION: packageVersion
};
