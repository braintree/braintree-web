'use strict';

var FrameService = require('../../../../../src/lib/frame-service/external/frame-service');
var constants = require('../../../../../src/lib/frame-service/shared/constants');
var events = require('../../../../../src/lib/frame-service/shared/events');
var popup = require('../../../../../src/lib/frame-service/external/popup');
var BraintreeBus = require('../../../../../src/lib/bus');
var BraintreeError = require('../../../../../src/lib/error');

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

      expect(frameService._options).to.deep.equal({
        name: this.options.name + '_' + frameService._serviceId,
        dispatchFrameUrl: this.options.dispatchFrameUrl,
        openFrameUrl: this.options.openFrameUrl
      });
    });

    it('assigns _state property', function () {
      var frameService = new FrameService(this.options);

      expect(frameService._state).to.deep.equal(
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

      expect(frameService._setBusEvents).to.have.been.called;
    });
  });

  describe('initialize', function () {
    it('listens for dispatch frame to report ready', function () {
      var context = {
        _bus: {on: this.sandbox.stub()},
        _writeDispatchFrame: noop
      };

      FrameService.prototype.initialize.call(context, noop);

      expect(context._bus.on).to.have.been.calledWith(
        events.DISPATCH_FRAME_READY,
        sinon.match.func
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
      expect(callback).to.have.been.called;
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
      expect(callback).to.have.been.called;
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

      expect(writeDispatchFrameStub).to.have.been.called;
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
    });

    it('writes iframe to body', function () {
      var frameService = new FrameService(this.options);

      this.sandbox.stub(document.body, 'appendChild');

      frameService._writeDispatchFrame();

      expect(document.body.appendChild).to.have.been.calledWith(frameService._dispatchFrame);
    });
  });

  describe('_setBusEvents', function () {
    it('listens for a frame report', function () {
      var context = {
        _bus: {on: this.sandbox.stub()}
      };

      FrameService.prototype._setBusEvents.call(context);

      expect(context._bus.on).to.have.been.calledWith(events.DISPATCH_FRAME_REPORT, sinon.match.func);
    });

    it('listens for a configuration request', function () {
      var context = {
        _bus: {on: this.sandbox.stub()}
      };

      FrameService.prototype._setBusEvents.call(context);

      expect(context._bus.on).to.have.been.calledWith(BraintreeBus.events.CONFIGURATION_REQUEST, sinon.match.func);
    });

    it('calls to close the frame', function () {
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
        close: this.sandbox.stub()
      };

      FrameService.prototype._setBusEvents.call(context);

      context._bus.emit(events.DISPATCH_FRAME_REPORT);

      expect(context.close).to.have.been.called;
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

    it('initiates polling', function () {
      var frameService;
      var callback = this.sandbox.stub();

      this.sandbox.stub(FrameService.prototype, '_pollForPopupClose');
      frameService = new FrameService(this.options);
      this.sandbox.stub(popup, 'open');

      frameService.open(callback);

      expect(frameService._pollForPopupClose).to.have.been.called;
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

      expect(frameClosedStub).to.have.been.called;
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

      expect(frameClosedStub).not.to.have.been.called;
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

      expect(closeStub).to.have.been.called;
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

      expect(removeChildStub).to.have.been.called;
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
        expect(cleanupFrameStub).to.have.been.called;
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

      expect(onCompleteCallbackStub).to.have.been.calledWith(sinon.match({
        type: BraintreeError.types.INTERNAL,
        code: 'FRAME_SERVICE_FRAME_CLOSED',
        message: 'Frame closed before tokenization could occur.'
      }));

      clock.restore();
    });
  });
});
