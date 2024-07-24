"use strict";

module.exports = function (creditCardDetails) {
  return (
    creditCardDetails &&
    creditCardDetails.hasOwnProperty("fastlane") &&
    creditCardDetails.fastlane
  );
};
