"use strict";

/**
 * @ignore
 * @static
 * @function hasMissingOption
 * @param {object} options All options provided for validating required properties.
 * @param {array} required A list of required inputs that must be included as part of the options.
 * @returns {boolean} Returns `true` if any required option is missing, `false` otherwise.
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
