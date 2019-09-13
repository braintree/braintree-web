'use strict';

var directions = require('../../../../src/hosted-fields/shared/constants').navigationDirections;
var focusChange = require('../../../../src/hosted-fields/external/focus-change');
var focusIntercept = require('../../../../src/hosted-fields/shared/focus-intercept');

function createSampleIntercept(type, direction) {
  var sampleIntercept = document.createElement('input');

  sampleIntercept.id = 'bt-' + type + '-' + direction;
  sampleIntercept.setAttribute('data-braintree-type', type);

  return sampleIntercept;
}

describe('focus-change', function () {
  describe('removeExtraFocusElements', function () {
    beforeEach(function () {
      this.removeStub = this.sandbox.stub();
      this.form = document.createElement('form');
      this.firstInput = document.createElement('input');
      this.firstInput.id = 'first';
      this.middleInput = document.createElement('input');
      this.middleInput.id = 'middle';
      this.lastInput = document.createElement('input');
      this.lastInput.id = 'last';
      this.sandbox.stub(focusIntercept, 'matchFocusElement');

      this.form.appendChild(document.createElement('div'));
      this.form.appendChild(document.createElement('div'));
      this.form.appendChild(this.firstInput);
      this.form.appendChild(document.createElement('div'));
      this.form.appendChild(document.createElement('input'));
      this.form.appendChild(document.createElement('div'));
      this.form.appendChild(this.lastInput);
      this.form.appendChild(document.createElement('div'));
      this.form.appendChild(document.createElement('div'));

      document.body.appendChild(this.form);
    });

    afterEach(function () {
      this.form.parentNode.removeChild(this.form);
    });

    it('does not call callback at all if none match the Braintree focus element', function () {
      focusChange.removeExtraFocusElements(this.form, this.removeStub);

      expect(this.removeStub).to.not.be.called;
    });

    it('does not call callback at all if only a middle input matches the Braintree focus element', function () {
      focusIntercept.matchFocusElement.withArgs('middle').returns(true);

      focusChange.removeExtraFocusElements(this.form, this.removeStub);

      expect(this.removeStub).to.not.be.called;
    });

    it('finds the first and last user focusable element and calls provided callback on the id of the element if it is a braintree focus element', function () {
      focusIntercept.matchFocusElement.withArgs('first').returns(true);
      focusIntercept.matchFocusElement.withArgs('middle').returns(true);
      focusIntercept.matchFocusElement.withArgs('last').returns(true);

      focusChange.removeExtraFocusElements(this.form, this.removeStub);

      expect(this.removeStub).to.be.calledTwice;
      expect(this.removeStub).to.be.calledWith('first');
      expect(this.removeStub).to.be.calledWith('last');
    });

    it('only calls the callback for the first focusable element if the last element does not match a braintree focus element', function () {
      focusIntercept.matchFocusElement.withArgs('first').returns(true);
      focusIntercept.matchFocusElement.withArgs('middle').returns(true);

      focusChange.removeExtraFocusElements(this.form, this.removeStub);

      expect(this.removeStub).to.be.calledOnce;
      expect(this.removeStub).to.be.calledWith('first');
    });

    it('only calls the callback for the last focusable element if the first element does not match a braintree focus element', function () {
      focusIntercept.matchFocusElement.withArgs('last').returns(true);
      focusIntercept.matchFocusElement.withArgs('middle').returns(true);

      focusChange.removeExtraFocusElements(this.form, this.removeStub);

      expect(this.removeStub).to.be.calledOnce;
      expect(this.removeStub).to.be.calledWith('last');
    });
  });

  describe('createFocusChangeHandler', function () {
    beforeEach(function () {
      this.numberNode = document.createElement('iframe');
      this.cvvNode = document.createElement('iframe');
      this.formNode = document.createElement('form');
      this.numberNode.id = 'number';
      this.cvvNode.id = 'cvv';
      this.formNode.id = 'merchant-form';
      this.numberAfter = createSampleIntercept('number', directions.FORWARD);
      this.cvvBefore = createSampleIntercept('cvv', directions.BACK);

      this.formNode.appendChild(this.numberNode);
      this.formNode.appendChild(this.numberAfter);
      this.formNode.appendChild(this.cvvBefore);
      this.formNode.appendChild(this.cvvNode);
      document.body.appendChild(this.formNode);

      this.removeStub = this.sandbox.stub();
      this.triggerStub = this.sandbox.stub();
      this.handler = focusChange.createFocusChangeHandler({
        onRemoveFocusIntercepts: this.removeStub,
        onTriggerInputFocus: this.triggerStub
      });
    });

    it('fires the `onRemoveFocusIntercepts` callback if there is no form', function () {
      document.body.appendChild(this.numberNode);
      document.body.appendChild(this.numberAfter);
      document.body.appendChild(this.cvvBefore);
      document.body.appendChild(this.cvvNode);

      document.body.removeChild(this.formNode);

      this.handler('number', directions.FORWARD);

      expect(this.triggerStub).not.to.be.called;
      expect(this.removeStub).to.be.calledOnceWithExactly();
    });

    it('moves focus forward when direction is forward', function () {
      this.handler('number', directions.FORWARD);

      expect(this.triggerStub).to.be.calledWith('cvv');
    });

    it('moves focus backward when direction is backward', function () {
      this.handler('cvv', directions.BACK);

      expect(this.triggerStub).to.be.calledWith('number');
    });

    it('only focuses elements that are user-interactive on software keyboards', function () {
      var button = document.createElement('button');

      this.formNode.insertBefore(button, this.cvvBefore);

      this.handler('number', directions.FORWARD);

      expect(this.triggerStub).to.be.calledWith('cvv');
    });

    it('ignores inputs with type hidden', function () {
      var input = document.createElement('input');

      input.setAttribute('type', 'hidden');

      this.formNode.insertBefore(input, this.cvvBefore);

      this.handler('number', directions.FORWARD);

      expect(this.triggerStub).to.be.calledWith('cvv');
    });

    it('ignores inputs with type button', function () {
      var input = document.createElement('input');

      input.setAttribute('type', 'button');

      this.formNode.insertBefore(input, this.cvvBefore);

      this.handler('number', directions.FORWARD);

      expect(this.triggerStub).to.be.calledWith('cvv');
    });

    it('ignores inputs with type reset', function () {
      var input = document.createElement('input');

      input.setAttribute('type', 'reset');

      this.formNode.insertBefore(input, this.cvvBefore);

      this.handler('number', directions.FORWARD);

      expect(this.triggerStub).to.be.calledWith('cvv');
    });

    it('ignores inputs with type submit', function () {
      var input = document.createElement('input');

      input.setAttribute('type', 'submit');

      this.formNode.insertBefore(input, this.cvvBefore);

      this.handler('number', directions.FORWARD);

      expect(this.triggerStub).to.be.calledWith('cvv');
    });

    it('ignores inputs with type checkbox', function () {
      var input = document.createElement('input');

      input.setAttribute('type', 'checkbox');

      this.formNode.insertBefore(input, this.cvvBefore);

      this.handler('number', directions.FORWARD);

      expect(this.triggerStub).to.be.calledWith('cvv');
    });

    it('ignores inputs with type radio', function () {
      var input = document.createElement('input');

      input.setAttribute('type', 'radio');

      this.formNode.insertBefore(input, this.cvvBefore);

      this.handler('number', directions.FORWARD);

      expect(this.triggerStub).to.be.calledWith('cvv');
    });

    it('ignores inputs with type file', function () {
      var input = document.createElement('input');

      input.setAttribute('type', 'file');

      this.formNode.insertBefore(input, this.cvvBefore);

      this.handler('number', directions.FORWARD);

      expect(this.triggerStub).to.be.calledWith('cvv');
    });

    it('does nothing if there is no user-focusable element in the requested direction', function () {
      this.formNode.appendChild(createSampleIntercept('cvv', directions.FORWARD));

      this.handler('cvv', directions.FORWARD);

      expect(this.triggerStub).not.to.be.called;
      expect(this.removeStub).not.to.be.called;
    });

    it('focuses merchant field when merchant field is next user-focusable', function () {
      var input = document.createElement('input');

      input.setAttribute('name', 'cardholder-name');
      this.formNode.insertBefore(input, this.cvvBefore);

      this.handler('number', directions.FORWARD);

      expect(this.triggerStub).not.to.be.called;
      expect(document.activeElement.getAttribute('name')).to.be.string('cardholder-name');
    });

    it('fires `onTriggerInputFocus` with correct type when hosted field is next user-focusable', function () {
      this.handler('number', directions.FORWARD);

      expect(this.triggerStub).to.be.calledWith('cvv');
    });
  });
});
