"use strict";

jest.mock("../../../../../src/lib/frame-service/external/strategies/popup");
jest.mock(
  "../../../../../src/lib/frame-service/external/strategies/popup-bridge"
);
jest.mock("../../../../../src/lib/frame-service/external/strategies/modal");
jest.mock("../../../../../src/lib/frame-service/shared/browser-detection");
jest.mock("../../../../../src/lib/is-https");
jest.mock("framebus");

const FrameService = require("../../../../../src/lib/frame-service/external/frame-service");
const {
  DISPATCH_FRAME_CLASS,
  DISPATCH_FRAME_NAME,
} = require("../../../../../src/lib/frame-service/shared/constants");
const {
  DISPATCH_FRAME_READY,
  DISPATCH_FRAME_REPORT,
} = require("../../../../../src/lib/frame-service/shared/events");
const Popup = require("../../../../../src/lib/frame-service/external/strategies/popup");
const PopupBridge = require("../../../../../src/lib/frame-service/external/strategies/popup-bridge");
const Modal = require("../../../../../src/lib/frame-service/external/strategies/modal");
const BraintreeBus = require("framebus");
const BraintreeError = require("../../../../../src/lib/braintree-error");
const browserDetection = require("../../../../../src/lib/frame-service/shared/browser-detection");
const { noop, mockWindowOpen } = require("../../../../helpers");

