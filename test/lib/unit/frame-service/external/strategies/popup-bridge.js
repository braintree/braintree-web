"use strict";

const PopupBridge = require("../../../../../../src/lib/frame-service/external/strategies/popup-bridge");
const BraintreeError = require("../../../../../../src/lib/braintree-error");
const { noop } = require("../../../../../helpers");

describe("PopupBridge", () => {
  beforeEach(() => {
    window.popupBridge = { open: jest.fn() };
  });

  describe("Constructor", () => {
    it("defaults closed to false", () => {
      const popupBridge = new PopupBridge();

      expect(popupBridge.isClosed()).toBe(false);
    });
  });

  it("has a focus function", () => {
    const popupBridge = new PopupBridge();

    expect(popupBridge.focus).toBeInstanceOf(Function);
  });

  it("has a close function", () => {
    const popupBridge = new PopupBridge();

    expect(popupBridge.close).toBeInstanceOf(Function);
  });

  it("has a isClosed function", () => {
    const popupBridge = new PopupBridge();

    expect(popupBridge.isClosed).toBeInstanceOf(Function);
  });

  describe("initialize", () => {
    it("sets an onComplete function on window.popupBridge", () => {
      const popupBridge = new PopupBridge({});

      popupBridge.initialize(noop);

      expect(window.popupBridge.onComplete).toBeInstanceOf(Function);
    });

    it("calls callback with payload when onComplete is called", () => {
      const popupBridge = new PopupBridge({});
      const payload = { foo: "bar" };
      const cb = jest.fn();

      popupBridge.initialize(cb);

      window.popupBridge.onComplete(null, payload);

      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenCalledWith(null, payload);
    });

    it("sets closed to true", () => {
      const popupBridge = new PopupBridge({});
      const payload = { foo: "bar" };

      popupBridge.initialize(noop);

      window.popupBridge.onComplete(null, payload);

      expect(popupBridge.isClosed()).toBe(true);
    });

    it("calls callback with error when onComplete is called with an error", (done) => {
      const popupBridge = new PopupBridge({});
      const error = new Error("Some error");

      popupBridge.initialize((err, payload) => {
        expect(payload).toBeFalsy();
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.message).toBe(
          "Frame closed before tokenization could occur."
        );
        done();
      });

      window.popupBridge.onComplete(error);
    });

    it("calls callback with error when onComplete is called without an error or payload", (done) => {
      const popupBridge = new PopupBridge({});

      popupBridge.initialize((err, payload) => {
        expect(payload).toBeFalsy();
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.message).toBe(
          "Frame closed before tokenization could occur."
        );
        done();
      });

      window.popupBridge.onComplete();
    });
  });

  describe("open", () => {
    it("sets closed to false", () => {
      const popupBridge = new PopupBridge({ openFrameUrl: "foo" });

      popupBridge.open();

      expect(popupBridge.isClosed()).toBe(false);
    });

    it("calls popupBridge.open with instantiated url", () => {
      const openFrameUrl = "open url";
      const popupBridge = new PopupBridge({ openFrameUrl });

      popupBridge.open();

      expect(window.popupBridge.open).toHaveBeenCalledTimes(1);
      expect(window.popupBridge.open).toHaveBeenCalledWith(openFrameUrl);
    });

    it("calls popupBridge.open with passed in url if provided", () => {
      const openFrameUrl = "new url";
      const popupBridge = new PopupBridge({ openFrameUrl: "initializedUrl" });

      popupBridge.open({ openFrameUrl });

      expect(window.popupBridge.open).toHaveBeenCalledTimes(1);
      expect(window.popupBridge.open).toHaveBeenCalledWith(openFrameUrl);
    });
  });

  describe("redirect", () => {
    it("calls open with frameUrl", () => {
      const openFrameUrl = "expected redirect url";
      const popupBridge = new PopupBridge({});

      jest.spyOn(popupBridge, "open");

      popupBridge.redirect(openFrameUrl);

      expect(popupBridge.open).toHaveBeenCalledTimes(1);
      expect(popupBridge.open).toHaveBeenCalledWith({ openFrameUrl });
    });
  });
});
