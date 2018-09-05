'use strict';

var BaseInput = require('../../../../../src/hosted-fields/internal/components/base-input').BaseInput;
var constants = require('../../../../../src/hosted-fields/shared/constants');
var browserDetection = require('../../../../../src/hosted-fields/shared/browser-detection');
var RestrictedInput = require('restricted-input');
var FakeRestrictedInput = require('../../../../../src/lib/fake-restricted-input');

describe('Base Input', function () {
  Object.keys(constants.allowedFields).forEach(function (key) {
    describe(key, function () {
      beforeEach(function () {
        var config = {};

        this.config = config;
        this.sandbox.stub(BaseInput.prototype, 'getConfiguration').returns(config);

        this.sandbox.stub(BaseInput.prototype, 'addDOMEventListeners');
        this.sandbox.stub(BaseInput.prototype, 'addModelEventListeners');
        this.sandbox.stub(BaseInput.prototype, 'render');
      });

      beforeEach(function () {
        this.model = {
          set: this.sandbox.stub()
        };
        this.type = key;
      });

      beforeEach(function () {
        this.instance = new BaseInput({
          model: this.model,
          type: this.type
        });
      });

      describe('formatter', function () {
        it('creates a RestrictedInput formatter by default', function () {
          expect(this.instance.formatter).to.be.an.instanceof(RestrictedInput);
        });

        it('creates a FakeRestrictedInput formatter if formatting is disabled', function () {
          var instance;

          BaseInput.prototype.getConfiguration.restore();
          this.sandbox.stub(BaseInput.prototype, 'getConfiguration').returns({formatInput: false});

          instance = new BaseInput({
            model: this.model,
            type: this.type
          });

          expect(instance.formatter).to.be.an.instanceof(FakeRestrictedInput);
        });
      });

      describe('element', function () {
        it('is an input', function () {
          expect(this.instance.element).to.be.an.instanceof(HTMLInputElement);
        });

        describe('attributes', function () {
          afterEach(function () {
            delete BaseInput.prototype.maxLength;
          });

          describe('prefill', function () {
            it('applies prefill provided', function () {
              var instance;

              this.config.prefill = 'value';
              instance = new BaseInput({
                model: this.model,
                type: this.type
              });

              expect(instance.element.value).to.equal('value');
              expect(this.model.set).to.be.calledOnce;
              expect(this.model.set).to.be.calledWith(this.type + '.value', 'value');
            });

            it('coerces prefill to a string', function () {
              var instance;

              this.config.prefill = 1;
              instance = new BaseInput({
                model: this.model,
                type: this.type
              });

              expect(instance.element.value).to.equal('1');
              expect(this.model.set).to.be.calledOnce;
              expect(this.model.set).to.be.calledWith(this.type + '.value', '1');
            });
          });

          describe('placeholder', function () {
            it('applies if provided', function () {
              var instance;

              this.config.placeholder = key.toUpperCase();
              instance = new BaseInput({model: this.model});

              expect(instance.element.getAttribute('placeholder')).to.equal(key.toUpperCase());
            });

            it('does not apply if not defined', function () {
              expect(this.instance.element.getAttribute('placeholder')).to.equal(null);
            });
          });

          describe('masking', function () {
            beforeEach(function () {
              this.sandbox.stub(BaseInput.prototype, 'updateModel');
              // prevents adding listeners to document
              // when calling _addDOMFOcusListeners
              // and polluting other tests
              this.sandbox.stub(document.documentElement, 'addEventListener');
              this.sandbox.stub(document, 'addEventListener');
            });

            it('applies if provided', function () {
              var instance;

              this.config.maskInput = true;
              instance = new BaseInput({model: this.model});
              instance._addDOMFocusListeners();

              triggerEvent('focus', global);
              instance.element.value = 'abc 1234-asdf /asdf';
              triggerEvent('blur', global);

              expect(instance.element.value).to.equal('••• ••••-•••• /••••');
              triggerEvent('focus', global);
              expect(instance.element.value).to.equal('abc 1234-asdf /asdf');
            });

            it('does not apply if not defined', function () {
              this.instance._addDOMFocusListeners();

              triggerEvent('focus', global);
              this.instance.element.value = 'abc 1234-asdf /asdf';
              triggerEvent('blur', global);

              expect(this.instance.element.value).to.equal('abc 1234-asdf /asdf');
            });
          });

          describe('type', function () {
            it('applies if provided', function () {
              var instance;

              this.config.type = 'password';
              instance = new BaseInput({model: this.model, type: 'cvv'});

              expect(instance.element.getAttribute('type')).to.equal('password');
            });

            it('uses "tel" if not provided', function () {
              expect(this.instance.element.getAttribute('type')).to.equal('tel');
            });

            it('uses "text" with pattern for iOS', function () {
              var instance;

              this.sandbox.stub(browserDetection, 'isIos').returns(true);
              instance = new BaseInput({model: this.model, type: 'cvv'});

              expect(instance.element.getAttribute('type')).to.equal('text');
              expect(instance.element.getAttribute('pattern')).to.equal('\\d*');
            });
          });

          describe('defaults', function () {
            it('applies type', function () {
              expect(this.instance.element.getAttribute('type')).to.equal('tel');
            });

            it('applies autocomplete', function () {
              expect(this.instance.element.getAttribute('autocomplete')).to.exist;
            });

            it('applies autocorrect', function () {
              expect(this.instance.element.getAttribute('autocorrect')).to.equal('off');
            });

            it('applies autocapitalize', function () {
              expect(this.instance.element.getAttribute('autocapitalize')).to.equal('none');
            });

            it('applies spellcheck', function () {
              expect(this.instance.element.getAttribute('spellcheck')).to.equal('false');
            });

            it('applies name', function () {
              expect(this.instance.element.getAttribute('name')).to.equal(constants.allowedFields[key].name);
            });

            it('applies id', function () {
              expect(this.instance.element.getAttribute('id')).to.equal(constants.allowedFields[key].name);
            });
          });

          describe('class', function () {
            it('applies as type', function () {
              expect(this.instance.element.getAttribute('class')).to.equal(key);
            });
          });

          describe('data-braintree-name', function () {
            it('applies based on type', function () {
              expect(this.instance.element.getAttribute('data-braintree-name')).to.equal(key);
            });
          });

          describe('setAttribute', function () {
            beforeEach(function () {
              this.instance.element.setAttribute = this.sandbox.stub();
            });

            it('calls element.setAttribute', function () {
              this.instance.setAttribute(this.type, 'disabled', true);

              expect(this.instance.element.setAttribute).to.be.calledWith('disabled', true);
            });

            it('does not call element.setAttribute when type does not match', function () {
              this.instance.setAttribute('not-my-type', 'disabled', true);

              expect(this.instance.element.setAttribute).to.not.be.called;
            });

            it('does not call element.setAttribute when attribute is not allowed', function () {
              this.instance.setAttribute(this.type, 'maxlength', 0);

              expect(this.instance.element.setAttribute).to.not.be.called;
            });

            it('does not call element.setAttribute when value does not match attribute type', function () {
              this.instance.setAttribute(this.type, 'maxlength', false);

              expect(this.instance.element.setAttribute).to.not.be.called;
            });
          });

          describe('maskValue', function () {
            it('masks element value', function () {
              this.instance.maskValue('abc 1234-asdf /asdf');

              expect(this.instance.element.value).to.equal('••• ••••-•••• /••••');
            });

            it('can use custom mask-deliminator', function () {
              this.instance.maskCharacter = ':)';

              this.instance.maskValue('abc 1234-asdf /asdf');

              expect(this.instance.element.value).to.equal(':):):) :):):):)-:):):):) /:):):):)');
            });
          });

          describe('unmaskValue', function () {
            it('sets elemnt value to hiddenMaskedValue', function () {
              this.instance.hiddenMaskedValue = 'abc';
              this.instance.element.value = '123';

              this.instance.unmaskValue();

              expect(this.instance.element.value).to.equal('abc');
            });
          });

          describe('removeAttribute', function () {
            beforeEach(function () {
              this.instance.element.removeAttribute = this.sandbox.stub();
            });

            it('calls element.removeAttribute', function () {
              this.instance.setAttribute('disabled', true);

              this.instance.removeAttribute(this.type, 'disabled');

              expect(this.instance.element.removeAttribute).to.be.calledWith('disabled');
            });

            it('does not call element.removeAttribute when type does not match', function () {
              this.instance.setAttribute('disabled', true);

              this.instance.removeAttribute('not-my-type', 'disabled');

              expect(this.instance.element.removeAttribute).to.not.be.called;
            });

            it('does not call element.removeAttribute when attribute is not allowed', function () {
              this.instance.element.removeAttribute = this.sandbox.stub();

              this.instance.removeAttribute(this.type, 'maxlength');

              expect(this.instance.element.removeAttribute).to.not.be.called;
            });
          });
        });
      });
    });
  });
});
