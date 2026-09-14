vi.mock("../../../../../src/lib/frame-service/external/strategies/popup");
vi.mock(
  "../../../../../src/lib/frame-service/external/strategies/popup-bridge"
);
vi.mock("../../../../../src/lib/frame-service/external/strategies/modal");
vi.mock("../../../../../src/lib/frame-service/shared/browser-detection");
vi.mock("../../../../../src/lib/is-https");
vi.mock("framebus");

import FrameService from "../../../../../src/lib/frame-service/external/frame-service";
import {
  DISPATCH_FRAME_CLASS,
  DISPATCH_FRAME_NAME,
} from "../../../../../src/lib/frame-service/shared/constants";
import {
  DISPATCH_FRAME_READY,
  DISPATCH_FRAME_REPORT,
} from "../../../../../src/lib/frame-service/shared/events";
import Popup from "../../../../../src/lib/frame-service/external/strategies/popup";
import PopupBridge from "../../../../../src/lib/frame-service/external/strategies/popup-bridge";
import Modal from "../../../../../src/lib/frame-service/external/strategies/modal";
import BraintreeBus from "framebus";
import BraintreeError from "../../../../../src/lib/braintree-error";
import browserDetection from "../../../../../src/lib/frame-service/shared/browser-detection";
import isVerifiedDomain from "../../../../../src/lib/is-verified-domain";
import { noop, mockWindowOpen } from "../../../../helpers";

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
    vi.spyOn(window, "open").mockImplementation(mockWindowOpen);

    testContext = {};

    testContext.options = {
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

    it("creates a bus instance", () => {
      const { _bus, _serviceId } = new FrameService(testContext.options);

      expect(_bus).toBeInstanceOf(BraintreeBus);
      expect(BraintreeBus).toBeCalledWith({
        channel: _serviceId,
        verifyDomain: isVerifiedDomain,
        targetFrames: [],
      });
    });

    it("makes call to attach bus event listeners", () => {
      let frameService;

      vi.spyOn(FrameService.prototype, "_setBusEvents");

      frameService = new FrameService(testContext.options);

      expect(frameService._setBusEvents).toHaveBeenCalled();
    });
  });

  describe("initialize", () => {
    it("listens for dispatch frame to report ready", () => {
      const context = {
        _bus: {
          on: vi.fn(),
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
      const callback = vi.fn();

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
      const callback = vi.fn();

      FrameService.prototype.initialize.call(context, callback);

      fakeBus.emit(DISPATCH_FRAME_READY);
      fakeBus.emit(DISPATCH_FRAME_READY);
      fakeBus.emit(DISPATCH_FRAME_READY);
      expect(callback).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("makes a call to write a dispatch frame", () => {
      const _writeDispatchFrame = vi.fn();
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

      vi.spyOn(document.body, "appendChild");

      frameService._writeDispatchFrame();

      expect(document.body.appendChild).toHaveBeenCalledWith(
        frameService._dispatchFrame
      );
    });

    it("registers the dispatch frame as a target frame on the bus", () => {
      const frameService = new FrameService(testContext.options);

      vi.spyOn(frameService._bus, "addTargetFrame");

      frameService._writeDispatchFrame();

      expect(frameService._bus.addTargetFrame).toHaveBeenCalledWith(
        frameService._dispatchFrame
      );
    });
  });

  describe("_setBusEvents", () => {
    it("listens for a frame report", () => {
      const context = { _bus: { on: vi.fn() } };

      FrameService.prototype._setBusEvents.call(context);

      expect(context._bus.on).toHaveBeenCalledWith(
        DISPATCH_FRAME_REPORT,
        expect.any(Function)
      );
    });

    it("calls _onCompleteCallback with provided arguments", () => {
      let onCompleteCallbackPayload = null;
      const context = {
        _bus: createFakeBus(),
        close: vi.fn(),
        _cleanupFrame: noop,
        _onCompleteCallback: (err, payload) => {
          onCompleteCallbackPayload = [err, payload];
        },
        _frame: { close: vi.fn() },
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
        close: vi.fn(),
        _cleanupFrame: noop,
        _onCompleteCallback: noop,
        _frame: { close: vi.fn() },
      };

      FrameService.prototype._setBusEvents.call(context);

      context._bus.emit(DISPATCH_FRAME_REPORT, { err: null, payload: null });

      expect(context._onCompleteCallback).toBeNull();
    });

    it("cleans up the frame after a successful report", () => {
      const _cleanupFrame = vi.fn();
      const context = {
        _bus: createFakeBus(),
        _cleanupFrame,
        _onCompleteCallback: noop,
        _frame: { close: vi.fn() },
      };

      FrameService.prototype._setBusEvents.call(context);

      context._bus.emit(DISPATCH_FRAME_REPORT, { err: null, payload: null });

      expect(_cleanupFrame).toHaveBeenCalled();
    });
  });

  describe("open", () => {
    beforeEach(() => {
      delete window.popupBridge;

      testContext.frameService = new FrameService(testContext.options);
      testContext.fakeFrame = {
        initialize: vi.fn(),
        open: vi.fn(),
        isClosed: vi.fn(),
      };
      vi.spyOn(
        testContext.frameService,
        "_getFrameForEnvironment"
      ).mockReturnValue(testContext.fakeFrame);
      vi.spyOn(Popup.prototype, "open");
      vi.spyOn(PopupBridge.prototype, "open");
      vi.spyOn(Modal.prototype, "open");
    });

    it("uses Modal when in a browser that does not support popups and is not using popup bridge", () => {
      testContext.frameService._getFrameForEnvironment.mockRestore();
      vi.spyOn(browserDetection, "supportsPopups").mockReturnValue(false);
      testContext.frameService.open();

      expect(testContext.frameService._frame).toBeInstanceOf(Modal);
    });

    it("uses PopupBridge when in a browser that does not support popups and is using popup bridge", () => {
      window.popupBridge = {};

      testContext.frameService._getFrameForEnvironment.mockRestore();
      vi.spyOn(browserDetection, "supportsPopups").mockReturnValue(false);

      testContext.frameService.open();

      expect(testContext.frameService._frame).toBeInstanceOf(PopupBridge);
    });

    it("uses a Popup when the browser supports popups", () => {
      testContext.frameService._getFrameForEnvironment.mockRestore();
      vi.spyOn(browserDetection, "supportsPopups").mockReturnValue(true);
      vi.spyOn(Popup.prototype, "isClosed").mockReturnValue(false);
      testContext.frameService.open();

      expect(testContext.frameService._frame).toBeInstanceOf(Popup);
    });

    it("maps provided callback to instance", () => {
      const callback = vi.fn();

      vi.spyOn(FrameService.prototype, "_pollForPopupClose");

      testContext.frameService.open({}, callback);

      expect(testContext.frameService._onCompleteCallback).toBe(callback);
    });

    it("calls the callback with error when popup fails to open", () => {
      const callback = vi.fn();

      testContext.fakeFrame.isClosed.mockReturnValue(true);

      testContext.frameService.open({}, callback);

      expect(callback.mock.calls[0][0]).toMatchObject({
        type: BraintreeError.types.INTERNAL,
        code: "FRAME_SERVICE_FRAME_OPEN_FAILED",
        message: "Frame failed to open.",
      });
    });

    it("cleans up the frame when popup fails to open", () =>
      new Promise((resolve) => {
        testContext.fakeFrame.isClosed.mockReturnValue(true);

        testContext.frameService.open({}, () => {
          expect(testContext.frameService._frame).toBeFalsy();
          expect(testContext.frameService._popupInterval).toBeFalsy();
          resolve();
        });
      }));

    it("uses default options if none passed", () => {
      const callback = vi.fn();

      vi.spyOn(browserDetection, "supportsPopups").mockReturnValue(false);
      vi.spyOn(FrameService.prototype, "_pollForPopupClose");
      vi.spyOn(FrameService.prototype, "_getFrameForEnvironment");

      testContext.frameService.open(null, callback);

      expect(
        testContext.frameService._getFrameForEnvironment
      ).toHaveBeenCalledWith({});
    });

    it("override values in options with values passed in open", () => {
      const callback = vi.fn();
      const options = { foo: "bar" };

      vi.spyOn(browserDetection, "supportsPopups").mockReturnValue(false);
      vi.spyOn(FrameService.prototype, "_pollForPopupClose");
      vi.spyOn(FrameService.prototype, "_getFrameForEnvironment");

      testContext.frameService.open(options, callback);

      expect(
        testContext.frameService._getFrameForEnvironment
      ).toHaveBeenCalledWith(options);
    });

    it("initiates polling when frame is a Modal", () => {
      const callback = vi.fn();

      vi.spyOn(browserDetection, "supportsPopups").mockReturnValue(false);
      vi.spyOn(FrameService.prototype, "_pollForPopupClose");

      testContext.frameService.open({}, callback);

      expect(testContext.frameService._pollForPopupClose).toHaveBeenCalled();
    });

    it("initiates polling when frame is a Popup", () => {
      const callback = vi.fn();

      vi.spyOn(browserDetection, "supportsPopups").mockReturnValue(true);
      vi.spyOn(FrameService.prototype, "_pollForPopupClose");

      testContext.frameService.open({}, callback);

      expect(testContext.frameService._pollForPopupClose).toHaveBeenCalled();
    });

    it("does not initialize polling if frame is a PopupBridge", () => {
      window.popupBridge = {};

      testContext.frameService._getFrameForEnvironment.mockRestore();
      vi.spyOn(browserDetection, "supportsPopups").mockReturnValue(false);
      vi.spyOn(FrameService.prototype, "_pollForPopupClose");

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

    it("stores the onSuspend and onResume hooks from options", () => {
      const onSuspend = vi.fn();
      const onResume = vi.fn();

      testContext.frameService.open({ onSuspend, onResume }, noop);

      expect(testContext.frameService._onSuspend).toBe(onSuspend);
      expect(testContext.frameService._onResume).toBe(onResume);
    });

    it("attaches visibility listeners", () => {
      vi.spyOn(
        FrameService.prototype,
        "_addVisibilityListeners"
      ).mockImplementation(noop);

      testContext.frameService.open({}, noop);

      expect(
        testContext.frameService._addVisibilityListeners
      ).toHaveBeenCalled();
    });
  });

  describe("redirect", () => {
    beforeEach(() => {
      testContext.frameService = new FrameService(testContext.options);
      testContext.fakeFrame = {
        redirect: vi.fn(),
        isClosed: vi.fn(),
      };
      testContext.frameService._frame = testContext.fakeFrame;

      vi.spyOn(testContext.frameService, "isFrameClosed");
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
      const close = vi.fn();
      const context = {
        isFrameClosed: () => false,
        _frame: { close },
      };

      FrameService.prototype.close.call(context);

      expect(close).toHaveBeenCalled();
    });

    it("does not attempt to close frame if already closed", () => {
      const close = vi.fn();
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
      vi.useFakeTimers();

      const fakeWindow = { closed: false };
      const frameService = new FrameService(testContext.options);
      const onCompleteCallbackStub = vi.fn();

      vi.spyOn(window, "open").mockImplementation(() => fakeWindow);

      frameService.open({}, onCompleteCallbackStub);
      vi.advanceTimersByTime(1);

      frameService._frame.isClosed = vi.fn().mockReturnValue(true);

      vi.advanceTimersByTime(100);

      expect(onCompleteCallbackStub.mock.calls[0][0]).toMatchObject({
        type: BraintreeError.types.INTERNAL,
        code: "FRAME_SERVICE_FRAME_CLOSED",
        message: "Frame closed before tokenization could occur.",
      });
      vi.useRealTimers();
    });
  });

  describe("focus", () => {
    it("focuses frame if its open", () => {
      const focus = vi.fn();
      const context = {
        isFrameClosed: () => false,
        _frame: { focus },
      };

      FrameService.prototype.focus.call(context);

      expect(focus).toHaveBeenCalled();
    });

    it("does not attempt to focus frame if already closed", () => {
      const focus = vi.fn();
      const context = {
        isFrameClosed: () => true,
        _frame: { focus },
      };

      FrameService.prototype.focus.call(context);

      expect(focus).not.toHaveBeenCalled();
    });
  });

  describe("teardown", () => {
    it("makes a call to close", () => {
      const close = vi.fn();
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
      const removeChild = vi.fn();
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
        _removeVisibilityListeners: noop,
      };

      FrameService.prototype._cleanupFrame.call(context);

      expect(context._frame).toBeNull();
    });

    it("stops the popup polling", () => {
      const context = {
        _frame: "frame",
        _onCompleteCallback: null,
        _popupInterval: setInterval(noop, 2e3),
        _removeVisibilityListeners: noop,
      };

      FrameService.prototype._cleanupFrame.call(context);

      expect(context._popupInterval).toBeNull();
    });

    it("removes the visibility listeners", () => {
      const _removeVisibilityListeners = vi.fn();
      const context = {
        _frame: "frame",
        _popupInterval: setInterval(noop, 2e3),
        _removeVisibilityListeners,
      };

      FrameService.prototype._cleanupFrame.call(context);

      expect(_removeVisibilityListeners).toHaveBeenCalled();
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

      expect(context._popupInterval).toBeDefined();
      expect(context._popupInterval).not.toBeNull();
      expect(timer).toBe(context._popupInterval);
    });

    it("calls _reportFrameClosed when frame is closed", () =>
      new Promise((resolve) => {
        vi.useRealTimers();

        let frameClosed = false;
        const _reportFrameClosed = vi.fn();
        const context = {
          isFrameClosed: () => frameClosed,
          _reportFrameClosed,
        };

        timer = FrameService.prototype._pollForPopupClose.call(context);
        frameClosed = true;

        setTimeout(() => {
          expect(_reportFrameClosed).toHaveBeenCalled();
          resolve();
        }, 200);
      }));

    it("does not call _reportFrameClosed while the frame is open", () => {
      vi.useFakeTimers();

      const _reportFrameClosed = vi.fn();
      const context = {
        isFrameClosed: () => false,
        _reportFrameClosed,
      };

      FrameService.prototype._pollForPopupClose.call(context);
      vi.advanceTimersByTime(300);

      expect(_reportFrameClosed).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe("_reportFrameClosed", () => {
    it("cleans up the frame and fires the callback with a FRAME_CLOSED error", () => {
      const _onCompleteCallback = vi.fn();
      const _cleanupFrame = vi.fn();
      const context = { _onCompleteCallback, _cleanupFrame };

      FrameService.prototype._reportFrameClosed.call(context);

      expect(_cleanupFrame).toHaveBeenCalled();
      expect(_onCompleteCallback.mock.calls[0][0]).toMatchObject({
        type: BraintreeError.types.INTERNAL,
        code: "FRAME_SERVICE_FRAME_CLOSED",
        message: "Frame closed before tokenization could occur.",
      });
    });

    it("nulls _onCompleteCallback so it can only fire once", () => {
      const _onCompleteCallback = vi.fn();
      const context = { _onCompleteCallback, _cleanupFrame: noop };

      FrameService.prototype._reportFrameClosed.call(context);

      expect(context._onCompleteCallback).toBeNull();
    });

    it("does not throw when there is no callback", () => {
      const context = { _onCompleteCallback: null, _cleanupFrame: noop };

      expect(() => {
        FrameService.prototype._reportFrameClosed.call(context);
      }).not.toThrow();
    });
  });

  describe("visibility handling", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("_addVisibilityListeners attaches after the install delay", () => {
      vi.useFakeTimers();

      const addEventListener = vi.spyOn(window.document, "addEventListener");
      const context = {};

      FrameService.prototype._addVisibilityListeners.call(context);

      expect(addEventListener).not.toHaveBeenCalledWith(
        "visibilitychange",
        expect.any(Function)
      );

      vi.advanceTimersByTime(500);

      expect(addEventListener).toHaveBeenCalledWith(
        "visibilitychange",
        expect.any(Function)
      );

      FrameService.prototype._removeVisibilityListeners.call(context);
    });

    it("_handleSuspend fires the onSuspend hook", () => {
      const _onSuspend = vi.fn();
      const context = { _onSuspend };

      FrameService.prototype._handleSuspend.call(context);

      expect(_onSuspend).toHaveBeenCalled();
    });

    it("_handleSuspend is a no-op without an onSuspend hook", () => {
      expect(() => {
        FrameService.prototype._handleSuspend.call({});
      }).not.toThrow();
    });

    it("_handleSuspend only fires onSuspend once per background", () => {
      const _onSuspend = vi.fn();
      const context = { _onSuspend };

      FrameService.prototype._handleSuspend.call(context);
      FrameService.prototype._handleSuspend.call(context);

      expect(_onSuspend).toHaveBeenCalledTimes(1);
    });

    it("_handleResume is a no-op when not backgrounded", () => {
      vi.useFakeTimers();

      const _onResume = vi.fn();
      const _reportFrameClosed = vi.fn();
      const context = {
        _backgrounded: false,
        _onResume,
        _reportFrameClosed,
        isFrameClosed: () => true,
      };

      FrameService.prototype._handleResume.call(context);
      vi.advanceTimersByTime(1000);

      expect(_onResume).not.toHaveBeenCalled();
      expect(_reportFrameClosed).not.toHaveBeenCalled();
    });

    it("_handleResume only processes the first resume after a background", () => {
      vi.useFakeTimers();

      const _onResume = vi.fn();
      const _reportFrameClosed = vi.fn();
      const context = {
        _backgrounded: true,
        _onResume,
        _reportFrameClosed,
        isFrameClosed: () => true,
      };

      // a bfcache restore can drive both pageshow and visibilitychange
      FrameService.prototype._handleResume.call(context);
      FrameService.prototype._handleResume.call(context);

      vi.advanceTimersByTime(1000);

      expect(_onResume).toHaveBeenCalledTimes(1);
      expect(_reportFrameClosed).toHaveBeenCalledTimes(1);
    });

    it("_handleResume fires onResume then re-checks the frame after the process delay", () => {
      vi.useFakeTimers();

      const _onResume = vi.fn();
      const _reportFrameClosed = vi.fn();
      const context = {
        _backgrounded: true,
        _onResume,
        _reportFrameClosed,
        isFrameClosed: () => true,
      };

      FrameService.prototype._handleResume.call(context);

      expect(_onResume).toHaveBeenCalled();
      expect(_reportFrameClosed).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1000);

      expect(_reportFrameClosed).toHaveBeenCalled();
    });

    it("_handleResume does not report closure when the frame is still open", () => {
      vi.useFakeTimers();

      const _reportFrameClosed = vi.fn();
      const context = {
        _backgrounded: true,
        _onResume: noop,
        _reportFrameClosed,
        isFrameClosed: () => false,
      };

      FrameService.prototype._handleResume.call(context);
      vi.advanceTimersByTime(1000);

      expect(_reportFrameClosed).not.toHaveBeenCalled();
    });

    it("routes visibilitychange to suspend when hidden and to resume when visible", () => {
      vi.useFakeTimers();

      const frameService = new FrameService(testContext.options);
      const hiddenGetter = vi.spyOn(window.document, "hidden", "get");
      const handleSuspend = vi
        .spyOn(FrameService.prototype, "_handleSuspend")
        .mockImplementation(noop);
      const handleResume = vi
        .spyOn(FrameService.prototype, "_handleResume")
        .mockImplementation(noop);

      frameService._addVisibilityListeners();
      vi.advanceTimersByTime(500);

      hiddenGetter.mockReturnValue(true);
      window.document.dispatchEvent(new window.Event("visibilitychange"));

      expect(handleSuspend).toHaveBeenCalled();
      expect(handleResume).not.toHaveBeenCalled();

      hiddenGetter.mockReturnValue(false);
      window.document.dispatchEvent(new window.Event("visibilitychange"));

      expect(handleResume).toHaveBeenCalled();

      frameService._removeVisibilityListeners();
    });

    it("re-checks the frame on bfcache restore (pageshow persisted)", () => {
      vi.useFakeTimers();

      const frameService = new FrameService(testContext.options);
      const handleResume = vi
        .spyOn(FrameService.prototype, "_handleResume")
        .mockImplementation(noop);

      frameService._addVisibilityListeners();
      vi.advanceTimersByTime(500);

      window.dispatchEvent(new window.Event("pageshow"));
      expect(handleResume).not.toHaveBeenCalled();

      const restoreEvent = new window.Event("pageshow");

      Object.defineProperty(restoreEvent, "persisted", { value: true });
      window.dispatchEvent(restoreEvent);

      expect(handleResume).toHaveBeenCalled();

      frameService._removeVisibilityListeners();
    });

    it("_removeVisibilityListeners detaches listeners and clears the install timer", () => {
      const removeFromDocument = vi.spyOn(
        window.document,
        "removeEventListener"
      );
      const removeFromWindow = vi.spyOn(window, "removeEventListener");
      const onVisibilityChange = noop;
      const onPageShow = noop;
      const context = {
        _visibilityInstallTimeout: setTimeout(noop, 2e3),
        _resumeRecheckTimeout: setTimeout(noop, 2e3),
        _backgrounded: true,
        _onVisibilityChange: onVisibilityChange,
        _onPageShow: onPageShow,
      };

      FrameService.prototype._removeVisibilityListeners.call(context);

      expect(removeFromDocument).toHaveBeenCalledWith(
        "visibilitychange",
        onVisibilityChange
      );
      expect(removeFromWindow).toHaveBeenCalledWith("pageshow", onPageShow);
      expect(context._onVisibilityChange).toBeNull();
      expect(context._onPageShow).toBeNull();
      expect(context._visibilityInstallTimeout).toBeNull();
      expect(context._resumeRecheckTimeout).toBeNull();
      expect(context._backgrounded).toBe(false);
    });

    it("cancels a pending resume-recheck when the frame is cleaned up", () => {
      vi.useFakeTimers();

      const _reportFrameClosed = vi.fn();
      const context = {
        _backgrounded: true,
        _onResume: noop,
        _reportFrameClosed,
        isFrameClosed: () => true,
        _cleanupFrame: FrameService.prototype._cleanupFrame,
        _removeVisibilityListeners:
          FrameService.prototype._removeVisibilityListeners,
      };

      FrameService.prototype._handleResume.call(context);

      // frame torn down (e.g. flow completed) before the recheck fires
      FrameService.prototype._removeVisibilityListeners.call(context);
      vi.advanceTimersByTime(1000);

      expect(_reportFrameClosed).not.toHaveBeenCalled();
    });
  });
});
