'use strict';

var FrameService = require('../../../../../src/lib/frame-service/external/frame-service');
var constants = require('../../../../../src/lib/frame-service/shared/constants');
var events = require('../../../../../src/lib/frame-service/shared/events');
var popup = require('../../../../../src/lib/frame-service/external/popup');
var BraintreeBus = require('../../../../../src/lib/bus');
var BraintreeError = require('../../../../../src/lib/braintree-error');

function noop() {}

describe('FrameService', function () {
  beforeEach(function () {
    var gatewayConfiguration = {
      assetsUrl: 'https://assets',
      paypal: {
        assetsUrl: 'https://paypal.assets.url',
        displayName: 'my brand'
      }
    };

    this.state = {
      client: {
        authorization: 'fake authorization-key',
        gatewayConfiguration: gatewayConfiguration,
        getConfiguration: function () {
          return {
            gatewayConfiguration: gatewayConfiguration
          };
        }
      },
      enableShippingAddress: true,
      amount: 10.00,
      currency: 'USD',
      locale: 'en_us',
      flow: 'checkout',
      shippingAddressOverride: {
        street: '123 Townsend St'
      }
    };

    this.options = {
      state: this.state,
      name: 'fake_name',
      dispatchFrameUrl: 'fake-url',
      openFrameUrl: 'fake-landing-frame-html'
    };
  });

  describe('Constructor', function () {
    describe('frameConfiguration validation', function () {
      it('throws an error if no frameConfiguration is provided', function () {
        function fn() {
          return new FrameService();
        }

        expect(fn).to.throw('Valid configuration is required');
      });

      it('throws an error if a name is not provided', function () {
        function fn() {
          return new FrameService({dispatchFrameUrl: 'bar'});
        }

        expect(fn).to.throw('A valid frame name must be provided');
      });

      it('throws an error if dispatchFrameUrl is not provided', function () {
        function fn() {
          return new FrameService({name: 'foo'});
        }

        expect(fn).to.throw('A valid frame dispatchFrameUrl must be provided');
      });

      it('throws an error if a openFrameUrl is not provided', function () {
        function fn() {
          return new FrameService({name: 'foo', dispatchFrameUrl: 'foo.biz'});
        }

        expect(fn).to.throw('A valid frame openFrameUrl must be provided');
      });

      [
        'foo-bar',
        'foo bar',
        ' ',
        '',
        '!!!'
      ].forEach(function (frame) {
        it('throws an error if ' + frame + ' is provided as frame name', function () {
          function fn() {
            return new FrameService({}, {
              url: 'bar',
              name: frame,
              landingFrameHTML: 'baz'
            });
          }

          expect(fn).to.throw('A valid frame name must be provided');
        });
      });
    });

    it('assigns a _serviceId property', function () {
      var frameService = new FrameService(this.options);

      expect(frameService._serviceId).to.exist;
    });

    it('assigns an _options model', function () {
      var frameService = new FrameService(this.options);

      expect(frameService._options.name).to.equal(this.options.name + '_' + frameService._serviceId);
      expect(frameService._options.dispatchFrameUrl).to.equal(this.options.dispatchFrameUrl);
      expect(frameService._options.openFrameUrl).to.equal(this.options.openFrameUrl);
    });

    it('can optionally assign height and width', function () {
      var frameService;

      this.options.height = 100;
      this.options.width = 150;
      frameService = new FrameService(this.options);

      expect(frameService._options.height).to.equal(100);
      expect(frameService._options.width).to.equal(150);
    });

    it('assigns state property', function () {
      var frameService = new FrameService(this.options);

      expect(frameService.state).to.deep.equal(
        this.state
      );
    });

    it('creates a bus instance', function () {
      var frameService = new FrameService(this.options);

      expect(frameService._bus).to.be.an.instanceof(BraintreeBus);
      expect(frameService._bus.channel).to.equal(frameService._serviceId);
    });

    it('makes call to attach bus event listeners', function () {
      var frameService;

      this.sandbox.stub(FrameService.prototype, '_setBusEvents');

      frameService = new FrameService(this.options);

      expect(frameService._setBusEvents).to.be.called;
    });
  });

  describe('initialize', function () {
    it('listens for dispatch frame to report ready', function () {
      var context = {
        _bus: {on: this.sandbox.stub()},
        _writeDispatchFrame: noop
      };

      FrameService.prototype.initialize.call(context, noop);

      expect(context._bus.on).to.be.calledWith(
        events.DISPATCH_FRAME_READY,
        this.sandbox.match.func
      );
    });

    it('calls callback when dispatch frame is ready', function () {
      var fakeBus = {
        listeners: [],
        on: function (eventName, callback) {
          this.listeners.push({
            eventName: eventName,
            callback: callback
          });
        },
        off: function (eventName) {
          this.listeners.forEach(function (listener, i) {
            if (listener.eventName === eventName) {
              this.listeners.splice(i, 1);
            }
          }.bind(this));
        },
        emit: function (eventName) {
          this.listeners.forEach(function (listener) {
            if (listener.eventName === eventName) {
              listener.callback();
            }
          });
        }
      };

      var context = {
        _bus: fakeBus,
        _writeDispatchFrame: noop
      };
      var callback = this.sandbox.stub();

      FrameService.prototype.initialize.call(context, callback);

      fakeBus.emit(events.DISPATCH_FRAME_READY);
      expect(callback).to.be.called;
    });

    it('removes event listener once dispatched', function () {
      var fakeBus = {
        listeners: [],
        on: function (eventName, callback) {
          this.listeners.push({
            eventName: eventName,
            callback: callback
          });
        },
        off: function (eventName) {
          this.listeners.forEach(function (listener, i) {
            if (listener.eventName === eventName) {
              this.listeners.splice(i, 1);
            }
          }.bind(this));
        },
        emit: function (eventName) {
          this.listeners.forEach(function (listener) {
            if (listener.eventName === eventName) {
              listener.callback();
            }
          });
        }
      };

      var context = {
        _bus: fakeBus,
        _writeDispatchFrame: noop
      };
      var callback = this.sandbox.stub();

      FrameService.prototype.initialize.call(context, callback);

      fakeBus.emit(events.DISPATCH_FRAME_READY);
      fakeBus.emit(events.DISPATCH_FRAME_READY);
      fakeBus.emit(events.DISPATCH_FRAME_READY);
      expect(callback).to.be.called;
      expect(callback.callCount).to.equal(1);
    });

    it('makes a call to write a dispatch frame', function () {
      var writeDispatchFrameStub = this.sandbox.stub();
      var context = {
        _bus: {
          on: noop,
          off: noop
        },
        _writeDispatchFrame: writeDispatchFrameStub
      };

      FrameService.prototype.initialize.call(context, noop);

      expect(writeDispatchFrameStub).to.be.called;
    });
  });

  describe('_writeDispatchFrame', function () {
    it('assigns a _dispatchFrame property on the instance', function () {
      var frameService = new FrameService(this.options);

      frameService._writeDispatchFrame();

      expect(frameService._dispatchFrame.nodeType).to.equal(1);
      expect(frameService._dispatchFrame.getAttribute('src')).to.equal(
        this.options.dispatchFrameUrl
      );
      expect(frameService._dispatchFrame.getAttribute('name')).to.equal(
        constants.DISPATCH_FRAME_NAME + '_' + frameService._serviceId
      );
      expect(frameService._dispatchFrame.style.position).to.equal('absolute');
      expect(frameService._dispatchFrame.style.left).to.equal('-9999px');
      expect(frameService._dispatchFrame.className).to.equal(constants.DISPATCH_FRAME_CLASS);
    });

    it('writes iframe to body', function () {
      var frameService = new FrameService(this.options);

      this.sandbox.stub(document.body, 'appendChild');

      frameService._writeDispatchFrame();

      expect(document.body.appendChild).to.be.calledWith(frameService._dispatchFrame);
    });
  });

  describe('_setBusEvents', function () {
    it('listens for a frame report', function () {
      var context = {
        _bus: {on: this.sandbox.stub()}
      };

      FrameService.prototype._setBusEvents.call(context);

      expect(context._bus.on).to.be.calledWith(events.DISPATCH_FRAME_REPORT, this.sandbox.match.func);
    });

    it('listens for a configuration request', function () {
      var context = {
        _bus: {on: this.sandbox.stub()}
      };

      FrameService.prototype._setBusEvents.call(context);

      expect(context._bus.on).to.be.calledWith(BraintreeBus.events.CONFIGURATION_REQUEST, this.sandbox.match.func);
    });

    it('calls _onCompleteCallback with provided arguments', function () {
      var fakeBus = {
        listeners: [],
        on: function (eventName, callback) {
          this.listeners.push({
            eventName: eventName,
            callback: callback
          });
        },
        off: function (eventName) {
          this.listeners.forEach(function (listener, i) {
            if (listener.eventName === eventName) {
              this.listeners.splice(i, 1);
            }
          }.bind(this));
        },
        emit: function (eventName, payload) {
          this.listeners.forEach(function (listener) {
            if (listener.eventName === eventName) {
              listener.callback(payload);
            }
          });
        }
      };
      var onCompleteCallbackPayload = null;
      var context = {
        _bus: fakeBus,
        close: this.sandbox.stub(),
        _onCompleteCallback: function (err, payload) {
          onCompleteCallbackPayload = [err, payload];
        }
      };
      var fakeErr = 'fakeErr';
      var fakePayload = 'fakePayload';

      FrameService.prototype._setBusEvents.call(context);

      context._bus.emit(events.DISPATCH_FRAME_REPORT, {
        err: fakeErr,
        payload: fakePayload
      });

      expect(onCompleteCallbackPayload).to.deep.equal([
        fakeErr,
        fakePayload
      ]);
    });

    it('sets _onCompleteCallback to null after calling', function () {
      var fakeBus = {
        listeners: [],
        on: function (eventName, callback) {
          this.listeners.push({
            eventName: eventName,
            callback: callback
          });
        },
        off: function (eventName) {
          this.listeners.forEach(function (listener, i) {
            if (listener.eventName === eventName) {
              this.listeners.splice(i, 1);
            }
          }.bind(this));
        },
        emit: function (eventName, payload) {
          this.listeners.forEach(function (listener) {
            if (listener.eventName === eventName) {
              listener.callback(payload);
            }
          });
        }
      };
      var context = {
        _bus: fakeBus,
        close: this.sandbox.stub(),
        _onCompleteCallback: noop
      };

      FrameService.prototype._setBusEvents.call(context);

      context._bus.emit(events.DISPATCH_FRAME_REPORT, {err: null, payload: null});

      expect(context._onCompleteCallback).to.equal(null);
    });
  });

  describe('_initializePopupBridge', function () {
    describe('PopupBridge.onComplete', function () {
      beforeEach(function () {
        global.popupBridge = {};
      });
      afterEach(function () {
        delete global.popupBridge;
      });

      it('calls callback with frame closed when error', function (done) {
        FrameService.prototype._initializePopupBridge(function (err, payload) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal(BraintreeError.types.INTERNAL);
          expect(err.code).to.equal('FRAME_SERVICE_FRAME_CLOSED');
          expect(err.message).to.equal('Frame closed before tokenization could occur.');
          expect(payload).to.not.exist;
          done();
        });
        global.popupBridge.onComplete(new Error('Failed'));
      });

      it('calls callback with frame closed when error and payload are null', function (done) {
        FrameService.prototype._initializePopupBridge(function (err, payload) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal(BraintreeError.types.INTERNAL);
          expect(err.code).to.equal('FRAME_SERVICE_FRAME_CLOSED');
          expect(err.message).to.equal('Frame closed before tokenization could occur.');
          expect(payload).to.not.exist;
          done();
        });
        global.popupBridge.onComplete(null, null);
      });

      it('calls callback with payload if error is null and payload exists', function (done) {
        FrameService.prototype._initializePopupBridge(function (err, payload) {
          expect(err).to.not.exist;
          expect(payload).to.deep.equal({foo: 'bar'});
          done();
        });
        global.popupBridge.onComplete(null, {foo: 'bar'});
      });
    });
  });

  describe('_openPopupBridge', function () {
    it('calls popup open with options', function () {
      var context = {
        _options: {
          foo: 'bar'
        }
      };
      var options = {
        param: 'value'
      };

      this.sandbox.stub(popup, 'open');

      FrameService.prototype._openPopupBridge.call(context, options);
      expect(popup.open).to.be.calledWith({
        foo: 'bar',
        param: 'value'
      });
    });
  });

  describe('open', function () {
    it('maps provided callback to instance', function () {
      var frameService;
      var callback = this.sandbox.stub();

      this.sandbox.stub(FrameService.prototype, '_pollForPopupClose');
      frameService = new FrameService(this.options);
      this.sandbox.stub(popup, 'open');

      frameService.open(callback);

      expect(frameService._onCompleteCallback).to.equal(callback);
    });

    it('sets frame property to instance', function () {
      var frameService;
      var callback = this.sandbox.stub();
      var fakeFrame = {close: 'close'};

      this.sandbox.stub(FrameService.prototype, '_pollForPopupClose');
      frameService = new FrameService(this.options);
      this.sandbox.stub(popup, 'open').returns(fakeFrame);

      frameService.open(callback);

      expect(frameService._frame).to.deep.equal(fakeFrame);
    });

    it('calls the callback with error when popup fails to open', function () {
      var frameService = new FrameService(this.options);
      var fakeFrame = {closed: true};
      var mockCallback = this.sandbox.stub();

      this.sandbox.stub(popup, 'open').returns(fakeFrame);

      frameService.open(mockCallback);

      expect(mockCallback).to.be.calledWith(this.sandbox.match({
        type: BraintreeError.types.INTERNAL,
        code: 'FRAME_SERVICE_FRAME_OPEN_FAILED',
        message: 'Frame failed to open.'
      }));
    });

    it('cleans up the frame when popup fails to open', function (done) {
      var frameService = new FrameService(this.options);
      var fakeFrame = {closed: true};

      this.sandbox.stub(popup, 'open').returns(fakeFrame);

      frameService.open(function () {
        expect(frameService._frame).to.not.exist;
        done();
      });
    });

    it('initiates polling', function () {
      var frameService;
      var callback = this.sandbox.stub();
      var fakeFrame = {close: 'close'};

      this.sandbox.stub(FrameService.prototype, '_pollForPopupClose');
      frameService = new FrameService(this.options);
      this.sandbox.stub(popup, 'open').returns(fakeFrame);

      frameService.open(callback);

      expect(frameService._pollForPopupClose).to.be.called;
    });

    it('calls _initializePopupBridge with the callback when PopupBridge is defined', function () {
      var context = {
        _initializePopupBridge: this.sandbox.stub()
      };
      var callback = {};

      global.popupBridge = {};
      FrameService.prototype.open.call(context, callback);

      expect(context._initializePopupBridge).to.be.calledWith(callback);
      delete global.popupBridge;
    });
  });

  describe('redirect', function () {
    it('calls _openPopupBridge with an object when PopupBridge is defined', function () {
      var context = {
        _openPopupBridge: this.sandbox.stub()
      };

      global.popupBridge = {};
      FrameService.prototype.redirect.call(context, 'http://braintreepayments.com');

      expect(context._openPopupBridge).to.be.calledWith({
        openFrameUrl: 'http://braintreepayments.com'
      });
      delete global.popupBridge;
    });
  });

  describe('close', function () {
    it('closes frame if its open', function () {
      var frameClosedStub = this.sandbox.stub();
      var context = {
        isFrameClosed: function () {
          return false;
        },
        _frame: {
          close: frameClosedStub
        }
      };

      FrameService.prototype.close.call(context);

      expect(frameClosedStub).to.be.called;
    });

    it('does not attempt to close frame if already closed', function () {
      var frameClosedStub = this.sandbox.stub();
      var context = {
        isFrameClosed: function () {
          return true;
        },
        _frame: {
          close: frameClosedStub
        }
      };

      FrameService.prototype.close.call(context);

      expect(frameClosedStub).not.to.be.called;
    });
  });

  describe('focus', function () {
    it('focuses frame if its open', function () {
      var frameFocusedStub = this.sandbox.stub();
      var context = {
        isFrameClosed: function () {
          return false;
        },
        _frame: {
          focus: frameFocusedStub
        }
      };

      FrameService.prototype.focus.call(context);

      expect(frameFocusedStub).to.be.called;
    });

    it('does not attempt to focus frame if already closed', function () {
      var frameFocusedStub = this.sandbox.stub();
      var context = {
        isFrameClosed: function () {
          return true;
        },
        _frame: {
          focus: frameFocusedStub
        }
      };

      FrameService.prototype.focus.call(context);

      expect(frameFocusedStub).not.to.be.called;
    });
  });

  describe('createHandler', function () {
    beforeEach(function () {
      this.context = {
        focus: this.sandbox.stub(),
        close: this.sandbox.stub()
      };
    });

    it('returns an object with a close and focus method', function () {
      var handler = FrameService.prototype.createHandler.call(this.context);

      expect(handler.close).to.be.a('function');
      expect(handler.focus).to.be.a('function');
    });

    it('the close method on the handler closes the frame', function () {
      var handler = FrameService.prototype.createHandler.call(this.context);

      handler.close();

      expect(this.context.close).to.be.calledOnce;
    });

    it('the focus method on the handler focuses the frame', function () {
      var handler = FrameService.prototype.createHandler.call(this.context);

      handler.focus();

      expect(this.context.focus).to.be.calledOnce;
    });

    it('allows passing in a function to run before the frame is closed', function () {
      var closeHook = this.sandbox.stub();
      var handler = FrameService.prototype.createHandler.call(this.context, {beforeClose: closeHook});

      handler.close();

      expect(this.context.close).to.be.calledOnce;
      expect(closeHook).to.be.calledOnce;
    });

    it('allows passing in a function to run before the frame is focused', function () {
      var focusHook = this.sandbox.stub();
      var handler = FrameService.prototype.createHandler.call(this.context, {beforeFocus: focusHook});

      handler.focus();

      expect(this.context.focus).to.be.calledOnce;
      expect(focusHook).to.be.calledOnce;
    });
  });

  describe('createNoopHandler', function () {
    it('creates a handler with empty functions', function () {
      var noopHandler = FrameService.prototype.createNoopHandler();

      expect(noopHandler.close).to.be.a('function');
      expect(noopHandler.focus).to.be.a('function');
    });

    it('has the same signature as the object returned from createHandler', function () {
      var context = {
        focus: this.sandbox.stub(),
        close: this.sandbox.stub()
      };

      var realHandler = FrameService.prototype.createHandler(context);
      var noopHandler = FrameService.prototype.createNoopHandler();

      var realProps = Object.keys(realHandler);
      var noopProps = Object.keys(noopHandler);

      expect(realProps.length).to.equal(noopProps.length);

      realProps.forEach(function (prop) {
        expect(typeof realHandler[prop]).to.equal(typeof noopHandler[prop]);
      });
    });
  });

  describe('teardown', function () {
    it('makes a call to close', function () {
      var closeStub = this.sandbox.stub();
      var context = {
        close: closeStub,
        _cleanupFrame: this.sandbox.stub(),
        _onCompleteCallback: this.sandbox.stub(),
        _dispatchFrame: {
          parentNode: {
            removeChild: noop
          }
        }
      };

      FrameService.prototype.teardown.call(context);

      expect(closeStub).to.be.called;
    });

    it('removes the _dispatchFrame from the DOM', function () {
      var removeChildStub = this.sandbox.stub();
      var context = {
        close: noop,
        _cleanupFrame: this.sandbox.stub(),
        _onCompleteCallback: this.sandbox.stub(),
        _dispatchFrame: {
          parentNode: {
            removeChild: removeChildStub
          }
        }
      };

      FrameService.prototype.teardown.call(context);

      expect(removeChildStub).to.be.called;
      expect(context._dispatchFrame).to.equal(null);
    });
  });

  describe('isFrameClosed', function () {
    it('returns true if frame is null', function () {
      var context = {_frame: null};
      var result = FrameService.prototype.isFrameClosed.call(context);

      expect(result).to.equal(true);
    });

    it('returns true if frame is undefined', function () {
      var context = {_frame: undefined}; // eslint-disable-line no-undefined
      var result = FrameService.prototype.isFrameClosed.call(context);

      expect(result).to.equal(true);
    });

    it('returns true if frame is closed', function () {
      var context = {_frame: {closed: true}};
      var result = FrameService.prototype.isFrameClosed.call(context);

      expect(result).to.equal(true);
    });

    it('returns true if frame exists and is closed', function () {
      var context = {_frame: {closed: true}};
      var result = FrameService.prototype.isFrameClosed.call(context);

      expect(result).to.equal(true);
    });

    it('returns false if frame is not closed', function () {
      var context = {_frame: {closed: false}};
      var result = FrameService.prototype.isFrameClosed.call(context);

      expect(result).to.equal(false);
    });
  });

  describe('_cleanupFrame', function () {
    it('sets _frame to null', function () {
      var context = {
        _frame: 'frame',
        _popupInterval: setInterval(noop, 2e3)
      };

      FrameService.prototype._cleanupFrame.call(context);

      expect(context._frame).to.equal(null);
    });

    it('stops the popup polling', function () {
      var context = {
        _frame: 'frame',
        _onCompleteCallback: null,
        _popupInterval: setInterval(noop, 2e3)
      };

      FrameService.prototype._cleanupFrame.call(context);

      expect(context._popupInterval).to.equal(null);
    });
  });

  describe('_pollForPopupClose', function () {
    var timer;

    afterEach(function () {
      clearInterval(timer);
      timer = null;
    });

    it('creates a timer', function () {
      var context = {
        isFrameClosed: function () {
          return false;
        },
        _cleanupFrame: noop
      };

      timer = FrameService.prototype._pollForPopupClose.call(context);

      expect(context._popupInterval).to.be.a('number');
      expect(timer).to.equal(context._popupInterval);
    });

    it('calls to _cleanupFrame when frame is closed', function (done) {
      var frameClosed = false;
      var cleanupFrameStub = this.sandbox.stub();
      var context = {
        isFrameClosed: function () {
          return frameClosed;
        },
        _cleanupFrame: cleanupFrameStub
      };

      timer = FrameService.prototype._pollForPopupClose.call(context);
      frameClosed = true;

      setTimeout(function () {
        expect(cleanupFrameStub).to.be.called;
        done();
      }, 200);
    });

    it('calls _onCompleteCallback when frame is closed', function () {
      var clock = this.sandbox.useFakeTimers();
      var frameClosed = false;
      var onCompleteCallbackStub = this.sandbox.stub();
      var context = {
        isFrameClosed: function () {
          return frameClosed;
        },
        _onCompleteCallback: onCompleteCallbackStub,
        _cleanupFrame: this.sandbox.stub()
      };

      FrameService.prototype._pollForPopupClose.call(context);
      frameClosed = true;

      clock.tick(100);

      expect(onCompleteCallbackStub).to.be.calledWith(this.sandbox.match({
        type: BraintreeError.types.INTERNAL,
        code: 'FRAME_SERVICE_FRAME_CLOSED',
        message: 'Frame closed before tokenization could occur.'
      }));

      clock.restore();
    });
  });
});
