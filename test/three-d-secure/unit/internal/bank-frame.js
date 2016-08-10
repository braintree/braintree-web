'use strict';

var initializeBankFrame = require('../../../../src/three-d-secure/internal/bank-frame');
var Bus = require('../../../../src/lib/bus');
var BraintreeError = require('../../../../src/lib/error');

describe('initializeBankFrame', function () {
  beforeEach(function () {
    this.oldWindowName = window.name;
    window.name = 'abc_123';

    this.svg = document.createElement('svg');
    this.svg.style.display = 'none';
    document.body.appendChild(this.svg);

    this.oldFormSubmit = HTMLFormElement.prototype.submit;
  });

  afterEach(function () {
    window.name = this.oldWindowName;

    document.body.removeChild(this.svg);

    HTMLFormElement.prototype.submit = this.oldFormSubmit;
  });

  it('emits a CONFIGURATION_REQUEST on the bus', function () {
    initializeBankFrame();

    expect(Bus.prototype.emit).to.have.been.calledWith(Bus.events.CONFIGURATION_REQUEST, this.sandbox.match.func);
  });

  it('throw an error if termUrl is not a valid domain', function (done) {
    var handleConfiguration;

    initializeBankFrame();

    handleConfiguration = Bus.prototype.emit.getCall(0).args[1];

    try {
      handleConfiguration({
        acsUrl: 'http://example.com/acs',
        pareq: 'the pareq',
        md: 'the md',
        termUrl: 'https://malicious.domain.com'
      });
    } catch (err) {
      expect(err).to.be.an.instanceof(BraintreeError);
      expect(err.type).to.equal(BraintreeError.types.INTERNAL);
      expect(err.code).to.equal('THREEDS_TERM_URL_REQUIRES_BRAINTREE_DOMAIN');
      expect(err.message).to.equal('Term Url must be on a Braintree domain.');

      done();
    }
  });

  it('inserts and submits a form based on the inputs in its URL', function (done) {
    var handleConfiguration;

    initializeBankFrame();

    handleConfiguration = Bus.prototype.emit.getCall(0).args[1];

    HTMLFormElement.prototype.submit = function () {
      var input;
      var form = document.body.querySelector('form');

      expect(arguments).to.have.lengthOf(0);

      expect(form.getAttribute('action')).to.equal('http://example.com/acs');
      expect(form.getAttribute('method')).to.equal('POST');
      expect(form.querySelectorAll('input')).to.have.lengthOf(3);

      input = form.querySelector('input[name="PaReq"]');
      expect(input.type).to.equal('hidden');
      expect(input.value).to.equal('the pareq');

      input = form.querySelector('input[name="MD"]');
      expect(input.type).to.equal('hidden');
      expect(input.value).to.equal('the md');

      input = form.querySelector('input[name="TermUrl"]');
      expect(input.type).to.equal('hidden');
      expect(input.value).to.equal('https://braintreepayments.com/some/url');

      done();
    };

    handleConfiguration({
      acsUrl: 'http://example.com/acs',
      pareq: 'the pareq',
      md: 'the md',
      termUrl: 'https://braintreepayments.com/some/url'
    });
  });
});
