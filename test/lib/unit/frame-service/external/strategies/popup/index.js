'use strict';

var Popup = require('../../../../../../../src/lib/frame-service/external/strategies/popup');

describe('Popup', function () {
  describe('Constructor', function () {
    it('defaults closed to false', function () {
      var popup = new Popup();

      expect(popup.closed).to.equal(false);
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

    it('sets closed to false', function () {
      var popup = new Popup();

      this.sandbox.stub(global, 'open');

      popup.open();

      expect(popup.closed).to.equal(false);
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

      popup.closed = true;
      popup._frame = {
        close: this.sandbox.spy()
      };

      popup.close();

      expect(popup._frame.close).to.not.be.called;
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
