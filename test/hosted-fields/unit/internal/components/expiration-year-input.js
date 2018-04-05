'use strict';

var BaseInput = require('../../../../../src/hosted-fields/internal/components/base-input').BaseInput;
var ExpirationYearInput = require('../../../../../src/hosted-fields/internal/components/expiration-year-input').ExpirationYearInput;
var CreditCardForm = require('../../../../../src/hosted-fields/internal/models/credit-card-form').CreditCardForm;
var constants = require('../../../../../src/hosted-fields/shared/constants');

describe('Expiration Year Input', function () {
  beforeEach(function () {
    this.input = helpers.createInput('expirationYear');
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

      it('sets the maxLength to 4', function () {
        expect(this.input.element.getAttribute('maxlength')).to.equal('4');
      });
    });

    describe('with a `select` option', function () {
      it("select: false calls BaseInput's constructElement", function () {
        var input;

        this.sandbox.spy(BaseInput.prototype, 'constructElement');

        input = new ExpirationYearInput({
          type: 'expirationYear',
          model: new CreditCardForm({
            fields: {
              expirationYear: {
                selector: '#expiration-year',
                select: false
              }
            }
          })
        });

        expect(BaseInput.prototype.constructElement).to.be.calledOnce;
        expect(BaseInput.prototype.constructElement).to.be.calledOn(input);
      });

      it('select: true creates a <select> with year-related <option>s inside', function () {
        var i, year, thisYear, optionEl;
        var input = new ExpirationYearInput({
          type: 'expirationYear',
          model: new CreditCardForm({
            fields: {
              expirationYear: {
                selector: '#expiration-year',
                select: true
              }
            }
          })
        });

        expect(input.element).to.be.an.instanceOf(HTMLSelectElement);
        expect(input.element.className).to.equal('expirationYear valid');
        expect(input.element.getAttribute('data-braintree-name')).to.equal('expirationYear');
        expect(input.element.name).to.equal('expiration-year');
        expect(input.element.id).to.equal('expiration-year');

        thisYear = new Date().getFullYear();

        for (i = 0; i <= constants.maxExpirationYearAge; i++) {
          optionEl = input.element.childNodes[i];

          year = thisYear + i;

          expect(optionEl).to.be.an.instanceOf(HTMLOptionElement);
          expect(optionEl.value).to.equal(year.toString());
          expect(optionEl.innerHTML).to.equal(year.toString());
        }

        expect(input.element.querySelectorAll('option')).to.have.lengthOf(constants.maxExpirationYearAge + 1);
      });

      it('select: {} creates a <select> with year-related <option>s inside', function () {
        var i, year, thisYear, optionEl;
        var input = new ExpirationYearInput({
          type: 'expirationYear',
          model: new CreditCardForm({
            fields: {
              expirationYear: {
                selector: '#expiration-year',
                select: {}
              }
            }
          })
        });

        expect(input.element).to.be.an.instanceOf(HTMLSelectElement);
        expect(input.element.className).to.equal('expirationYear valid');
        expect(input.element.getAttribute('data-braintree-name')).to.equal('expirationYear');
        expect(input.element.name).to.equal('expiration-year');
        expect(input.element.id).to.equal('expiration-year');

        thisYear = new Date().getFullYear();

        for (i = 0; i <= constants.maxExpirationYearAge; i++) {
          optionEl = input.element.childNodes[i];

          year = thisYear + i;

          expect(optionEl).to.be.an.instanceOf(HTMLOptionElement);
          expect(optionEl.value).to.equal(year.toString());
          expect(optionEl.innerHTML).to.equal(year.toString());
        }

        expect(input.element.querySelectorAll('option')).to.have.lengthOf(constants.maxExpirationYearAge + 1);
      });

      it('allows a placeholder in the select', function () {
        var placeholderEl;
        var input = new ExpirationYearInput({
          type: 'expirationYear',
          model: new CreditCardForm({
            fields: {
              expirationYear: {
                selector: '#expiration-year',
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

        expect(input.element.querySelectorAll('option')).to.have.lengthOf(constants.maxExpirationYearAge + 2);
      });

      it('selects current year when no placeholder is set', function () {
        var i, el;
        var input = new ExpirationYearInput({
          type: 'expirationYear',
          model: new CreditCardForm({
            fields: {
              expirationYear: {
                selector: '#expiration-year',
                select: true
              }
            }
          })
        });

        expect(input.element.childNodes[0].getAttribute('selected')).to.equal('selected');
        for (i = 1; i < input.element.childNodes.length; i++) {
          el = input.element.childNodes[i];
          expect(el.getAttribute('selected')).to.equal(null);
        }
        expect(input.element.selectedIndex).to.equal(0);
      });
    });

    it('has autocomplete cc-exp-year', function () {
      expect(this.input.element.getAttribute('autocomplete')).to.equal('cc-exp-year');
    });
  });
});
