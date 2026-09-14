import frameService from "../../../../../src/lib/frame-service/internal";
import { DISPATCH_FRAME_REPORT } from "../../../../../src/lib/frame-service/shared/events";
import {
  DISPATCH_FRAME_NAME,
  POPUP_CLOSE_TIMEOUT,
} from "../../../../../src/lib/frame-service/shared/constants";

describe("frame-service", () => {
  it("is true", () => {
    expect(true).toBe(true);
  });
  let testContext;

  beforeEach(() => {
    testContext = {};

    vi.spyOn(window, "open").mockImplementation();
    testContext.id = "id";
    testContext.cached = {
      globalOpener: window.opener,
      globalParent: window.parent,
    };
    window.opener = { frames: {} };
  });

  afterEach(() => {
    window.opener = testContext.cached.globalOpener;
    window.parent = testContext.cached.globalParent;
  });

  describe("getFrame", () => {
    it("to return a frame from window.opener", () => {
      window.name = `${DISPATCH_FRAME_NAME}_${testContext.id}`;
      window.opener.frames[`${DISPATCH_FRAME_NAME}_${testContext.id}`] =
        "frame";

      expect(frameService.getFrame()).toBe("frame");
    });

    it("to return a frame from window.parent", () => {
      delete window.opener;
      window.parent = { frames: {} };

      window.name = `${DISPATCH_FRAME_NAME}_${testContext.id}`;
      window.parent.frames[`${DISPATCH_FRAME_NAME}_${testContext.id}`] =
        "frame";

      expect(frameService.getFrame()).toBe("frame");
    });

    it("ignores query params in frame name", () => {
      delete window.opener;
      window.parent = { frames: {} };

      window.name = `${DISPATCH_FRAME_NAME}_${testContext.id}?query=param`;
      window.parent.frames[`${DISPATCH_FRAME_NAME}_${testContext.id}`] =
        "frame";

      expect(frameService.getFrame()).toBe("frame");
    });

    it("throws an error when frame is empty", () => {
      expect(() => frameService.getFrame()).toThrowError(
        "Braintree is inactive"
      );
    });
  });

  describe("report", () => {
    it("emits an error and a payload", () => {
      const frame = { bus: { emit: vi.fn() } };

      window.name = `${DISPATCH_FRAME_NAME}_${testContext.id}`;
      window.opener.frames[`${DISPATCH_FRAME_NAME}_${testContext.id}`] = frame;

      frameService.report("err", "payload");

      expect(frame.bus.emit).toHaveBeenCalledTimes(1);
      expect(frame.bus.emit.mock.calls[0][0]).toBe(DISPATCH_FRAME_REPORT);
      expect(frame.bus.emit.mock.calls[0][1]).toMatchObject({
        err: "err",
        payload: "payload",
      });
    });

    it("passes an error back to the callback if getFrame errors", () =>
      new Promise((resolve) => {
        window.name = `${DISPATCH_FRAME_NAME}_wont_find_it`;

        frameService.report("err", "payload", (err) => {
          expect(err.message).toBe("Braintree is inactive");

          resolve();
        });
      }));
  });

  describe("asyncClose", () => {
    it("async call to window.close", () => {
      vi.useFakeTimers();
      vi.spyOn(window, "close").mockImplementation();
      frameService.asyncClose();

      vi.advanceTimersByTime(POPUP_CLOSE_TIMEOUT + 10);
      expect(window.close).toHaveBeenCalled();
    });
  });
});
