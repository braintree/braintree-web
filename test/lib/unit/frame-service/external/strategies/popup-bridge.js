'use strict';

var PopupBridge = require('../../../../../../src/lib/frame-service/external/strategies/popup-bridge');
var BraintreeError = require('../../../../../../src/lib/braintree-error');

describe('PopupBridge', function () {
  beforeEach(function () {
    this.originalPopupBridge = global.popupbridge;

    global.popupBridge = {
      open: this.sandbox.stub()
    };
  });

  afterEach(function () {
    global.popupBridge = this.originalPopupBridge;
  });

  it('Constructor', function () {
    it('defaults closed to null', function () {
      var popupBridge = new PopupBridge();

      expect(popupBridge.closed).to.be(null);
    });
  });

  it('has a focus function', function () {
    var popupBridge = new PopupBridge();

    expect(popupBridge.focus).to.be.a('function');
  });

  it('has a close function', function () {
    var popupBridge = new PopupBridge();

    expect(popupBridge.close).to.be.a('function');
  });

  describe('initialize', function () {
    it('sets an onComplete function on global.popupBridge', function () {
      var popupBridge = new PopupBridge({});
      var cb = this.sandbox.stub();

      popupBridge.initialize(cb);

      expect(global.popupBridge.onComplete).to.be.a('function');
    });

    it('calls callback with payload when onComplete is called', function () {
      var popupBridge = new PopupBridge({});
      var payload = {foo: 'bar'};
      var cb = this.sandbox.stub();

      popupBridge.initialize(cb);

      global.popupBridge.onComplete(null, payload);

      expect(cb).to.be.calledOnce;
      expect(cb).to.be.calledWith(null, payload);
    });

    it('sets closed to true', function () {
      var popupBridge = new PopupBridge({});
      var payload = {foo: 'bar'};
      var cb = this.sandbox.stub();

      popupBridge.initialize(cb);

      global.popupBridge.onComplete(null, payload);

      expect(popupBridge.closed).to.equal(true);
    });

    it('calls callback with error when onComplete is called with an error', function (done) {
      var popupBridge = new PopupBridge({});
      var error = new Error('Some error');

      popupBridge.initialize(function (err, payload) {
        expect(payload).to.not.exist;
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.message).to.equal('Frame closed before tokenization could occur.');
        done();
      });

      global.popupBridge.onComplete(error);
    });

    it('calls callback with error when onComplete is called without an error or payload', function (done) {
      var popupBridge = new PopupBridge({});

      popupBridge.initialize(function (err, payload) {
        expect(payload).to.not.exist;
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.message).to.equal('Frame closed before tokenization could occur.');
        done();
      });

      global.popupBridge.onComplete();
    });
  });

  describe('open', function () {
    it('sets closed to false', function () {
      var popupBridge = new PopupBridge({
        openFrameUrl: 'foo'
      });

      popupBridge.open();

      expect(popupBridge.closed).to.equal(false);
    });

    it('calls popupBridge.open with instantiated url', function () {
      var url = 'open url';
      var popupBridge = new PopupBridge({
        openFrameUrl: url
      });

      popupBridge.open();

      expect(global.popupBridge.open).to.be.calledOnce;
      expect(global.popupBridge.open).to.be.calledWith(url);
    });

    it('calls popupBridge.open with passed in url if provided', function () {
      var url = 'new url';
      var popupBridge = new PopupBridge({
        openFrameUrl: 'initializedurl'
      });

      popupBridge.open({
        openFrameUrl: url
      });

      expect(global.popupBridge.open).to.be.calledOnce;
      expect(global.popupBridge.open).to.be.calledWith(url);
    });
  });

  describe('redirect', function () {
    it('calls open with frameUrl', function () {
      var redirectUrl = 'expected redirect url';
      var popupBridge = new PopupBridge({});

      this.sandbox.stub(popupBridge, 'open');

      popupBridge.redirect(redirectUrl);

      expect(popupBridge.open).to.be.calledOnce;
      expect(popupBridge.open).to.be.calledWith({
        openFrameUrl: redirectUrl
      });
    });
  });
});
