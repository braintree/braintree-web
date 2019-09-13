'use strict';

var FieldComponent = require('../../../../../src/hosted-fields/internal/components/field-component').FieldComponent;
var CreditCardForm = require('../../../../../src/hosted-fields/internal/models/credit-card-form').CreditCardForm;
var focusIntercept = require('../../../../../src/hosted-fields/shared/focus-intercept');
var constants = require('../../../../../src/hosted-fields/shared/constants');
var helpers = require('../../helpers');
var directions = constants.navigationDirections;
var events = constants.events;

describe('FieldComponent', function () {
  // TODO add tests to fill out logic in Field Component file

  context('focus interceptors', function () {
    beforeEach(function () {
      this.focusBackElement = document.createElement('div');
      this.focusBackElement.id = 'back-element';
      this.focusForwardElement = document.createElement('div');
      this.focusForwardElement.id = 'forward-element';

      this.sandbox.stub(focusIntercept, 'generate');

      focusIntercept.generate.onCall(0).returns(this.focusBackElement);
      focusIntercept.generate.onCall(1).returns(this.focusForwardElement);

      this.fieldComponent = new FieldComponent({
        cardForm: new CreditCardForm(helpers.getModelConfig([
          'number',
          'cvv',
          'expirationDate'
        ])),
        type: 'cvv'
      });
      document.body.appendChild(this.fieldComponent.element);
    });

    it('adds focusIntercept inputs within field iframe', function () {
      expect(document.getElementById('back-element')).to.equal(this.focusBackElement);
      expect(document.getElementById('forward-element')).to.equal(this.focusForwardElement);
    });

    it('emits a TRIGGER_FOCUS_CHANGE when focus intercept back handler is triggerd', function () {
      var handler = focusIntercept.generate.args[0][2];

      handler();

      expect(global.bus.emit).to.be.calledWith(events.TRIGGER_FOCUS_CHANGE, 'cvv', directions.BACK);
    });

    it('emits a TRIGGER_FOCUS_CHANGE when focus intercept forward handler is triggerd', function () {
      var handler = focusIntercept.generate.args[1][2];

      handler();

      expect(global.bus.emit).to.be.calledWith(events.TRIGGER_FOCUS_CHANGE, 'cvv', directions.FORWARD);
    });
  });
});