describe("FrameService", () => {
  let testContext;

  function createFakeBus() {
    return {
      listeners: [],
      targetFrames: [],
      on: function (eventName, callback) {
        this.listeners.push({ eventName, callback });
      },
      off: function (eventName) {
        this.listeners.forEach((listener, i) => {
          if (listener.eventName === eventName) {
            this.listeners.splice(i, 1);
          }
        });
      },
      emit: function (eventName, payload) {
        this.listeners.forEach((listener) => {
          if (listener.eventName === eventName) {
            listener.callback(payload);
          }
        });
      },
      addTargetFrame: function (frame) {
        this.targetFrames.push(frame);
      },
    };
  }

  beforeEach(() => {
    jest.spyOn(window, "open").mockImplementation(mockWindowOpen);

    testContext = {};

    const gatewayConfiguration = {
      assetsUrl: "https://assets",
      paypal: {
        assetsUrl: "https://paypal.assets.url",
        displayName: "my brand",
      },
    };

    testContext.state = {
      client: {
        authorization: "fake authorization-key",
        gatewayConfiguration,
        getConfiguration: () => ({ gatewayConfiguration }),
      },
      enableShippingAddress: true,
      amount: 10.0,
      currency: "USD",
      locale: "en_us",
      flow: "checkout",
      shippingAddressOverride: {
        street: "123 Townsend St",
      },
    };
    testContext.options = {
      state: testContext.state,
      name: "fake_name",
      dispatchFrameUrl: "fake-url",
      openFrameUrl: "fake-landing-frame-html",
    };
  });

  describe("Constructor", () => {
    describe("frameConfiguration validation", () => {
      it("throws an error if no frameConfiguration is provided", () => {
        function fn() {
          return new FrameService();
        }

        expect(fn).toThrowError("Valid configuration is required");
      });

      it("throws an error if a name is not provided", () => {
        function fn() {
          return new FrameService({ dispatchFrameUrl: "bar" });
        }

        expect(fn).toThrowError("A valid frame name must be provided");
      });

      it("throws an error if dispatchFrameUrl is not provided", () => {
        function fn() {
          return new FrameService({ name: "foo" });
        }

        expect(fn).toThrowError(
          "A valid frame dispatchFrameUrl must be provided"
        );
      });

      it("throws an error if a openFrameUrl is not provided", () => {
        function fn() {
          return new FrameService({ name: "foo", dispatchFrameUrl: "foo.biz" });
        }

        expect(fn).toThrowError("A valid frame openFrameUrl must be provided");
      });

      it.each(["foo-bar", "foo bar", " ", "", "!!!"])(
        "throws an error if %p is provided as frame name",
        (name) => {
          function fn() {
            return new FrameService(
              {},
              { url: "bar", name, landingFrameHTML: "baz" }
            );
          }

          expect(fn).toThrowError("A valid frame name must be provided");
        }
      );
    });

    it("assigns a _serviceId property", () => {
      const frameService = new FrameService(testContext.options);

      expect(frameService._serviceId).toBeDefined();
    });

    it("assigns an _options model", () => {
      const { _options, _serviceId } = new FrameService(testContext.options);

      expect(_options.name).toBe(`${testContext.options.name}_${_serviceId}`);
      expect(_options.dispatchFrameUrl).toBe(
        testContext.options.dispatchFrameUrl
      );
      expect(_options.openFrameUrl).toBe(testContext.options.openFrameUrl);
    });

    it("can optionally assign height and width", () => {
      let frameService;

      testContext.options.height = 100;
      testContext.options.width = 150;
      frameService = new FrameService(testContext.options);

      expect(frameService._options.height).toBe(100);
      expect(frameService._options.width).toBe(150);
    });

    it("assigns state property", () => {
      const { state } = new FrameService(testContext.options);

      expect(state).toEqual(testContext.state);
    });

    it("creates a bus instance", () => {
      const { _bus, _serviceId } = new FrameService(testContext.options);

      expect(_bus).toBeInstanceOf(BraintreeBus);
      expect(BraintreeBus).toBeCalledWith({
        channel: _serviceId,
      });
    });

    it("makes call to attach bus event listeners", () => {
      let frameService;

      jest.spyOn(FrameService.prototype, "_setBusEvents");

      frameService = new FrameService(testContext.options);

      expect(frameService._setBusEvents).toHaveBeenCalled();
    });
  });

  describe("initialize", () => {
    it("listens for dispatch frame to report ready", () => {
      const context = {
        _bus: {
          on: jest.fn(),
          targetFrames: [],
          addTargetFrame: function (frame) {
            this.targetFrames.push(frame);
          },
        },
        _writeDispatchFrame: noop,
      };

      FrameService.prototype.initialize.call(context, noop);

      expect(context._bus.on).toHaveBeenCalledWith(
        DISPATCH_FRAME_READY,
        expect.any(Function)
      );
    });

    it("calls callback when dispatch frame is ready", () => {
      const fakeBus = createFakeBus();
      const context = {
        _bus: fakeBus,
        _writeDispatchFrame: noop,
      };
      const callback = jest.fn();

      FrameService.prototype.initialize.call(context, callback);

      fakeBus.emit(DISPATCH_FRAME_READY);
      expect(callback).toHaveBeenCalled();
    });

    it("removes event listener once dispatched", () => {
      const fakeBus = createFakeBus();
      const context = {
        _bus: fakeBus,
        _writeDispatchFrame: noop,
      };
      const callback = jest.fn();

      FrameService.prototype.initialize.call(context, callback);

      fakeBus.emit(DISPATCH_FRAME_READY);
      fakeBus.emit(DISPATCH_FRAME_READY);
      fakeBus.emit(DISPATCH_FRAME_READY);
      expect(callback).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("makes a call to write a dispatch frame", () => {
      const _writeDispatchFrame = jest.fn();
      const context = {
        _bus: {
          on: noop,
          off: noop,
          addTargetFrame: noop,
        },
        _writeDispatchFrame,
      };

      FrameService.prototype.initialize.call(context, noop);

      expect(_writeDispatchFrame).toHaveBeenCalled();
    });
  });

  describe("_writeDispatchFrame", () => {
    it("assigns a _dispatchFrame property on the instance", () => {
      const frameService = new FrameService(testContext.options);

      frameService._writeDispatchFrame();

      expect(frameService._dispatchFrame.nodeType).toBe(1);
      expect(frameService._dispatchFrame.getAttribute("src")).toBe(
        testContext.options.dispatchFrameUrl
      );
      expect(frameService._dispatchFrame.getAttribute("name")).toBe(
        `${DISPATCH_FRAME_NAME}_${frameService._serviceId}`
      );
      expect(frameService._dispatchFrame.style.position).toBe("absolute");
      expect(frameService._dispatchFrame.style.left).toBe("-9999px");
      expect(frameService._dispatchFrame.className).toBe(DISPATCH_FRAME_CLASS);
    });

    it("writes iframe to body", () => {
      const frameService = new FrameService(testContext.options);

      jest.spyOn(document.body, "appendChild");

      frameService._writeDispatchFrame();

      expect(document.body.appendChild).toHaveBeenCalledWith(
        frameService._dispatchFrame
      );
    });
  });

  describe("_setBusEvents", () => {
    it("listens for a frame report", () => {
      const context = { _bus: { on: jest.fn() } };

      FrameService.prototype._setBusEvents.call(context);

      expect(context._bus.on).toHaveBeenCalledWith(
        DISPATCH_FRAME_REPORT,
        expect.any(Function)
      );
    });

    it("listens for a configuration request", () => {
      const context = { _bus: { on: jest.fn() } };

      FrameService.prototype._setBusEvents.call(context);

      expect(context._bus.on).toHaveBeenCalledWith(
        "BUS_CONFIGURATION_REQUEST",
        expect.any(Function)
      );
    });

    it("calls _onCompleteCallback with provided arguments", () => {
      let onCompleteCallbackPayload = null;
      const context = {
        _bus: createFakeBus(),
        close: jest.fn(),
        _onCompleteCallback: (err, payload) => {
          onCompleteCallbackPayload = [err, payload];
        },
        _frame: { close: jest.fn() },
      };
      const err = "fakeErr";
      const payload = "fakePayload";

      FrameService.prototype._setBusEvents.call(context);

      context._bus.emit(DISPATCH_FRAME_REPORT, { err, payload });

      expect(onCompleteCallbackPayload).toEqual([err, payload]);
    });

    it("sets _onCompleteCallback to null after calling", () => {
      const context = {
        _bus: createFakeBus(),
        close: jest.fn(),
        _onCompleteCallback: noop,
        _frame: { close: jest.fn() },
      };

      FrameService.prototype._setBusEvents.call(context);

      context._bus.emit(DISPATCH_FRAME_REPORT, { err: null, payload: null });

      expect(context._onCompleteCallback).toBeNull();
    });
  });

  describe("open", () => {
    beforeEach(() => {
      delete window.popupBridge;

      testContext.frameService = new FrameService(testContext.options);
      testContext.fakeFrame = {
        initialize: jest.fn(),
        open: jest.fn(),
        isClosed: jest.fn(),
      };
      jest
        .spyOn(testContext.frameService, "_getFrameForEnvironment")
        .mockReturnValue(testContext.fakeFrame);
      jest.spyOn(Popup.prototype, "open");
      jest.spyOn(PopupBridge.prototype, "open");
      jest.spyOn(Modal.prototype, "open");
    });

    it("uses Modal when in a browser that does not support popups and is not using popup bridge", () => {
      testContext.frameService._getFrameForEnvironment.mockRestore();
      jest.spyOn(browserDetection, "supportsPopups").mockReturnValue(false);
      testContext.frameService.open();

      expect(testContext.frameService._frame).toBeInstanceOf(Modal);
    });

    it("uses PopupBridge when in a browser that does not support popups and is using popup bridge", () => {
      window.popupBridge = {};

      testContext.frameService._getFrameForEnvironment.mockRestore();
      jest.spyOn(browserDetection, "supportsPopups").mockReturnValue(false);

      testContext.frameService.open();

      expect(testContext.frameService._frame).toBeInstanceOf(PopupBridge);
    });

    it("uses a Popup when the browser supports popups", () => {
      testContext.frameService._getFrameForEnvironment.mockRestore();
      jest.spyOn(browserDetection, "supportsPopups").mockReturnValue(true);
      jest.spyOn(Popup.prototype, "isClosed").mockReturnValue(false);
      testContext.frameService.open();

      expect(testContext.frameService._frame).toBeInstanceOf(Popup);
    });

    it("maps provided callback to instance", () => {
      const callback = jest.fn();

      jest.spyOn(FrameService.prototype, "_pollForPopupClose");

      testContext.frameService.open({}, callback);

      expect(testContext.frameService._onCompleteCallback).toBe(callback);
    });

    it("calls the callback with error when popup fails to open", () => {
      const callback = jest.fn();

      testContext.fakeFrame.isClosed.mockReturnValue(true);

      testContext.frameService.open({}, callback);

      expect(callback.mock.calls[0][0]).toMatchObject({
        type: BraintreeError.types.INTERNAL,
        code: "FRAME_SERVICE_FRAME_OPEN_FAILED",
        message: "Frame failed to open.",
      });
    });

    it("cleans up the frame when popup fails to open", (done) => {
      testContext.fakeFrame.isClosed.mockReturnValue(true);

      testContext.frameService.open({}, () => {
        expect(testContext.frameService._frame).toBeFalsy();
        expect(testContext.frameService._popupInterval).toBeFalsy();
        done();
      });
    });

    it("uses default options if none passed", () => {
      const callback = jest.fn();

      jest.spyOn(browserDetection, "supportsPopups").mockReturnValue(false);
      jest.spyOn(FrameService.prototype, "_pollForPopupClose");
      jest.spyOn(FrameService.prototype, "_getFrameForEnvironment");

      testContext.frameService.open(null, callback);

      expect(
        testContext.frameService._getFrameForEnvironment
      ).toHaveBeenCalledWith({});
    });

    it("override values in options with values passed in open", () => {
      const callback = jest.fn();
      const options = { foo: "bar" };

      jest.spyOn(browserDetection, "supportsPopups").mockReturnValue(false);
      jest.spyOn(FrameService.prototype, "_pollForPopupClose");
      jest.spyOn(FrameService.prototype, "_getFrameForEnvironment");

      testContext.frameService.open(options, callback);

      expect(
        testContext.frameService._getFrameForEnvironment
      ).toHaveBeenCalledWith(options);
    });

    it("initiates polling when frame is a Modal", () => {
      const callback = jest.fn();

      jest.spyOn(browserDetection, "supportsPopups").mockReturnValue(false);
      jest.spyOn(FrameService.prototype, "_pollForPopupClose");

      testContext.frameService.open({}, callback);

      expect(testContext.frameService._pollForPopupClose).toHaveBeenCalled();
    });

    it("initiates polling when frame is a Popup", () => {
      const callback = jest.fn();

      jest.spyOn(browserDetection, "supportsPopups").mockReturnValue(true);
      jest.spyOn(FrameService.prototype, "_pollForPopupClose");

      testContext.frameService.open({}, callback);

      expect(testContext.frameService._pollForPopupClose).toHaveBeenCalled();
    });

    it("does not initialize polling if frame is a PopupBridge", () => {
      window.popupBridge = {};

      testContext.frameService._getFrameForEnvironment.mockRestore();
      jest.spyOn(browserDetection, "supportsPopups").mockReturnValue(false);
      jest.spyOn(FrameService.prototype, "_pollForPopupClose");

      testContext.frameService.open({}, noop);

      expect(
        testContext.frameService._pollForPopupClose
      ).not.toHaveBeenCalled();
    });

    it("calls _frame.initialize", () => {
      const cb = noop;

      testContext.frameService.open({}, cb);

      expect(testContext.fakeFrame.initialize).toHaveBeenCalledTimes(1);
      expect(testContext.fakeFrame.initialize).toHaveBeenCalledWith(cb);
    });

    it("can set new state properties", () => {
      const cb = noop;

      testContext.frameService.state = {
        foo: "Going to change",
        bar: "existing value that will be null",
        biz: "unchanged value",
      };

      testContext.frameService.open(
        {
          state: {
            foo: "foo",
            bar: null,
            baz: "baz",
          },
        },
        cb
      );

      expect(testContext.frameService.state).toEqual({
        foo: "foo",
        bar: null,
        baz: "baz",
        biz: "unchanged value",
      });
    });
  });

  describe("redirect", () => {
    beforeEach(() => {
      testContext.frameService = new FrameService(testContext.options);
      testContext.fakeFrame = {
        redirect: jest.fn(),
        isClosed: jest.fn(),
      };
      testContext.frameService._frame = testContext.fakeFrame;

      jest.spyOn(testContext.frameService, "isFrameClosed");
    });

    it("calls frame redirect method", () => {
      const url = "http://example.com";

      testContext.frameService.redirect(url);

      expect(testContext.fakeFrame.redirect).toHaveBeenCalledTimes(1);
      expect(testContext.fakeFrame.redirect).toHaveBeenCalledWith(url);
    });

    it("does not call redirect method if frame does not exist", () => {
      const url = "http://example.com";

      delete testContext.frameService._frame;
      testContext.frameService.redirect(url);

      expect(testContext.fakeFrame.redirect).not.toHaveBeenCalled();
    });

    it("does not call redirect method if frame is closed", () => {
      const url = "http://example.com";

      testContext.frameService.isFrameClosed.mockReturnValue(true);
      testContext.frameService.redirect(url);

      expect(testContext.fakeFrame.redirect).not.toHaveBeenCalled();
    });
  });

  describe("close", () => {
    it("closes frame if its open", () => {
      const close = jest.fn();
      const context = {
        isFrameClosed: () => false,
        _frame: { close },
      };

      FrameService.prototype.close.call(context);

      expect(close).toHaveBeenCalled();
    });

    it("does not attempt to close frame if already closed", () => {
      const close = jest.fn();
      const context = {
        isFrameClosed: () => true,
        _frame: { close: close },
      };

      FrameService.prototype.close.call(context);

      expect(close).not.toHaveBeenCalled();
    });
  });

  describe("popup closing", () => {
    it("calls onCompleteCallback when Window is closed", () => {
      jest.useFakeTimers();

      const fakeWindow = { closed: false };
      const frameService = new FrameService(testContext.options);
      const onCompleteCallbackStub = jest.fn();

      jest.spyOn(window, "open").mockImplementation(() => fakeWindow);

      frameService.open({}, onCompleteCallbackStub);
      jest.advanceTimersByTime(1);

      frameService._frame.isClosed = jest.fn().mockReturnValue(true);

      jest.advanceTimersByTime(100);

      expect(onCompleteCallbackStub.mock.calls[0][0]).toMatchObject({
        type: BraintreeError.types.INTERNAL,
        code: "FRAME_SERVICE_FRAME_CLOSED",
        message: "Frame closed before tokenization could occur.",
      });
      jest.useRealTimers();
    });
  });

  describe("focus", () => {
    it("focuses frame if its open", () => {
      const focus = jest.fn();
      const context = {
        isFrameClosed: () => false,
        _frame: { focus },
      };

      FrameService.prototype.focus.call(context);

      expect(focus).toHaveBeenCalled();
    });

    it("does not attempt to focus frame if already closed", () => {
      const focus = jest.fn();
      const context = {
        isFrameClosed: () => true,
        _frame: { focus },
      };

      FrameService.prototype.focus.call(context);

      expect(focus).not.toHaveBeenCalled();
    });
  });

  describe("createHandler", () => {
    beforeEach(() => {
      testContext.context = {
        focus: jest.fn(),
        close: jest.fn(),
      };
    });

    it("returns an object with a close and focus method", () => {
      const { close, focus } = FrameService.prototype.createHandler.call(
        testContext.context
      );

      expect(close).toBeInstanceOf(Function);
      expect(focus).toBeInstanceOf(Function);
    });

    it("the close method on the handler closes the frame", () => {
      const handler = FrameService.prototype.createHandler.call(
        testContext.context
      );

      handler.close();

      expect(testContext.context.close).toHaveBeenCalledTimes(1);
    });

    it("the focus method on the handler focuses the frame", () => {
      const handler = FrameService.prototype.createHandler.call(
        testContext.context
      );

      handler.focus();

      expect(testContext.context.focus).toHaveBeenCalledTimes(1);
    });

    it("allows passing in a function to run before the frame is closed", () => {
      const beforeClose = jest.fn();
      const handler = FrameService.prototype.createHandler.call(
        testContext.context,
        { beforeClose }
      );

      handler.close();

      expect(testContext.context.close).toHaveBeenCalledTimes(1);
      expect(beforeClose).toHaveBeenCalledTimes(1);
    });

    it("allows passing in a function to run before the frame is focused", () => {
      const beforeFocus = jest.fn();
      const handler = FrameService.prototype.createHandler.call(
        testContext.context,
        { beforeFocus }
      );

      handler.focus();

      expect(testContext.context.focus).toHaveBeenCalledTimes(1);
      expect(beforeFocus).toHaveBeenCalledTimes(1);
    });
  });

  describe("createNoopHandler", () => {
    it("creates a handler with empty functions", () => {
      const { close, focus } = FrameService.prototype.createNoopHandler();

      expect(close).toBeInstanceOf(Function);
      expect(focus).toBeInstanceOf(Function);
    });

    it("has the same signature as the object returned from createHandler", () => {
      const context = { focus: noop, close: noop };
      const realHandler = FrameService.prototype.createHandler(context);
      const noopHandler = FrameService.prototype.createNoopHandler();
      const realProps = Object.keys(realHandler);
      const noopProps = Object.keys(noopHandler);

      expect.assertions(3);
      expect(realProps.length).toBe(noopProps.length);

      realProps.forEach((prop) => {
        expect(typeof realHandler[prop]).toBe(typeof noopHandler[prop]);
      });
    });
  });

  describe("teardown", () => {
    it("makes a call to close", () => {
      const close = jest.fn();
      const context = {
        close,
        _cleanupFrame: noop,
        _onCompleteCallback: noop,
        _dispatchFrame: { parentNode: { removeChild: noop } },
      };

      FrameService.prototype.teardown.call(context);

      expect(close).toHaveBeenCalled();
    });

    it("removes the _dispatchFrame from the DOM", () => {
      const removeChild = jest.fn();
      const context = {
        close: noop,
        _cleanupFrame: noop,
        _onCompleteCallback: noop,
        _dispatchFrame: { parentNode: { removeChild } },
      };

      FrameService.prototype.teardown.call(context);

      expect(removeChild).toHaveBeenCalled();
      expect(context._dispatchFrame).toBeNull();
    });
  });

  describe("isFrameClosed", () => {
    it("returns true if frame is null", () => {
      const context = { _frame: null };
      const result = FrameService.prototype.isFrameClosed.call(context);

      expect(result).toBe(true);
    });

    it("returns true if frame is undefined", () => {
      const context = { _frame: undefined };
      const result = FrameService.prototype.isFrameClosed.call(context);

      expect(result).toBe(true);
    });

    it("returns true if frame is closed", () => {
      const context = { _frame: { isClosed: () => true } };
      const result = FrameService.prototype.isFrameClosed.call(context);

      expect(result).toBe(true);
    });

    it("returns true if frame exists and is closed", () => {
      const context = { _frame: { isClosed: () => true } };
      const result = FrameService.prototype.isFrameClosed.call(context);

      expect(result).toBe(true);
    });

    it("returns false if frame is not closed", () => {
      const context = { _frame: { isClosed: () => false } };
      const result = FrameService.prototype.isFrameClosed.call(context);

      expect(result).toBe(false);
    });
  });

  describe("_cleanupFrame", () => {
    it("sets _frame to null", () => {
      const context = {
        _frame: "frame",
        _popupInterval: setInterval(noop, 2e3),
      };

      FrameService.prototype._cleanupFrame.call(context);

      expect(context._frame).toBeNull();
    });

    it("stops the popup polling", () => {
      const context = {
        _frame: "frame",
        _onCompleteCallback: null,
        _popupInterval: setInterval(noop, 2e3),
      };

      FrameService.prototype._cleanupFrame.call(context);

      expect(context._popupInterval).toBeNull();
    });
  });

  describe("_pollForPopupClose", () => {
    let timer;

    afterEach(() => {
      clearInterval(timer);
      timer = null;
    });

    it("creates a timer", () => {
      const context = {
        isFrameClosed: () => false,
        _cleanupFrame: noop,
      };

      timer = FrameService.prototype._pollForPopupClose.call(context);

      expect(context._popupInterval).toStrictEqual(expect.any(Number));
      expect(timer).toBe(context._popupInterval);
    });

    it("calls to _cleanupFrame when frame is closed", (done) => {
      jest.useRealTimers();

      let frameClosed = false;
      const _cleanupFrame = jest.fn();
      const context = { isFrameClosed: () => frameClosed, _cleanupFrame };

      timer = FrameService.prototype._pollForPopupClose.call(context);
      frameClosed = true;

      setTimeout(() => {
        expect(_cleanupFrame).toHaveBeenCalled();
        done();
      }, 200);
    });

    it("calls _onCompleteCallback when frame is closed", () => {
      jest.useFakeTimers();

      let frameClosed = false;
      const _onCompleteCallback = jest.fn();
      const context = {
        isFrameClosed: () => frameClosed,
        _onCompleteCallback,
        _cleanupFrame: jest.fn(),
      };

      FrameService.prototype._pollForPopupClose.call(context);
      frameClosed = true;

      jest.advanceTimersByTime(100);

      expect(_onCompleteCallback.mock.calls[0][0]).toMatchObject({
        type: BraintreeError.types.INTERNAL,
        code: "FRAME_SERVICE_FRAME_CLOSED",
        message: "Frame closed before tokenization could occur.",
      });

      jest.useRealTimers();
    });
  });
});
