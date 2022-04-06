"use strict";

var enumerate = require("../../lib/enumerate");

module.exports = {
  events: enumerate(
    [
      "HOSTED_FIELDS_FETCH_CAPABILITIES",
      "HOSTED_FIELDS_ENROLL",
      "HOSTED_FIELDS_TOKENIZE",
    ],
    "union-pay:"
  ),
  HOSTED_FIELDS_FRAME_NAME: "braintreeunionpayhostedfields",
};
