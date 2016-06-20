'use strict';

var BaseInput = require('./base-input').BaseInput;

var DEFAULT_MAX_LENGTH = 22;
var PATTERN_CACHE = {};

function _generatePattern(card) {
  var i, pattern;
  var gaps = [4, 8, 12];
  var length = 16;
  var type = 'unknown';

  if (card) {
    length = Math.max.apply(null, card.lengths);
    gaps = card.gaps;
    type = card.type;
  }

  if (type in PATTERN_CACHE) {
    return PATTERN_CACHE[type];
  }

  pattern = '{{';

  for (i = 0; i < length; i++) {
    if (gaps.indexOf(i) !== -1) {
      pattern += '}} {{';
    }

    pattern += '9';
  }

  PATTERN_CACHE[type] = pattern + '}}';
  return PATTERN_CACHE[type];
}

function CreditCardInput() {
  this.maxLength = DEFAULT_MAX_LENGTH;

  BaseInput.apply(this, arguments);
  this.formatter.setPattern(_generatePattern());

  this.model.on('change:possibleCardTypes', function (possibleCardTypes) {
    var card;
    var maxLength = DEFAULT_MAX_LENGTH;

    if (possibleCardTypes.length === 1) {
      card = possibleCardTypes[0];
      maxLength = Math.max.apply(null, card.lengths) + card.gaps.length;
    }

    this.formatter.setPattern(_generatePattern(card));
    this.updateModel('value', this.formatter.getUnformattedValue());
    this.maxLength = maxLength;

    this.render();
  }.bind(this));
}

CreditCardInput.prototype = Object.create(BaseInput.prototype);
CreditCardInput.prototype.constructor = CreditCardInput;

module.exports = {
  CreditCardInput: CreditCardInput
};
