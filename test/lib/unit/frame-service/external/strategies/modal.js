'use strict';

var Modal = require('../../../../../../src/lib/frame-service/external/strategies/modal');
var browserDetection = require('../../../../../../src/lib/browser-detection');

describe('Modal', function () {
  it('has a focus function', function () {
    var modal = new Modal();

    expect(modal.focus).to.be.a('function');
  });

  describe('Constructor', function () {
    it('defaults closed to null', function () {
      var modal = new Modal();

      expect(modal.closed).to.equal(null);
    });
  });

  describe('open', function () {
    beforeEach(function () {
      this.containerStub = {
        appendChild: this.sandbox.stub(),
        createElement: this.sandbox.stub()
      };
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

      expect(modal.closed).to.equal(false);
    });

    it('sets iframe position to absolute if platform is iOS', function () {
      var modal = new Modal({
        container: this.containerStub
      });
      var fakeDomNode = {
        appendChild: this.sandbox.stub()
      };

      this.sandbox.stub(browserDetection, 'isIos').returns(true);
      this.containerStub.createElement.returns(fakeDomNode);

      modal.open();

      expect(modal._frame.style.position).to.equal('absolute');
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
      expect(modal.closed).to.equal(true);
      expect(container.removeChild).to.have.been.calledOnce;
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
