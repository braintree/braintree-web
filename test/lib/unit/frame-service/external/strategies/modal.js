'use strict';

var Modal = require('../../../../../../src/lib/frame-service/external/strategies/modal');
var browserDetection = require('browser-detection');

describe('Modal', function () {
  it('has a focus function', function () {
    var modal = new Modal();

    expect(modal.focus).to.be.a('function');
  });

  it('has a isClosed function', function () {
    var modal = new Modal();

    expect(modal.isClosed).to.be.a('function');
  });

  describe('Constructor', function () {
    it('defaults closed to false', function () {
      var modal = new Modal();

      expect(modal.isClosed()).to.equal(false);
    });
  });

  describe('open', function () {
    beforeEach(function () {
      this.containerStub = {
        appendChild: this.sandbox.stub(),
        createElement: this.sandbox.stub()
      };
    });

    afterEach(function () {
      document.body.removeAttribute('style');
    });

    it('adds an iframe to a container', function () {
      var container = document.createElement('div');
      var modal = new Modal({container: container});

      modal.open();

      expect(container.children).to.have.lengthOf(1);
      expect(container.children[0]).to.be.an.instanceOf(HTMLIFrameElement);
    });

    it('sets closed to false', function () {
      var modal = new Modal();

      modal.open();

      expect(modal.isClosed()).to.equal(false);
    });

    it('inserts iframe into a div if platform is iOS', function () {
      var container = document.createElement('div');
      var modal = new Modal({
        container: container
      });

      this.sandbox.stub(browserDetection, 'isIos').returns(true);

      modal.open();

      expect(container.children).to.have.lengthOf(1);
      expect(container.children[0]).to.be.an.instanceOf(HTMLDivElement);
      expect(container.children[0].children).to.have.lengthOf(1);
      expect(container.children[0].children[0]).to.be.an.instanceOf(HTMLIFrameElement);
    });

    it('adds styling to iframe div wrapper if platform is iOS', function () {
      var div;
      var container = document.createElement('div');
      var modal = new Modal({
        container: container
      });

      this.sandbox.stub(browserDetection, 'isIos').returns(true);

      modal.open();

      div = container.children[0];
      expect(div.style.height).to.equal('100%');
      expect(div.style.width).to.equal('100%');
      expect(div.style.overflow).to.equal('auto');
      expect(div.style['-webkit-overflow-scrolling']).to.equal('touch');
    });

    it('sets no styles to iframe if platform is iOS and using WKWebView', function () {
      var iframe;
      var container = document.createElement('div');
      var modal = new Modal({
        container: container
      });

      this.sandbox.stub(browserDetection, 'isIos').returns(true);
      this.sandbox.stub(browserDetection, 'isIosWKWebview').returns(true);

      modal.open();

      iframe = container.children[0].children[0];
      ['position', 'top', 'left', 'bottom', 'padding', 'margin', 'border', 'outline', 'zIndex', 'background'].forEach(function (s) {
        expect(iframe.style[s]).to.be.empty;
      });
    });

    it('locks scrolling on body if platform is iOS and using WKWebView', function () {
      var container = document.createElement('div');
      var modal = new Modal({
        container: container
      });

      this.sandbox.stub(browserDetection, 'isIos').returns(true);
      this.sandbox.stub(browserDetection, 'isIosWKWebview').returns(true);

      modal.open();

      expect(document.body.style.overflow).to.equal('hidden');
      expect(document.body.style.position).to.equal('fixed');
    });

    it('does not lock scrolling on body by default', function () {
      var container = document.createElement('div');
      var modal = new Modal({
        container: container
      });

      this.sandbox.stub(browserDetection, 'isIos').returns(false);
      this.sandbox.stub(browserDetection, 'isIosWKWebview').returns(false);

      modal.open();

      expect(document.body.style.overflow).to.not.equal('hidden');
      expect(document.body.style.position).to.not.equal('fixed');
    });

    it('does not lock scrolling on body when platform is iOS but not using WKWebView', function () {
      var container = document.createElement('div');
      var modal = new Modal({
        container: container
      });

      this.sandbox.stub(browserDetection, 'isIos').returns(true);
      this.sandbox.stub(browserDetection, 'isIosWKWebview').returns(false);

      modal.open();

      expect(document.body.style.overflow).to.not.equal('hidden');
      expect(document.body.style.position).to.not.equal('fixed');
    });

    it('scrolls to top if platform is iOS and using WKWebView', function () {
      var container = document.createElement('div');
      var modal = new Modal({
        container: container
      });

      this.sandbox.stub(global, 'scrollTo');
      this.sandbox.stub(browserDetection, 'isIos').returns(true);
      this.sandbox.stub(browserDetection, 'isIosWKWebview').returns(true);

      modal.open();

      expect(global.scrollTo).to.be.calledWith(0, 0);
    });
  });

  describe('close', function () {
    it('removes frame and sets frame to null', function () {
      var container = {
        appendChild: function () {},
        removeChild: this.sandbox.stub()
      };
      var modal = new Modal({
        container: container
      });

      modal.open();
      modal.close();

      expect(modal._frame).to.equal(null);
      expect(modal.isClosed()).to.equal(true);
      expect(container.removeChild).to.have.been.calledOnce;
    });

    it('unlocks scrolling on body if platform is iOS and using WKWebView', function () {
      var container = document.createElement('div');
      var modal = new Modal({
        container: container
      });

      document.body.style.overflow = 'visible';
      document.body.style.position = 'static';

      this.sandbox.stub(browserDetection, 'isIos').returns(true);
      this.sandbox.stub(browserDetection, 'isIosWKWebview').returns(true);

      modal.open();
      modal.close();

      expect(document.body.style.overflow).to.equal('visible');
      expect(document.body.style.position).to.equal('static');
    });

    it('scrolls back to previous user position if platform is iOS and using WKWebView', function () {
      var container = document.createElement('div');
      var modal = new Modal({
        container: container
      });

      this.sandbox.stub(browserDetection, 'isIos').returns(true);
      this.sandbox.stub(browserDetection, 'isIosWKWebview').returns(true);
      this.sandbox.stub(global, 'scrollTo');

      modal.open();

      modal._savedBodyProperties.left = 10;
      modal._savedBodyProperties.top = 20;

      modal.close();

      expect(global.scrollTo).to.be.calledWith(10, 20);
    });
  });

  describe('redirect', function () {
    it('sets frame src to url', function () {
      var redirectUrl = 'expected redirect url';
      var frame = {};

      Modal.prototype.redirect.call({
        _frame: frame
      }, redirectUrl);

      expect(frame.src).to.equal(redirectUrl);
    });
  });
});
