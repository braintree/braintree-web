'use strict';

const { BaseInput } = require('../../../../../src/hosted-fields/internal/components/base-input');
const constants = require('../../../../../src/hosted-fields/shared/constants');
const browserDetection = require('../../../../../src/hosted-fields/shared/browser-detection');
const RestrictedInput = require('restricted-input');
const FakeRestrictedInput = require('../../../../../src/lib/fake-restricted-input');
const { triggerEvent } = require('../../helpers');

describe('Base Input', () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
  });

  describe.each(Object.keys(constants.allowedFields))('%p', (key) => {
    beforeEach(() => {
      const config = {};

      testContext.config = config;
      jest.spyOn(BaseInput.prototype, 'getConfiguration').mockReturnValue(config);

      jest.spyOn(BaseInput.prototype, 'addDOMEventListeners').mockReturnValue(null);
      jest.spyOn(BaseInput.prototype, 'addModelEventListeners').mockReturnValue(null);
      jest.spyOn(BaseInput.prototype, 'render').mockReturnValue(null);

      testContext.model = {
        configuration: {},
        on: jest.fn(),
        set: jest.fn()
      };
      testContext.type = key;

      testContext.instance = new BaseInput({
        model: testContext.model,
        type: testContext.type
      });
    });

    describe('formatter', () => {
      it('creates a RestrictedInput formatter by default', () => {
        expect(testContext.instance.formatter).toBeInstanceOf(RestrictedInput);
      });

      it('creates a FakeRestrictedInput formatter if formatting is disabled', () => {
        let instance;

        BaseInput.prototype.getConfiguration.mockRestore();
        jest.spyOn(BaseInput.prototype, 'getConfiguration').mockReturnValue({ formatInput: false });

        instance = new BaseInput({
          model: testContext.model,
          type: testContext.type
        });

        expect(instance.formatter).toBeInstanceOf(FakeRestrictedInput);
      });
    });

    describe('element', () => {
      it('is an input', () => {
        expect(testContext.instance.element).toBeInstanceOf(HTMLInputElement);
      });

      describe('attributes', () => {
        afterEach(() => {
          delete BaseInput.prototype.maxLength;
        });

        describe('prefill', () => {
          it('applies prefill provided', () => {
            let instance;

            testContext.config.prefill = 'value';
            instance = new BaseInput({
              model: testContext.model,
              type: testContext.type
            });

            expect(instance.element.value).toBe('value');
            expect(testContext.model.set).toHaveBeenCalledTimes(1);
            expect(testContext.model.set).toHaveBeenCalledWith(`${testContext.type}.value`, 'value');
          });

          it('coerces prefill to a string', () => {
            let instance;

            testContext.config.prefill = 1;
            instance = new BaseInput({
              model: testContext.model,
              type: testContext.type
            });

            expect(instance.element.value).toBe('1');
            expect(testContext.model.set).toHaveBeenCalledTimes(1);
            expect(testContext.model.set).toHaveBeenCalledWith(`${testContext.type}.value`, '1');
          });
        });

        describe('placeholder', () => {
          it('applies if provided', () => {
            let instance;

            testContext.config.placeholder = key.toUpperCase();
            instance = new BaseInput({ model: testContext.model });

            expect(instance.element.getAttribute('placeholder')).toBe(key.toUpperCase());
          });

          it('does not apply if not defined', () => {
            expect(testContext.instance.element.getAttribute('placeholder')).toBeNull();
          });
        });

        describe('masking', () => {
          beforeEach(() => {
            jest.spyOn(BaseInput.prototype, 'updateModel').mockReturnValue(null);
            // prevents adding listeners to document
            // when calling _addDOMFocusListeners
            // and polluting other tests
            jest.spyOn(document.documentElement, 'addEventListener').mockReturnValue(null);
            jest.spyOn(document, 'addEventListener').mockReturnValue(null);
          });

          it('applies if provided', () => {
            let instance;

            testContext.config.maskInput = true;
            instance = new BaseInput({ model: testContext.model });
            instance._addDOMFocusListeners();

            triggerEvent('focus', global);
            instance.element.value = 'abc 1234-asdf /asdf';
            triggerEvent('blur', global);

            expect(instance.element.value).toBe('••• ••••-•••• /••••');
            triggerEvent('focus', global);
            expect(instance.element.value).toBe('abc 1234-asdf /asdf');
          });

          it('does not apply if not defined', () => {
            testContext.instance._addDOMFocusListeners();

            triggerEvent('focus', global);
            testContext.instance.element.value = 'abc 1234-asdf /asdf';
            triggerEvent('blur', global);

            expect(testContext.instance.element.value).toBe('abc 1234-asdf /asdf');
          });
        });

        describe('type', () => {
          it('applies if provided', () => {
            let instance;

            testContext.config.type = 'password';
            instance = new BaseInput({
              model: testContext.model,
              type: testContext.type
            });

            expect(instance.element.getAttribute('type')).toBe('password');
          });

          it('uses "tel" if not provided', () => {
            expect(testContext.instance.element.getAttribute('type')).toBe('tel');
          });

          it('uses "text" with pattern for iOS', () => {
            let instance;

            jest.spyOn(browserDetection, 'isIos').mockReturnValue(true);
            instance = new BaseInput({
              model: testContext.model,
              type: testContext.type
            });

            expect(instance.element.getAttribute('type')).toBe('text');
            expect(instance.element.getAttribute('pattern')).toBe('\\d*');
          });
        });

        describe('autocomplete', () => {
          it('opts out if configured', () => {
            let instance;

            testContext.model.configuration.preventAutofill = true;
            instance = new BaseInput({
              model: testContext.model,
              type: testContext.type
            });

            expect(instance.element.getAttribute('autocomplete')).toBe('off');
            expect(instance.element.getAttribute('name')).toBe('field');
          });
        });

        describe('defaults', () => {
          it('applies type', () => {
            expect(testContext.instance.element.getAttribute('type')).toBe('tel');
          });

          it('applies autocomplete', () => {
            expect(testContext.instance.element.getAttribute('autocomplete')).toBeDefined();
            expect(testContext.instance.element.getAttribute('autocomplete')).not.toBe('off');
          });

          it('applies autocorrect', () => {
            expect(testContext.instance.element.getAttribute('autocorrect')).toBe('off');
          });

          it('applies autocapitalize', () => {
            expect(testContext.instance.element.getAttribute('autocapitalize')).toBe('none');
          });

          it('applies spellcheck', () => {
            expect(testContext.instance.element.getAttribute('spellcheck')).toBe('false');
          });

          it('applies name', () => {
            expect(testContext.instance.element.getAttribute('name')).toBe(constants.allowedFields[key].name);
          });

          it('applies id', () => {
            expect(testContext.instance.element.getAttribute('id')).toBe(constants.allowedFields[key].name);
          });
        });

        describe('class', () => {
          it('applies as type', () => {
            expect(testContext.instance.element.getAttribute('class')).toBe(key);
          });
        });

        describe('data-braintree-name', () => {
          it('applies based on type', () => {
            expect(testContext.instance.element.getAttribute('data-braintree-name')).toBe(key);
          });
        });

        describe('setAttribute', () => {
          beforeEach(() => {
            jest.spyOn(testContext.instance.element, 'setAttribute').mockReturnValue(null);
          });

          it('calls element.setAttribute', () => {
            testContext.instance.setAttribute(testContext.type, 'disabled', true);

            expect(testContext.instance.element.setAttribute).toHaveBeenCalledWith('disabled', true);
          });

          it('does not call element.setAttribute when type does not match', () => {
            testContext.instance.setAttribute('not-my-type', 'disabled', true);

            expect(testContext.instance.element.setAttribute).not.toHaveBeenCalled();
          });

          it('does not call element.setAttribute when attribute is not allowed', () => {
            testContext.instance.setAttribute(testContext.type, 'maxlength', 0);

            expect(testContext.instance.element.setAttribute).not.toHaveBeenCalled();
          });

          it('does not call element.setAttribute when value does not match attribute type', () => {
            testContext.instance.setAttribute(testContext.type, 'maxlength', false);

            expect(testContext.instance.element.setAttribute).not.toHaveBeenCalled();
          });
        });

        describe('maskValue', () => {
          it('masks element value', () => {
            testContext.instance.maskValue('abc 1234-asdf /asdf');

            expect(testContext.instance.element.value).toBe('••• ••••-•••• /••••');
          });

          it('can use custom mask-deliminator', () => {
            testContext.instance.maskCharacter = ':)';

            testContext.instance.maskValue('abc 1234-asdf /asdf');

            expect(testContext.instance.element.value).toBe(':):):) :):):):)-:):):):) /:):):):)');
          });
        });

        describe('unmaskValue', () => {
          it('sets element value to hiddenMaskedValue', () => {
            testContext.instance.hiddenMaskedValue = 'abc';
            testContext.instance.element.value = '123';

            testContext.instance.unmaskValue();

            expect(testContext.instance.element.value).toBe('abc');
          });
        });

        describe('removeAttribute', () => {
          beforeEach(() => {
            jest.spyOn(testContext.instance.element, 'removeAttribute').mockReturnValue(null);
          });

          it('calls element.removeAttribute', () => {
            testContext.instance.setAttribute('disabled', true);

            testContext.instance.removeAttribute(testContext.type, 'disabled');

            expect(testContext.instance.element.removeAttribute).toHaveBeenCalledWith('disabled');
          });

          it('does not call element.removeAttribute when type does not match', () => {
            testContext.instance.setAttribute('disabled', true);

            testContext.instance.removeAttribute('not-my-type', 'disabled');

            expect(testContext.instance.element.removeAttribute).not.toHaveBeenCalled();
          });

          it('does not call element.removeAttribute when attribute is not allowed', () => {
            jest.spyOn(testContext.instance.element, 'removeAttribute').mockReturnValue(null);

            testContext.instance.removeAttribute(testContext.type, 'maxlength');

            expect(testContext.instance.element.removeAttribute).not.toHaveBeenCalled();
          });
        });
      });
    });

    describe('model listeners', () => {
      beforeEach(() => {
        BaseInput.prototype.addModelEventListeners.mockRestore();
      });

      it('calls render when isValid change event fires', () => {
        const instance = new BaseInput({
          model: testContext.model,
          type: testContext.type
        });
        const eventName = `change:${key}.isValid`;

        instance.render.mockClear();
        expect(instance.model.on).toBeCalledWith(eventName, expect.any(Function));

        const cb = instance.model.on.mock.calls.find((args) => {
          return args[0] === eventName;
        })[1];

        expect(instance.render).not.toBeCalled();

        cb();

        expect(instance.render).toBeCalledTimes(1);
      });

      it('calls render when isPotentiallyValid change event fires', () => {
        const instance = new BaseInput({
          model: testContext.model,
          type: testContext.type
        });
        const eventName = `change:${key}.isPotentiallyValid`;

        instance.render.mockClear();
        expect(instance.model.on).toBeCalledWith(eventName, expect.any(Function));

        const cb = instance.model.on.mock.calls.find((args) => {
          return args[0] === eventName;
        })[1];

        expect(instance.render).not.toBeCalled();

        cb();

        expect(instance.render).toBeCalledTimes(1);
      });

      it('applies autofill value when autofill event fires', () => {
        const instance = new BaseInput({
          model: testContext.model,
          type: testContext.type
        });
        const eventName = `autofill:${key}`;

        instance.render.mockClear();
        expect(instance.model.on).toBeCalledWith(eventName, expect.any(Function));

        const cb = instance.model.on.mock.calls.find((args) => {
          return args[0] === eventName;
        })[1];

        instance.element.value = 'old-value';

        jest.spyOn(instance, 'updateModel');
        expect(instance.render).not.toBeCalled();

        cb('new-value');

        expect(instance.element.value).toBe('new-value');
        expect(instance.updateModel).toBeCalledTimes(2);
        expect(instance.updateModel).toBeCalledWith('value', '');
        expect(instance.updateModel).toBeCalledWith('value', 'new-value');
        expect(instance.render).toBeCalledTimes(1);
      });

      it('masks after autofill if configured', () => {
        const instance = new BaseInput({
          model: testContext.model,
          type: testContext.type
        });
        const eventName = `autofill:${key}`;

        const cb = instance.model.on.mock.calls.find((args) => {
          return args[0] === eventName;
        })[1];

        jest.spyOn(instance, 'maskValue');

        cb('new-value');

        expect(instance.maskValue).not.toBeCalled();

        instance.shouldMask = true;

        cb('even-newer-value');

        expect(instance.maskValue).toBeCalledTimes(1);
        expect(instance.maskValue).toBeCalledWith('even-newer-value');
      });

      it('resets the placeholder after applying autofill if placedholder exists', () => {
        const instance = new BaseInput({
          model: testContext.model,
          type: testContext.type
        });
        const eventName = `autofill:${key}`;

        const cb = instance.model.on.mock.calls.find((args) => {
          return args[0] === eventName;
        })[1];

        jest.spyOn(instance.element, 'setAttribute');

        cb('new-value');

        expect(instance.element.setAttribute).not.toBeCalled();

        instance.element.setAttribute('placeholder', 'foo');
        instance.element.setAttribute.mockReset();

        cb('even-newer-value');

        expect(instance.element.setAttribute).toBeCalledTimes(2);
        expect(instance.element.setAttribute).toBeCalledWith('placeholder', '');
        expect(instance.element.setAttribute).toBeCalledWith('placeholder', 'foo');
      });
    });

    describe('applySafariFocusFix', () => {
      it('sets selection range to 0,0 and than reverts it back', () => {
        const instance = new BaseInput({
          model: testContext.model,
          type: testContext.type
        });

        instance.element.value = 'foo';
        instance.element.setSelectionRange(1, 2);

        const spy = jest.spyOn(instance.element, 'setSelectionRange');

        instance.applySafariFocusFix();

        expect(spy).toBeCalledTimes(2);
        expect(spy).toBeCalledWith(0, 0);
        expect(spy).toBeCalledWith(1, 2);
      });

      it('sets selection range to 0,0 and then 1,1 when no value is in input', () => {
        const instance = new BaseInput({
          model: testContext.model,
          type: testContext.type
        });

        instance.element.setSelectionRange(1, 2);

        const spy = jest.spyOn(instance.element, 'setSelectionRange');

        instance.applySafariFocusFix();

        expect(spy).toBeCalledTimes(2);
        expect(spy).toBeCalledWith(0, 0);
        expect(spy).toBeCalledWith(1, 1);
      });

      it('noops if element does not have a setSelectionRange method', () => {
        const instance = new BaseInput({
          model: testContext.model,
          type: testContext.type
        });

        instance.element = document.createElement('select');

        expect(() => {
          instance.applySafariFocusFix();
        }).not.toThrow();
      });
    });
  });
});
