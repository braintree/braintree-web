'use strict';

var BaseInput = require('../../../../../src/hosted-fields/internal/components/base-input').BaseInput;
var ExpirationDateInput = require('../../../../../src/hosted-fields/internal/components/expiration-date-input').ExpirationDateInput;

describe('Expiration Date Input', function () {
  beforeEach(function () {
    this.input = helpers.createInput('expirationDate');
  });

  describe('inheritance', function () {
    it('extends BaseInput', function () {
      expect(this.input).to.be.an.instanceof(BaseInput);
    });
  });

  describe('getUnformattedValue', function () {
    it('returns monthyear format for month input type', function () {
      var context = {
        element: {type: 'month'},
        formatter: {getUnformattedValue: function () { return '2020-01'; }}
      };
      var value = ExpirationDateInput.prototype.getUnformattedValue.call(context);

      expect(value).to.equal('012020');
    });

    it('returns empty value for emtpy month input type', function () {
      var context = {
        element: {type: 'month'},
        formatter: {getUnformattedValue: function () { return ''; }}
      };
      var value = ExpirationDateInput.prototype.getUnformattedValue.call(context);

      expect(value).to.equal('');
    });
  });

  describe('element', function () {
    it('has type="tel"', function () {
      expect(this.input.element.getAttribute('type')).to.equal('tel');
    });

    it('has autocomplete cc-exp', function () {
      expect(this.input.element.getAttribute('autocomplete')).to.equal('cc-exp');
    });

    it('sets the maxLength to 9', function () {
      expect(this.input.element.getAttribute('maxlength')).to.equal('9');
    });
  });

  describe('formatting', function () {
    describe('uses a 2 digit month when the date starts with zero', function () {
      var expDates = ['01', '0122', '01222'];

      expDates.forEach(function (date) {
        it(' for date ' + date, function () {
          this.sandbox.spy(this.input.formatter, 'setPattern');
          this.input.model.set('expirationDate.value', date);
          expect(this.input.formatter.setPattern).to.be.calledWith('{{99}} / {{9999}}');
        });
      });
    });

    describe('uses a 2 digit month when the date starts with one', function () {
      var expDates = ['1', '122', '1222'];

      expDates.forEach(function (date) {
        it(' for date ' + date, function () {
          this.sandbox.spy(this.input.formatter, 'setPattern');
          this.input.model.set('expirationDate.value', date);
          expect(this.input.formatter.setPattern).to.be.calledWith('{{99}} / {{9999}}');
        });
      });
    });

    describe('uses a 1 digit month when the date is greater than one', function () {
      var expDates = ['2', '3', '4', '5', '6', '7', '8', '9'];

      expDates.forEach(function (date) {
        it(' for date ' + date, function () {
          this.sandbox.spy(this.input.formatter, 'setPattern');
          this.input.model.set('expirationDate.value', date);
          expect(this.input.formatter.setPattern).to.be.calledWith('0{{9}} / {{9999}}');
        });
      });
    });

    describe('uses a 2 digit month for valid 3 digit dates starting with 1', function () {
      var expDates = ['121', '122'];

      expDates.forEach(function (date) {
        it(' for date ' + date, function () {
          this.sandbox.spy(this.input.formatter, 'setPattern');
          this.input.model.set('expirationDate.value', date);
          expect(this.input.formatter.setPattern).to.be.calledWith('{{99}} / {{9999}}');
        });
      });
    });

    describe('uses a 2 digit month for 3 digit dates that are potentially valid but not valid yet', function () {
      var expDates = ['011', '020', '021', '022', '101', '102', '111', '112'];

      expDates.forEach(function (date) {
        it(' for date ' + date, function () {
          this.sandbox.spy(this.input.formatter, 'setPattern');
          this.input.model.set('expirationDate.value', date);
          expect(this.input.formatter.setPattern).to.be.calledWith('{{99}} / {{9999}}');
        });
      });
    });

    it('handles changes in ambiguous dates, for date 122', function () {
      this.sandbox.spy(this.input.formatter, 'setPattern');
      this.input.model.set('expirationDate.value', '22');
      expect(this.input.formatter.setPattern).to.be.calledWith('0{{9}} / {{9999}}');
      this.input.model.set('expirationDate.value', '122');
      expect(this.input.formatter.setPattern).to.be.calledWith('{{99}} / {{9999}}');
    });

    describe('handles changes in ambiguous dates', function () {
      var expDates = ['1220', '12202', '122020'];

      expDates.forEach(function (date) {
        it(' for date ' + date, function () {
          this.sandbox.spy(this.input.formatter, 'setPattern');
          this.input.model.set('expirationDate.value', date);
          expect(this.input.formatter.setPattern).to.be.calledWith('{{99}} / {{9999}}');
        });
      });
    });
  });
});
