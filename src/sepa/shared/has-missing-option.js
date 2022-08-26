"use strict";

/**
 * @ignore
 * @static
 * @function hasMissingOption
 * @param {object} options All options provided for intiating the SEPA payment flow.
 * @param {array} required A list of required inputs that must be include as part of the options.
 * @returns {boolean} Returns a boolean.
 */
function hasMissingOption(options, required) {
  var i, option;

  required = required || [];

  for (i = 0; i < required.length; i++) {
    option = required[i];

    if (!options.hasOwnProperty(option)) {
      return true;
    }
  }

  return false;
}

module.exports = hasMissingOption;
