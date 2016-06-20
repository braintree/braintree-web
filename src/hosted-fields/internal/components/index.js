'use strict';

module.exports = {
  number: require('./credit-card-input').CreditCardInput,
  expirationDate: require('./expiration-date-input').ExpirationDateInput,
  expirationMonth: require('./expiration-month-input').ExpirationMonthInput,
  expirationYear: require('./expiration-year-input').ExpirationYearInput,
  cvv: require('./cvv-input').CVVInput,
  postalCode: require('./postal-code-input').PostalCodeInput
};
