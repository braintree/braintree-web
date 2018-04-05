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
    describe('prefill', function () {
      it('applies prefill', function () {
        var input = new ExpirationMonthInput({
          type: 'expirationMonth',
          model: new CreditCardForm({
            fields: {
              expirationMonth: {
                prefill: '09',
                selector: '#expiration-month',
                select: false
              }
            }
          })
        });

        expect(input.element.value).to.equal('09');
      });

      it('prefixes month value with a leading zero if it is one digit', function () {
        var input = new ExpirationMonthInput({
          type: 'expirationMonth',
          model: new CreditCardForm({
            fields: {
              expirationMonth: {
                prefill: '9',
                selector: '#expiration-month',
                select: false
              }
            }
          })
        });

        expect(input.element.value).to.equal('09');
      });

      it('does not prefix month value with a leading zero if it is not one digit', function () {
        var input = new ExpirationMonthInput({
          type: 'expirationMonth',
          model: new CreditCardForm({
            fields: {
              expirationMonth: {
                prefill: '11',
                selector: '#expiration-month',
                select: false
              }
            }
          })
        });

        expect(input.element.value).to.equal('11');
      });
    });

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

        expect(BaseInput.prototype.constructElement).to.be.calledOnce;
        expect(BaseInput.prototype.constructElement).to.be.calledOn(input);
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
        expect(input.element.className).to.equal('expirationMonth valid');
        expect(input.element.getAttribute('data-braintree-name')).to.equal('expirationMonth');
        expect(input.element.name).to.equal('expiration-month');
        expect(input.element.id).to.equal('expiration-month');

        for (month = 1; month <= 12; month++) {
          optionEl = input.element.childNodes[month - 1];

          expect(optionEl).to.be.an.instanceOf(HTMLOptionElement);
          expect(optionEl.value).to.include(month.toString());
          expect(optionEl.innerHTML).to.equal(month.toString());
        }

        expect(input.element.querySelectorAll('option')).to.have.lengthOf(12);
      });

      it('prepends select values with a 0 for months 1-9', function () {
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
        var nodes = input.element.childNodes;

        expect(nodes[0].value).to.equal('01');
        expect(nodes[1].value).to.equal('02');
        expect(nodes[2].value).to.equal('03');
        expect(nodes[3].value).to.equal('04');
        expect(nodes[4].value).to.equal('05');
        expect(nodes[5].value).to.equal('06');
        expect(nodes[6].value).to.equal('07');
        expect(nodes[7].value).to.equal('08');
        expect(nodes[8].value).to.equal('09');
        expect(nodes[9].value).to.equal('10');
        expect(nodes[10].value).to.equal('11');
        expect(nodes[11].value).to.equal('12');
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
        expect(input.element.className).to.equal('expirationMonth valid');
        expect(input.element.getAttribute('data-braintree-name')).to.equal('expirationMonth');
        expect(input.element.name).to.equal('expiration-month');
        expect(input.element.id).to.equal('expiration-month');

        for (month = 1; month <= 12; month++) {
          optionEl = input.element.childNodes[month - 1];

          expect(optionEl).to.be.an.instanceOf(HTMLOptionElement);
          expect(optionEl.value).to.include(month.toString());
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
        expect(input.element.className).to.equal('expirationMonth valid');
        expect(input.element.getAttribute('data-braintree-name')).to.equal('expirationMonth');
        expect(input.element.name).to.equal('expiration-month');
        expect(input.element.id).to.equal('expiration-month');

        for (month = 1; month <= 12; month++) {
          optionEl = input.element.childNodes[month - 1];

          expect(optionEl).to.be.an.instanceOf(HTMLOptionElement);
          expect(optionEl.value).to.include(month.toString());
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
        expect(input.element.className).to.equal('expirationMonth valid');
        expect(input.element.getAttribute('data-braintree-name')).to.equal('expirationMonth');
        expect(input.element.name).to.equal('expiration-month');
        expect(input.element.id).to.equal('expiration-month');

        for (month = 1; month <= 12; month++) {
          optionEl = input.element.childNodes[month - 1];

          expect(optionEl).to.be.an.instanceOf(HTMLOptionElement);
          expect(optionEl.value).to.include(month.toString());
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
        expect(input.element.className).to.equal('expirationMonth valid');
        expect(input.element.getAttribute('data-braintree-name')).to.equal('expirationMonth');
        expect(input.element.name).to.equal('expiration-month');
        expect(input.element.id).to.equal('expiration-month');

        for (month = 1; month <= 3; month++) {
          optionEl = input.element.childNodes[month - 1];

          expect(optionEl.value).to.include(month.toString());
          expect(optionEl.innerHTML).to.equal(['a', 'b', 'c'][month - 1]);
        }

        for (month = 4; month <= 12; month++) {
          optionEl = input.element.childNodes[month - 1];

          expect(optionEl.value).to.include(month.toString());
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
        expect(optionEl.value).to.equal('01');
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

      it('selects current month value when no placeholder is set', function () {
        var i, el;
        var currentMonth = parseInt((new Date()).getMonth(), 10);
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

        for (i = 0; i < input.element.childNodes.length; i++) {
          el = input.element.childNodes[i];

          if (i === currentMonth) {
            expect(el.getAttribute('selected')).to.equal('selected');
          } else {
            expect(el.getAttribute('selected')).to.equal(null);
          }
        }
        expect(input.element.selectedIndex).to.equal(currentMonth);
      });
    });

    it('has autocomplete cc-exp-month', function () {
      expect(this.input.element.getAttribute('autocomplete')).to.equal('cc-exp-month');
    });
  });
});
