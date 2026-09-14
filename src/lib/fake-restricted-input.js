function FakeRestrictedInput(options) {
  this.inputElement = options.element;
}

FakeRestrictedInput.prototype.getUnformattedValue = function () {
  return this.inputElement.value;
};

FakeRestrictedInput.prototype.setPattern = function () {};

export default FakeRestrictedInput;
