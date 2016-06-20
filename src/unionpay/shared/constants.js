'use strict';

var enumerate = require('../../lib/enumerate');

module.exports = {
  events: enumerate([
    'HOSTED_FIELDS_FETCH_CAPABILITIES',
    'HOSTED_FIELDS_ENROLL',
    'HOSTED_FIELDS_TOKENIZE'
  ], 'union-pay:'),
  HOSTED_FIELDS_FRAME_NAME: 'braintreeunionpayhostedfields',
  INVALID_HOSTED_FIELDS_ERROR_MESSAGE: 'Found an invalid Hosted Fields instance. Please use a valid Hosted Fields instance.',
  CARD_OR_HOSTED_FIELDS_REQUIRED_ERROR_MESSAGE: 'A card or a Hosted Fields instance is required. Please supply a card or a Hosted Fields instance.',
  CARD_AND_HOSTED_FIELDS_ERROR_MESSAGE: 'Please supply either a card or a Hosted Fields instance, not both.',
  NO_HOSTED_FIELDS_ERROR_MESSAGE: 'Could not find the Hosted Fields instance.'
};
