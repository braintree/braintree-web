'use strict';
const { BaseInput } = require('../../../../../src/hosted-fields/internal/components/base-input');
const { createInput } = require('../../helpers');

describe('Credit Card Input', () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
    testContext.input = createInput('number');
  });

  describe('inheritance', () => {
    it('extends BaseInput', () => {
      expect(testContext.input).toBeInstanceOf(BaseInput);
    });
  });

  describe('element', () => {
    it('has type="tel"', () => {
      expect(testContext.input.element.getAttribute('type')).toBe('tel');
    });

    it('has autocomplete cc-number', () => {
      expect(testContext.input.element.getAttribute('autocomplete')).toBe('cc-number');
    });
  });

  describe('maxlength', () => {
    it('has a default maxlength of 22', () => {
      expect(testContext.input.element.getAttribute('maxlength')).toBe('22');
    });

    it('should update maxlength based on number', () => {
      testContext.input.element.value = '4111';
      testContext.input.model.set('number.value', '4111');
      expect(testContext.input.element.getAttribute('maxlength')).toBe('22');

      testContext.input.element.value = '';
      testContext.input.model.set('number.value', '');
      expect(testContext.input.element.getAttribute('maxlength')).toBe('22');

      testContext.input.element.value = '3782';
      testContext.input.model.set('number.value', '3782');
      expect(testContext.input.element.getAttribute('maxlength')).toBe('17');

      // Maestro - multiple lengths allowed, max is 19
      testContext.input.element.value = '5063';
      testContext.input.model.set('number.value', '5063');
      expect(testContext.input.element.getAttribute('maxlength')).toBe('22');

      testContext.input.element.value = '6304000000000000';
      testContext.input.model.set('number.value', '6304000000000000');
      expect(testContext.input.element.getAttribute('maxlength')).toBe('22');

      testContext.input.element.value = '63040 0000 0000 000';
      testContext.input.model.set('number.value', '63040 0000 0000 000');
      expect(testContext.input.element.getAttribute('maxlength')).toBe('22');

      testContext.input.element.value = '411';
      testContext.input.model.set('number.value', '411');
      expect(testContext.input.element.getAttribute('maxlength')).toBe('22');

      testContext.input.element.value = '6282001509099283';
      testContext.input.model.set('number.value', '6282001509099283');
      expect(testContext.input.element.getAttribute('maxlength')).toBe('22');

      testContext.input.element.value = '6011 1111 1111 1117';
      testContext.input.model.set('number.value', '6011111111111117');
      expect(testContext.input.element.getAttribute('maxlength')).toBe('22');

      testContext.input.model.set('number.value', '5555 5555 5555 4444');
      testContext.input.model.set('number.value', '5555555555554444');
      expect(testContext.input.element.getAttribute('maxlength')).toBe('19');
    });

    it('can configure custom max length with maxCardLength option', () => {
      const { model, element } = testContext.input;

      model.configuration.fields.number.maxCardLength = 16;
      element.value = '4111';
      model.set('number.value', '4111');
      expect(element.getAttribute('maxlength')).toBe('19');

      element.value = '';
      model.set('number.value', '');
      expect(element.getAttribute('maxlength')).toBe('22');

      // amex have a max length of 15, so that takes precedence
      // over configure max length
      element.value = '3782';
      model.set('number.value', '3782');
      expect(element.getAttribute('maxlength')).toBe('17');

      element.value = '5063';
      model.set('number.value', '5063');
      expect(element.getAttribute('maxlength')).toBe('19');

      element.value = '6304000000000000';
      model.set('number.value', '6304000000000000');
      expect(element.getAttribute('maxlength')).toBe('19');

      element.value = '63040 0000 0000 000';
      model.set('number.value', '63040 0000 0000 000');
      expect(element.getAttribute('maxlength')).toBe('19');

      element.value = '411';
      model.set('number.value', '411');
      expect(element.getAttribute('maxlength')).toBe('19');

      element.value = '6282001509099283';
      model.set('number.value', '6282001509099283');
      expect(element.getAttribute('maxlength')).toBe('19');

      element.value = '6011 1111 1111 1117';
      model.set('number.value', '6011111111111117');
      expect(element.getAttribute('maxlength')).toBe('19');

      model.set('number.value', '5555 5555 5555 4444');
      model.set('number.value', '5555555555554444');
      expect(element.getAttribute('maxlength')).toBe('19');
    });
  });

  describe('maskValue', () => {
    beforeEach(() => {
      testContext.input = createInput('number');
    });

    it('calls mask value on BaseInput', () => {
      jest.spyOn(BaseInput.prototype, 'maskValue');

      testContext.input.maskValue('1234');

      expect(BaseInput.prototype.maskValue).toHaveBeenCalledTimes(1);
      expect(BaseInput.prototype.maskValue).toHaveBeenCalledWith('1234');
    });

    it('reveals last four in element value if card is valid and unmaskLastFour is set', () => {
      jest.spyOn(testContext.input.model, 'get').mockReturnValue({
        isValid: true
      });
      testContext.input.unmaskLastFour = true;
      testContext.input.maskValue('4111 1111 1111 1236');

      expect(testContext.input.element.value).toBe('•••• •••• •••• 1236');
    });

    it('does not reveal last four in element value if card is not valid and unmaskLastFour is set', () => {
      jest.spyOn(testContext.input.model, 'get').mockReturnValue({
        isValid: false
      });
      testContext.input.unmaskLastFour = true;
      testContext.input.maskValue('4111 1111 1111 123');

      expect(testContext.input.element.value).toBe('•••• •••• •••• •••');
    });

    it('does not reveal last four in element value if card is not valid and unmaskLastFour is set', () => {
      jest.spyOn(testContext.input.model, 'get').mockReturnValue({
        isValid: true
      });
      testContext.input.unmaskLastFour = false;
      testContext.input.maskValue('4111 1111 1111 1236');

      expect(testContext.input.element.value).toBe('•••• •••• •••• ••••');
    });
  });
});
