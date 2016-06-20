'use strict';

function normalizeCreditCardFields(attrs) {
  var key;
  var creditCard = {
    billingAddress: attrs.billingAddress || {}
  };

  for (key in attrs) {
    if (!attrs.hasOwnProperty(key)) { continue; }

    switch (key.replace(/_/g, '').toLowerCase()) {
      case 'postalcode':
      case 'countryname':
      case 'countrycodenumeric':
      case 'countrycodealpha2':
      case 'countrycodealpha3':
      case 'region':
      case 'extendedaddress':
      case 'locality':
      case 'firstname':
      case 'lastname':
      case 'company':
      case 'streetaddress':
        creditCard.billingAddress[key] = attrs[key];
        break;
      default:
        creditCard[key] = attrs[key];
    }
  }

  return creditCard;
}

module.exports = {
  normalizeCreditCardFields: normalizeCreditCardFields
};
