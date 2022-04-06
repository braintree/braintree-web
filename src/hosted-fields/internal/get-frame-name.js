"use strict";

module.exports = {
  getFrameName: function getFrameName() {
    return window.name.replace("braintree-hosted-field-", "");
  },
};
