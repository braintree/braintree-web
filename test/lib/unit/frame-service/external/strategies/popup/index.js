"use strict";

const Popup = require("../../../../../../../src/lib/frame-service/external/strategies/popup");
const { mockWindowOpen } = require("../../../../../../helpers");

describe("Popup", () => {
  beforeEach(() => {
    jest.spyOn(window, "open").mockImplementation(mockWindowOpen);
  });

  describe("Constructor", () => {
    it("defaults isClosed to true", () => {
      const popup = new Popup();

      expect(popup.isClosed()).toBe(true);
    });
  });

  describe("open", () => {
    it("opens a window", () => {
      const popup = new Popup({
        openFrameUrl: "https://example.com",
        name: "myFrame",
      });

      window.open.mockClear();

      popup.open();

      expect(window.open).toHaveBeenCalledTimes(1);
      expect(window.open).toHaveBeenCalledWith(
        "https://example.com",
        "myFrame",
        expect.any(String)
      );
    });
  });

  describe("focus", () => {
    it("calls the frame focus", () => {
      const popup = new Popup();

      popup._frame = {
        focus: jest.fn(),
      };

      popup.focus();

      expect(popup._frame.focus).toHaveBeenCalledTimes(1);
    });
  });

  describe("close", () => {
    it("calls the frame close", () => {
      const popup = new Popup();
      const frame = {
        close: jest.fn(),
      };

      popup._frame = frame;

      popup.close();

      expect(frame.close).toHaveBeenCalledTimes(1);
    });

    it("noop when popup is already closed", () => {
      const popup = new Popup();

      popup.open();
      popup.close();
      popup.close();

      expect(popup._frame.close).toHaveBeenCalledTimes(1);
    });
  });

  describe("closed", () => {
    it("returns false when popup is open", () => {
      const popup = new Popup();

      popup.open();

      expect(popup.isClosed()).toBe(false);
    });

    it("returns true after popup is closed", () => {
      const popup = new Popup();

      popup.open();
      popup.close();

      expect(popup.isClosed()).toBe(true);
    });

    it("returns true if there is no handle for the popup (such as from a popup blocker)", () => {
      const popup = new Popup();

      delete popup._frame;

      expect(popup.isClosed()).toBe(true);
    });

    it("returns true when Window is closed", () => {
      let popup;
      const fakeWindow = {
        closed: false,
      };

      jest.spyOn(window, "open").mockReturnValue(fakeWindow);

      popup = new Popup();
      popup.open();

      expect(popup.isClosed()).toBe(false);

      fakeWindow.closed = true;

      expect(popup.isClosed()).toBe(true);
    });
  });

  describe("redirect", () => {
    it("sets frame location href to url", () => {
      const popup = new Popup();

      popup._frame = {
        location: {
          href: "",
        },
      };

      popup.redirect("http://example.com");

      expect(popup._frame.location.href).toBe("http://example.com");
    });
  });
});
