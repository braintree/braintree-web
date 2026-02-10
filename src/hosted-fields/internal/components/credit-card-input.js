"use strict";

var BaseInput = require("./base-input").BaseInput;
var getCardTypes = require("../../shared/get-card-types");

var DEFAULT_CARD_LENGTH_FOR_PATTERN = 16;
var DEFAULT_MAX_LENGTH = 22;
var PATTERN_CACHE = {};

function _generatePattern(card, options) {
  var i, pattern;
  var gaps = [4, 8, 12];
  var length = DEFAULT_CARD_LENGTH_FOR_PATTERN;
  var type = "unknown";

  options = options || {};

  if (card) {
    length = Math.max.apply(null, card.lengths);
    gaps = card.gaps;
    type = card.type;

    if (options.maxCardLength) {
      length = Math.min(options.maxCardLength, length);
    }
  }

  if (type in PATTERN_CACHE) {
    return PATTERN_CACHE[type];
  }

  pattern = "{{";

  for (i = 0; i < length; i++) {
    if (gaps.indexOf(i) !== -1) {
      pattern += "}} {{";
    }

    pattern += "9";
  }

  PATTERN_CACHE[type] = pattern + "}}";

  return PATTERN_CACHE[type];
}

function CreditCardInput() {
  var configuration;

  this.maxLength = DEFAULT_MAX_LENGTH;
  BaseInput.apply(this, arguments);
  this.setPattern();

  configuration = this.getConfiguration();

  this.unmaskLastFour = Boolean(
    configuration.maskInput && configuration.maskInput.showLastFour
  );

  this.model.on(
    "change:possibleCardTypes",
    function (possibleCardTypes) {
      var result = this._parseCardTypes(possibleCardTypes);

      this.setPattern(result.card);
      this.updateModel("value", this.formatter.getUnformattedValue());
      this.maxLength = result.maxLength;

      this.render();
    }.bind(this)
  );
}

CreditCardInput.prototype = Object.create(BaseInput.prototype);
CreditCardInput.prototype.constructor = CreditCardInput;

CreditCardInput.resetPatternCache = function () {
  PATTERN_CACHE = {};
};

CreditCardInput.prototype.setPattern = function (card) {
  if (typeof card === "string") {
    card = this._getCardObjectFromString(card);
  }

  this.formatter.setPattern(
    _generatePattern(card, {
      maxCardLength: this.getConfiguration().maxCardLength,
    })
  );
};

CreditCardInput.prototype.maskValue = function (value) {
  var maskedValue, cardValue;

  BaseInput.prototype.maskValue.call(this, value);

  maskedValue = this.element.value;
  cardValue = this.hiddenMaskedValue;

  if (this.unmaskLastFour && this.model.get(this.type).isValid) {
    this.element.value =
      maskedValue.substring(0, maskedValue.length - 4) +
      cardValue.substring(cardValue.length - 4, cardValue.length);
  }
};

CreditCardInput.prototype._getCardObjectFromString = function (cardNumber) {
  var possibleCardTypes = getCardTypes(cardNumber);
  var result = this._parseCardTypes(possibleCardTypes);

  return result.card;
};

CreditCardInput.prototype._parseCardTypes = function (possibleCardTypes) {
  var maxLength = DEFAULT_MAX_LENGTH;
  var configuration = this.getConfiguration();
  var card;

  if (possibleCardTypes.length === 1) {
    card = possibleCardTypes[0];
    maxLength = Math.max.apply(null, card.lengths);
    if (configuration.maxCardLength) {
      maxLength = Math.min(configuration.maxCardLength, maxLength);
    }
    maxLength += card.gaps.length;
  }

  return {
    card: card,
    maxLength: maxLength,
  };
};

CreditCardInput.prototype._createRestrictedInputOptions = function (options) {
  var baseConfig = BaseInput.prototype._createRestrictedInputOptions.call(
    this,
    options
  );
  var self = this;

  baseConfig.onPasteEvent = function (payload) {
    self.setPattern(payload.unformattedInputValue);
  };

  return baseConfig;
};

module.exports = {
  CreditCardInput: CreditCardInput,
};
