"use strict";

var enumerate = require("../../lib/enumerate");
var errors = require("./errors");

var constants = {};

constants.events = enumerate(
  [
    "CAN_MAKE_PAYMENT",
    "FRAME_READY",
    "FRAME_CAN_MAKE_REQUESTS",
    "PAYMENT_REQUEST_INITIALIZED",
    "SHIPPING_ADDRESS_CHANGE",
    "UPDATE_SHIPPING_ADDRESS",
    "SHIPPING_OPTION_CHANGE",
    "UPDATE_SHIPPING_OPTION",
  ],
  "payment-request:"
);

constants.errors = errors;

constants.SUPPORTED_METHODS = {
  "basic-card": true,
  "https://google.com/pay": true,
};

module.exports = constants;
