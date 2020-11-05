'use strict';

const initializeBankFrame = require('../../../../src/three-d-secure/internal/bank-frame');
const Bus = require('framebus');
const BraintreeError = require('../../../../src/lib/braintree-error');
const queryString = require('../../../../src/lib/querystring');

describe('initializeBankFrame', () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
    testContext.oldWindowName = window.name;
    window.name = 'abc_123';

    testContext.svg = document.createElement('svg');
    testContext.svg.style.display = 'none';
    document.body.appendChild(testContext.svg);

    testContext.oldFormSubmit = HTMLFormElement.prototype.submit;
  });

  afterEach(() => {
    const form = document.body.querySelector('form');

    window.name = testContext.oldWindowName;
    document.body.removeChild(testContext.svg);

    if (form) {
      document.body.removeChild(form);
    }

    HTMLFormElement.prototype.submit = testContext.oldFormSubmit;
  });

  it('emits a BUS_CONFIGURATION_REQUEST on the bus', () => {
    initializeBankFrame();

    expect(Bus.prototype.emit).toHaveBeenCalledWith('BUS_CONFIGURATION_REQUEST', expect.any(Function));
  });

  it('removes hidden class from loader if params include showLoader=true', () => {
    const fakeDomNode = {
      className: 'hidden'
    };

    jest.spyOn(queryString, 'parse').mockReturnValue({
      showLoader: 'true'
    });
    jest.spyOn(document, 'querySelector').mockReturnValue(fakeDomNode);

    initializeBankFrame();

    expect(fakeDomNode.className).toBe('');
  });

  it('retains hidden class from loader if params do not include showLoader=true', () => {
    const fakeDomNode = {
      className: 'hidden'
    };

    jest.spyOn(queryString, 'parse').mockReturnValue({
      showLoader: 'not true'
    });
    jest.spyOn(document, 'querySelector').mockReturnValue(fakeDomNode);

    initializeBankFrame();

    expect(fakeDomNode.className).toBe('hidden');
  });

  it('throw an error if termUrl is not a valid domain', done => {
    let handleConfiguration;

    initializeBankFrame();

    handleConfiguration = Bus.prototype.emit.mock.calls[0][1];

    try {
      handleConfiguration({
        acsUrl: 'http://example.com/acs',
        pareq: 'the pareq',
        md: 'the md',
        termUrl: 'https://malicious.domain.com'
      });
    } catch (err) {
      expect(err).toBeInstanceOf(BraintreeError);
      expect(err.type).toBe(BraintreeError.types.INTERNAL);
      expect(err.code).toBe('THREEDS_TERM_URL_REQUIRES_BRAINTREE_DOMAIN');
      expect(err.message).toBe('Term Url must be on a Braintree domain.');

      done();
    }
  });

  it('inserts and submits a form based on the inputs in its URL', done => {
    let handleConfiguration;

    jest.spyOn(Bus.prototype, 'emit');

    initializeBankFrame();

    handleConfiguration = Bus.prototype.emit.mock.calls[0][1];

    jest.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation((...args) => {
      let input;
      const form = document.body.querySelector('form');

      expect(args).toHaveLength(0);

      expect(form.getAttribute('action')).toBe('http://example.com/acs');
      expect(form.getAttribute('method')).toBe('POST');
      expect(form.querySelectorAll('input')).toHaveLength(3);

      input = form.querySelector('input[name="PaReq"]');
      expect(input.type).toBe('hidden');
      expect(input.value).toBe('the pareq');

      input = form.querySelector('input[name="MD"]');
      expect(input.type).toBe('hidden');
      expect(input.value).toBe('the md');

      input = form.querySelector('input[name="TermUrl"]');
      expect(input.type).toBe('hidden');
      expect(input.value).toBe('https://braintreepayments.com/some/url');

      done();
    });

    handleConfiguration({
      acsUrl: 'http://example.com/acs',
      pareq: 'the pareq',
      md: 'the md',
      termUrl: 'https://braintreepayments.com/some/url'
    });
  });

  it('sanitizes acs url', done => {
    let handleConfiguration;

    initializeBankFrame();

    handleConfiguration = Bus.prototype.emit.mock.calls[0][1];

    jest.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(() => {
      const form = document.body.querySelector('form');

      expect(form.getAttribute('action')).toBe('about:blank');

      done();
    });

    handleConfiguration({
      acsUrl: decodeURIComponent('jaVa%0ascript:alert(document.domain)'), // eslint-disable-line no-script-url
      pareq: 'the pareq',
      md: 'the md',
      termUrl: 'https://braintreepayments.com/some/url'
    });
  });
});
