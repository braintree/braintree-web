'use strict';

var BaseInput = require('../../../../../src/hosted-fields/internal/components/base-input').BaseInput;
var ExpirationMonthInput = require('../../../../../src/hosted-fields/internal/components/expiration-month-input').ExpirationMonthInput;
var CreditCardForm = require('../../../../../src/hosted-fields/internal/models/credit-card-form').CreditCardForm;

describe('Expiration Month Input', function () {
  beforeEach(function () {
    this.input = helpers.createInput('expirationMonth');
  });

  describe('inheritance', function () {
    it('extends BaseInput', function () {
      expect(this.input).to.be.an.instanceof(BaseInput);
    });
  });

  describe('element creation', function () {
    describe('without a `select` option', function () {
      it('is an <input> element', function () {
        expect(this.input.element).to.be.an.instanceOf(HTMLInputElement);
      });

      it('has type="tel"', function () {
        expect(this.input.element.getAttribute('type')).to.equal('tel');
      });

      it('sets the maxLength to 2', function () {
        expect(this.input.element.getAttribute('maxlength')).to.equal('2');
      });
    });

    describe('with a `select` option', function () {
      it("select: false calls BaseInput's constructElement", function () {
        var input;

        this.sandbox.spy(BaseInput.prototype, 'constructElement');

        input = new ExpirationMonthInput({
          type: 'expirationMonth',
          model: new CreditCardForm({
            fields: {
              expirationMonth: {
                selector: '#expiration-month',
                select: false
              }
            }
          })
        });

        expect(BaseInput.prototype.constructElement).to.have.been.calledOnce;
        expect(BaseInput.prototype.constructElement).to.have.been.calledOn(input);
      });

      it('select: true creates a <select> with twelve <option>s inside', function () {
        var month, optionEl;
        var input = new ExpirationMonthInput({
          type: 'expirationMonth',
          model: new CreditCardForm({
            fields: {
              expirationMonth: {
                selector: '#expiration-month',
                select: true
              }
            }
          })
        });

        expect(input.element).to.be.an.instanceOf(HTMLSelectElement);
        expect(input.element.className).to.equal('expirationMonth');
        expect(input.element.getAttribute('data-braintree-name')).to.equal('expirationMonth');
        expect(input.element.name).to.equal('expiration-month');
        expect(input.element.id).to.equal('expiration-month');

        for (month = 1; month <= 12; month++) {
          optionEl = input.element.childNodes[month - 1];

          expect(optionEl).to.be.an.instanceOf(HTMLOptionElement);
          expect(optionEl.value).to.equal(month.toString());
          expect(optionEl.innerHTML).to.equal(month.toString());
        }

        expect(input.element.querySelectorAll('option')).to.have.lengthOf(12);
      });

      it('select: {} creates a <select> with twelve <option>s inside', function () {
        var month, optionEl;
        var input = new ExpirationMonthInput({
          type: 'expirationMonth',
          model: new CreditCardForm({
            fields: {
              expirationMonth: {
                selector: '#expiration-month',
                select: {}
              }
            }
          })
        });

        expect(input.element).to.be.an.instanceOf(HTMLSelectElement);
        expect(input.element.className).to.equal('expirationMonth');
        expect(input.element.getAttribute('data-braintree-name')).to.equal('expirationMonth');
        expect(input.element.name).to.equal('expiration-month');
        expect(input.element.id).to.equal('expiration-month');

        for (month = 1; month <= 12; month++) {
          optionEl = input.element.childNodes[month - 1];

          expect(optionEl).to.be.an.instanceOf(HTMLOptionElement);
          expect(optionEl.value).to.equal(month.toString());
          expect(optionEl.innerHTML).to.equal(month.toString());
        }

        expect(input.element.querySelectorAll('option')).to.have.lengthOf(12);
      });

      it('select: { options: null } creates a <select> with twelve <option>s inside', function () {
        var month, optionEl;
        var input = new ExpirationMonthInput({
          type: 'expirationMonth',
          model: new CreditCardForm({
            fields: {
              expirationMonth: {
                selector: '#expiration-month',
                select: {options: null}
              }
            }
          })
        });

        expect(input.element).to.be.an.instanceOf(HTMLSelectElement);
        expect(input.element.className).to.equal('expirationMonth');
        expect(input.element.getAttribute('data-braintree-name')).to.equal('expirationMonth');
        expect(input.element.name).to.equal('expiration-month');
        expect(input.element.id).to.equal('expiration-month');

        for (month = 1; month <= 12; month++) {
          optionEl = input.element.childNodes[month - 1];

          expect(optionEl).to.be.an.instanceOf(HTMLOptionElement);
          expect(optionEl.value).to.equal(month.toString());
          expect(optionEl.innerHTML).to.equal(month.toString());
        }

        expect(input.element.querySelectorAll('option')).to.have.lengthOf(12);
      });

      it('select options with 13 strings creates a <select> with twelve <option>s inside', function () {
        var month, optionEl;
        var options = 'abcdefghijklm'.split('');
        var input = new ExpirationMonthInput({
          type: 'expirationMonth',
          model: new CreditCardForm({
            fields: {
              expirationMonth: {
                selector: '#expiration-month',
                select: {options: options}
              }
            }
          })
        });

        expect(input.element).to.be.an.instanceOf(HTMLSelectElement);
        expect(input.element.className).to.equal('expirationMonth');
        expect(input.element.getAttribute('data-braintree-name')).to.equal('expirationMonth');
        expect(input.element.name).to.equal('expiration-month');
        expect(input.element.id).to.equal('expiration-month');

        for (month = 1; month <= 12; month++) {
          optionEl = input.element.childNodes[month - 1];

          expect(optionEl).to.be.an.instanceOf(HTMLOptionElement);
          expect(optionEl.value).to.equal(month.toString());
          expect(optionEl.innerHTML).to.equal(options[month - 1]);
        }

        expect(input.element.querySelectorAll('option')).to.have.lengthOf(12);
      });

      it('select options with 3 strings creates a <select> with twelve <option>s inside', function () {
        var month, optionEl;
        var input = new ExpirationMonthInput({
          type: 'expirationMonth',
          model: new CreditCardForm({
            fields: {
              expirationMonth: {
                selector: '#expiration-month',
                select: {options: ['a', 'b', 'c']}
              }
            }
          })
        });

        expect(input.element).to.be.an.instanceOf(HTMLSelectElement);
        expect(input.element.className).to.equal('expirationMonth');
        expect(input.element.getAttribute('data-braintree-name')).to.equal('expirationMonth');
        expect(input.element.name).to.equal('expiration-month');
        expect(input.element.id).to.equal('expiration-month');

        for (month = 1; month <= 3; month++) {
          optionEl = input.element.childNodes[month - 1];

          expect(optionEl.value).to.equal(month.toString());
          expect(optionEl.innerHTML).to.equal(['a', 'b', 'c'][month - 1]);
        }

        for (month = 4; month <= 12; month++) {
          optionEl = input.element.childNodes[month - 1];

          expect(optionEl.value).to.equal(month.toString());
          expect(optionEl.innerHTML).to.equal(month.toString());
        }

        expect(input.element.querySelectorAll('option')).to.have.lengthOf(12);
      });

      it('select options with non-strings ignores the non-string options', function () {
        var optionEl;
        var input = new ExpirationMonthInput({
          type: 'expirationMonth',
          model: new CreditCardForm({
            fields: {
              expirationMonth: {
                selector: '#expiration-month',
                select: {options: [99]}
              }
            }
          })
        });

        optionEl = input.element.childNodes[0];
        expect(optionEl.value).to.equal('1');
        expect(optionEl.innerHTML).to.equal('1');

        expect(input.element.querySelectorAll('option')).to.have.lengthOf(12);
      });

      it('allows a placeholder in the select', function () {
        var placeholderEl;
        var input = new ExpirationMonthInput({
          type: 'expirationMonth',
          model: new CreditCardForm({
            fields: {
              expirationMonth: {
                selector: '#expiration-month',
                placeholder: 'foo & <boo>',
                select: true
              }
            }
          })
        });

        placeholderEl = input.element.childNodes[0];
        expect(placeholderEl.value).to.equal('');
        expect(placeholderEl.getAttribute('selected')).to.equal('selected');
        expect(placeholderEl.getAttribute('disabled')).to.equal('disabled');
        expect(placeholderEl.innerHTML).to.equal('foo &amp; &lt;boo&gt;');

        expect(input.element.querySelectorAll('option')).to.have.lengthOf(13);
      });
    });
  });
});
