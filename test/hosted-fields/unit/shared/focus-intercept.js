'use strict';

var browserDetection = require('../../../../src/hosted-fields/shared/browser-detection');
var focusIntercept = require('../../../../src/hosted-fields/shared/focus-intercept');
var directions = require('../../../../src/hosted-fields/shared/constants').navigationDirections;

var DOCUMENT_FRAGMENT_NODE_TYPE = 11;
var ELEMENT_NODE_TYPE = 1;

describe('focusIntercept', function () {
  beforeEach(function () {
    this.sandbox.stub(browserDetection, 'hasSoftwareKeyboard').returns(true);
  });

  describe('generate', function () {
    context('on targeted devices', function () {
      it('adds focus intercept input to page for Firefox', function () {
        var input;

        browserDetection.hasSoftwareKeyboard.returns(false);
        this.sandbox.stub(browserDetection, 'isFirefox').returns(true);

        input = focusIntercept.generate('type', 'direction', this.sandbox.stub());

        expect(input.nodeType).to.equal(ELEMENT_NODE_TYPE);
      });

      it('adds focus intercept input to page for IE', function () {
        var input;

        browserDetection.hasSoftwareKeyboard.returns(false);
        this.sandbox.stub(browserDetection, 'isIE').returns(true);

        input = focusIntercept.generate('type', 'direction', this.sandbox.stub());

        expect(input.nodeType).to.equal(ELEMENT_NODE_TYPE);
      });

      it('has the expected attributes', function () {
        var input = focusIntercept.generate('type', 'direction', this.sandbox.stub());

        expect(input.getAttribute('aria-hidden')).to.be.string('true');
        expect(input.getAttribute('autocomplete')).to.be.string('off');
        expect(input.getAttribute('class')).to.be.string(' focus-intercept');
        expect(input.getAttribute('data-braintree-direction')).to.be.string('direction');
        expect(input.getAttribute('data-braintree-type')).to.be.string('type');
        expect(input.getAttribute('id')).to.be.string('bt-type-direction');
        expect(input.getAttribute('style')).to.be.string('border:none !important;display:block !important;height:1px !important;left:-1px !important;opacity:0 !important;position:absolute !important;top:-1px !important;width:1px !important');
      });

      it('adds event handlers to inputs', function (done) {
        var input = focusIntercept.generate('cvv', directions.BACK, function (event) {
          expect(event.target.getAttribute('id')).to.be.string('bt-cvv-' + directions.BACK);
          expect(event.type).to.be.string('focus');
          done();
        });

        global.triggerEvent('focus', input);
      });

      it('does not blur the input when on a browser with a softrware keyboard', function (done) {
        var input = focusIntercept.generate('cvv', directions.BACK, function () {
          // would happen after the handler is called
          setTimeout(function () {
            expect(input.blur).to.not.be.called;
            done();
          }, 1);
        });

        browserDetection.hasSoftwareKeyboard.returns(true);
        this.sandbox.stub(input, 'blur');

        global.triggerEvent('focus', input);
      });

      it('does blur the input when on a browser without a softrware keyboard', function (done) {
        var input = focusIntercept.generate('cvv', directions.BACK, function () {
          // happens after the handler is called
          setTimeout(function () {
            expect(input.blur).to.be.calledOnce;
            done();
          }, 1);
        });

        browserDetection.hasSoftwareKeyboard.returns(false);
        this.sandbox.stub(input, 'blur');

        global.triggerEvent('focus', input);
      });
    });

    context('on devices that do not require focus intercepts', function () {
      beforeEach(function () {
        browserDetection.hasSoftwareKeyboard.returns(false);
        this.sandbox.stub(browserDetection, 'isFirefox').returns(false);
        this.sandbox.stub(browserDetection, 'isIE').returns(false);
      });

      it('returns an empty document fragment', function () {
        expect(focusIntercept.generate().nodeType).to.equal(DOCUMENT_FRAGMENT_NODE_TYPE);
      });
    });
  });

  describe('destroy', function () {
    it('does nothing if there are not focusIntercept inputs to destroy', function () {
      this.sandbox.spy(Node.prototype, 'removeChild');
      focusIntercept.destroy();

      expect(Node.prototype.removeChild).not.to.be.called;
    });

    context('on targeted devices', function () {
      it('removes the desired focusInput when called with an ID string', function () {
        document.body.appendChild(focusIntercept.generate('cvv', directions.FORWARD, this.sandbox.stub()));

        expect(document.getElementsByClassName('focus-intercept')).to.have.length(1);
        focusIntercept.destroy('bt-cvv-' + directions.FORWARD);
        expect(document.getElementsByClassName('focus-intercept')).to.have.length(0);
      });

      it('removes the desired internal focusInput when called with an ID string', function () {
        document.body.appendChild(focusIntercept.generate('cvv', directions.FORWARD, this.sandbox.stub()));

        expect(document.getElementsByClassName('focus-intercept')).to.have.length(1);
        focusIntercept.destroy('bt-cvv-' + directions.FORWARD);
        expect(document.getElementsByClassName('focus-intercept')).to.have.length(0);
      });

      it('does not remove anything when argument does not match existing element', function () {
        document.body.appendChild(focusIntercept.generate('cvv', directions.BACK, this.sandbox.stub()));

        expect(document.getElementsByClassName('focus-intercept')).to.have.length(1);
        focusIntercept.destroy('bt-number-' + directions.FORWARD);
        expect(document.getElementsByClassName('focus-intercept')).to.have.length(1);
      });

      it('removes all focusIntercept inputs when called without an ID string', function () {
        document.body.appendChild(focusIntercept.generate('number', directions.BACK, this.sandbox.stub()));
        document.body.appendChild(focusIntercept.generate('number', directions.FORWARD, this.sandbox.stub()));
        document.body.appendChild(focusIntercept.generate('expirationDate', directions.BACK, this.sandbox.stub()));
        document.body.appendChild(focusIntercept.generate('expirationDate', directions.FORWARD, this.sandbox.stub()));
        document.body.appendChild(focusIntercept.generate('cvv', directions.BACK, this.sandbox.stub()));
        document.body.appendChild(focusIntercept.generate('cvv', directions.FORWARD, this.sandbox.stub()));

        expect(document.getElementsByClassName('focus-intercept')).to.have.length(6);
        focusIntercept.destroy();
        expect(document.getElementsByClassName('focus-intercept')).to.have.length(0);
      });

      it('removes all focusIntercept inputs when called with a falsy value', function () {
        document.body.appendChild(focusIntercept.generate('number', directions.BACK, this.sandbox.stub()));
        document.body.appendChild(focusIntercept.generate('number', directions.FORWARD, this.sandbox.stub()));
        document.body.appendChild(focusIntercept.generate('expirationDate', directions.BACK, this.sandbox.stub()));
        document.body.appendChild(focusIntercept.generate('expirationDate', directions.FORWARD, this.sandbox.stub()));
        document.body.appendChild(focusIntercept.generate('cvv', directions.BACK, this.sandbox.stub()));
        document.body.appendChild(focusIntercept.generate('cvv', directions.FORWARD, this.sandbox.stub()));

        expect(document.getElementsByClassName('focus-intercept')).to.have.length(6);
        focusIntercept.destroy(null);
        expect(document.getElementsByClassName('focus-intercept')).to.have.length(0);
      });

      it('does not remove element with ID that matches argument but is not a focusIntercept', function () {
        var protectedElement = document.createElement('input');

        protectedElement.setAttribute('aria-hidden', 'true');
        protectedElement.setAttribute('autocomplete', 'off');
        protectedElement.setAttribute('class', ' focus-intercept');
        protectedElement.setAttribute('id', 'do-not-destroy-me');

        document.body.appendChild(focusIntercept.generate('number', directions.BACK, this.sandbox.stub()));
        document.body.appendChild(protectedElement);
        document.body.appendChild(focusIntercept.generate('number', directions.FORWARD, this.sandbox.stub()));

        expect(document.getElementsByClassName('focus-intercept')).to.have.length(3);
        focusIntercept.destroy('do-not-destroy-me');
        expect(document.getElementsByClassName('focus-intercept')).to.have.length(3);
      });
    });
  });

  describe('match', function () {
    it('returns true when passed in a string matching focusIntercept ids', function () {
      expect(focusIntercept.matchFocusElement('bt-cvv-' + directions.FORWARD)).to.equal(true);
    });

    it('returns false when no id is passed in', function () {
      expect(focusIntercept.matchFocusElement()).to.equal(false);
    });

    it('returns false when passed in a string that does not contain an allowed field', function () {
      expect(focusIntercept.matchFocusElement('bt-name-' + directions.FORWARD)).to.equal(false);
    });

    it('returns false when passed in a string that does not match focusIntercept ids', function () {
      expect(focusIntercept.matchFocusElement('bring-me-a-popsicle')).to.equal(false);
    });
  });
});
