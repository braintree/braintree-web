"use strict";

jest.mock("../../../../../../src/lib/frame-service/shared/browser-detection");

const Modal = require("../../../../../../src/lib/frame-service/external/strategies/modal");
const browserDetection = require("../../../../../../src/lib/frame-service/shared/browser-detection");
const { noop } = require("../../../../../helpers");

describe("Modal", () => {
  beforeEach(() => {
    jest.spyOn(window, "scrollTo").mockImplementation();
  });

  it("has a focus function", () => {
    const modal = new Modal();

    expect(modal.focus).toBeInstanceOf(Function);
  });

  it("has a isClosed function", () => {
    const modal = new Modal();

    expect(modal.isClosed).toBeInstanceOf(Function);
  });

  describe("Constructor", () => {
    it("defaults closed to false", () => {
      const modal = new Modal();

      expect(modal.isClosed()).toBe(false);
    });
  });

  describe("open", () => {
    afterEach(() => {
      document.body.removeAttribute("style");
    });

    it("adds an iframe to a container", () => {
      const container = document.createElement("div");
      const modal = new Modal({ container: container });

      modal.open();

      expect(container.children).toHaveLength(1);
      expect(container.children[0]).toBeInstanceOf(HTMLIFrameElement);
    });

    it("sets closed to false", () => {
      const modal = new Modal();

      modal.open();

      expect(modal.isClosed()).toBe(false);
    });

    it("inserts iframe into a div if platform is iOS", () => {
      const container = document.createElement("div");
      const modal = new Modal({ container });

      jest.spyOn(browserDetection, "isIos").mockReturnValue(true);

      modal.open();

      expect(container.children).toHaveLength(1);
      expect(container.children[0]).toBeInstanceOf(HTMLDivElement);
      expect(container.children[0].children).toHaveLength(1);
      expect(container.children[0].children[0]).toBeInstanceOf(
        HTMLIFrameElement
      );
    });

    it("adds styling to iframe div wrapper if platform is iOS", () => {
      let div;
      const container = document.createElement("div");
      const modal = new Modal({ container });

      jest.spyOn(browserDetection, "isIos").mockReturnValue(true);

      modal.open();

      div = container.children[0];
      expect(div.style.height).toBe("100%");
      expect(div.style.width).toBe("100%");
      expect(div.style.overflow).toBe("auto");
      expect(div.style["-webkit-overflow-scrolling"]).toBe("touch");
    });

    it("sets no styles to iframe if platform is iOS and using WKWebView", () => {
      let iframe;
      const container = document.createElement("div");
      const modal = new Modal({ container });

      jest.spyOn(browserDetection, "isIos").mockReturnValue(true);
      jest.spyOn(browserDetection, "isIosWKWebview").mockReturnValue(true);

      modal.open();

      iframe = container.children[0].children[0];

      expect.assertions(10);
      [
        "position",
        "top",
        "left",
        "bottom",
        "padding",
        "margin",
        "border",
        "outline",
        "zIndex",
        "background",
      ].forEach((s) => {
        expect(iframe.style[s]).toHaveLength(0);
      });
    });

    it("locks scrolling on body if platform is iOS and using WKWebView", () => {
      const container = document.createElement("div");
      const modal = new Modal({ container });

      jest.spyOn(browserDetection, "isIos").mockReturnValue(true);
      jest.spyOn(browserDetection, "isIosWKWebview").mockReturnValue(true);

      modal.open();

      expect(document.body.style.overflow).toBe("hidden");
      expect(document.body.style.position).toBe("fixed");
    });

    it("does not lock scrolling on body by default", () => {
      const container = document.createElement("div");
      const modal = new Modal({ container });

      jest.spyOn(browserDetection, "isIos").mockReturnValue(false);
      jest.spyOn(browserDetection, "isIosWKWebview").mockReturnValue(false);

      modal.open();

      expect(document.body.style.overflow).not.toBe("hidden");
      expect(document.body.style.position).not.toBe("fixed");
    });

    it("does not lock scrolling on body when platform is iOS but not using WKWebView", () => {
      const container = document.createElement("div");
      const modal = new Modal({ container });

      jest.spyOn(browserDetection, "isIos").mockReturnValue(true);
      jest.spyOn(browserDetection, "isIosWKWebview").mockReturnValue(false);

      modal.open();

      expect(document.body.style.overflow).not.toBe("hidden");
      expect(document.body.style.position).not.toBe("fixed");
    });

    it("scrolls to top if platform is iOS and using WKWebView", () => {
      const container = document.createElement("div");
      const modal = new Modal({ container });

      jest.spyOn(browserDetection, "isIos").mockReturnValue(true);
      jest.spyOn(browserDetection, "isIosWKWebview").mockReturnValue(true);

      modal.open();

      expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
    });
  });

  describe("close", () => {
    it("removes frame and sets frame to null", () => {
      const container = { appendChild: noop, removeChild: jest.fn() };
      const modal = new Modal({ container });

      modal.open();
      modal.close();

      expect(modal._frame).toBeNull();
      expect(modal.isClosed()).toBe(true);
      expect(container.removeChild).toHaveBeenCalledTimes(1);
    });

    it("unlocks scrolling on body if platform is iOS and using WKWebView", () => {
      const container = document.createElement("div");
      const modal = new Modal({ container });

      document.body.style.overflow = "visible";
      document.body.style.position = "static";

      jest.spyOn(browserDetection, "isIos").mockReturnValue(true);
      jest.spyOn(browserDetection, "isIosWKWebview").mockReturnValue(true);

      modal.open();
      modal.close();

      expect(document.body.style.overflow).toBe("visible");
      expect(document.body.style.position).toBe("static");
    });

    it("scrolls back to previous user position if platform is iOS and using WKWebView", () => {
      const container = document.createElement("div");
      const modal = new Modal({ container });

      jest.spyOn(browserDetection, "isIos").mockReturnValue(true);
      jest.spyOn(browserDetection, "isIosWKWebview").mockReturnValue(true);

      modal.open();

      modal._savedBodyProperties.left = 10;
      modal._savedBodyProperties.top = 20;

      modal.close();

      expect(window.scrollTo).toHaveBeenCalledWith(10, 20);
    });
  });

  describe("redirect", () => {
    it("sets frame src to url", () => {
      const redirectUrl = "expected redirect url";
      const frame = {};

      Modal.prototype.redirect.call(
        {
          _frame: frame,
        },
        redirectUrl
      );

      expect(frame.src).toBe(redirectUrl);
    });
  });
});
