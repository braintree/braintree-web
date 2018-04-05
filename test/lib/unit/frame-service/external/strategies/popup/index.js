'use strict';

var Popup = require('../../../../../../../src/lib/frame-service/external/strategies/popup');

describe('Popup', function () {
  describe('Constructor', function () {
    it('defaults isClosed to false', function () {
      var popup = new Popup();

      expect(popup.isClosed()).to.equal(false);
    });
  });

  describe('open', function () {
    it('opens a window', function () {
      var popup = new Popup({
        openFrameUrl: 'https://example.com',
        name: 'myFrame'
      });

      this.sandbox.stub(global, 'open');

      popup.open();

      expect(global.open).to.be.calledOnce;
      expect(global.open).to.be.calledWith('https://example.com', 'myFrame', this.sandbox.match.string);
    });
  });

  describe('focus', function () {
    it('calls the frame focus', function () {
      var popup = new Popup();

      popup._frame = {
        focus: this.sandbox.spy()
      };

      popup.focus();

      expect(popup._frame.focus).to.be.calledOnce;
    });
  });

  describe('close', function () {
    it('calls the frame close', function () {
      var popup = new Popup();
      var frame = {
        close: this.sandbox.spy()
      };

      popup._frame = frame;

      popup.close();

      expect(frame.close).to.be.calledOnce;
    });

    it('noop when popup is already closed', function () {
      var popup = new Popup();

      popup._frame = {
        close: this.sandbox.spy()
      };

      popup.close();
      popup.close();

      expect(popup._frame.close).to.not.be.calledOnce;
    });
  });

  describe('closed', function () {
    it('returns false when popup is open', function () {
      var popup = new Popup();

      popup.open();

      expect(popup.isClosed()).to.equal(false);
    });

    it('returns true after popup is closed', function () {
      var popup = new Popup();

      popup.open();
      popup.close();

      expect(popup.isClosed()).to.equal(false);
    });

    it('returns true if there is no handle for the popup (such as from a popup blocker)', function () {
      var popup = new Popup();

      delete popup._frame;

      expect(popup.isClosed()).to.equal(true);
    });

    it('returns true when Window is closed', function () {
      var popup;
      var fakeWindow = {
        closed: false
      };

      this.sandbox.stub(global, 'open').returns(fakeWindow);

      popup = new Popup();
      popup.open();

      expect(popup.isClosed()).to.equal(false);

      fakeWindow.closed = true;

      expect(popup.isClosed()).to.equal(true);
    });
  });

  describe('redirect', function () {
    it('sets frame location href to url', function () {
      var popup = new Popup();

      popup._frame = {
        location: {
          href: ''
        }
      };

      popup.redirect('http://example.com');

      expect(popup._frame.location.href).to.equal('http://example.com');
    });
  });
});
