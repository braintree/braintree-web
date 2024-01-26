"use strict";

const {
  runWebLogin,
  setupDesktopWebLogin,
  openPopup,
  POPUP_WIDTH,
  POPUP_HEIGHT,
} = require("../../../src/venmo/shared/web-login-backdrop");
const frameService = require("../../../src/lib/frame-service/external");
const { version: VERSION } = require("../../../package.json");

jest.mock("../../../src/lib/frame-service/external");

describe("web-login-backdrop", () => {
  const mockVenmoUrl = "https://path.com/to/venmo/login";
  const mockAssetUrl = "http://someassetserver.gateway.com";

  let mockClose,
    mockCancelTokenization,
    mockStatusCheck,
    mockFrameService,
    eventListenerMock,
    classListAddMock,
    classListRemoveMock,
    setupOptions,
    mockPaymentContextStatus,
    openOptions;

  beforeEach(() => {
    jest.clearAllMocks();
    window.open = jest.fn().mockReturnValue({ close: mockClose });
    window.setInterval = jest.fn();
    window.clearInterval = jest.fn();
    document.head.appendChild = jest.fn();
    document.body.appendChild = jest.fn();

    jest.spyOn(document, "addEventListener");
    jest.spyOn(document, "createElement");

    mockClose = jest.fn();
    mockCancelTokenization = jest.fn();
    mockStatusCheck = jest.fn().mockResolvedValue();
    mockPaymentContextStatus = jest.fn().mockResolvedValue();
    classListAddMock = jest.fn();
    eventListenerMock = jest.fn();
    classListRemoveMock = jest.fn();
    mockFrameService = {
      open: jest.fn().mockImplementation((obj, callback) => {
        return Promise.resolve(callback());
      }),
      redirect: jest.fn(),
      close: jest.fn(),
      focus: jest.fn(),
    };
    setupOptions = {
      assetsUrl: mockAssetUrl,
      cancelTokenization: mockCancelTokenization,
      checkForStatusChange: mockStatusCheck,
    };
    frameService.create = jest.fn().mockImplementation((obj, callback) => {
      return Promise.resolve(callback(mockFrameService));
    });
    document.getElementById = jest.fn().mockReturnValue({
      addEventListener: eventListenerMock,
      classList: { add: classListAddMock, remove: classListRemoveMock },
    });

    openOptions = {
      venmoUrl: mockVenmoUrl,
      frameServiceInstance: mockFrameService,
      cancelTokenization: mockCancelTokenization,
      checkForStatusChange: mockStatusCheck,
      checkPaymentContextStatus: mockPaymentContextStatus,
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("opens the popup", async () => {
    await runWebLogin(openOptions);

    expect(mockFrameService.open).toHaveBeenCalledWith(
      {},
      expect.any(Function)
    );
    expect(mockFrameService.redirect).toBeCalledWith(mockVenmoUrl);
  });

  it("queries gateway status once the popup is closed", async () => {
    const expectedRetryStartingCount = 1;

    await runWebLogin(openOptions);

    expect(mockStatusCheck).toBeCalledWith(expectedRetryStartingCount);
  });

  it("creates the backdrop and adds styles and required child elements", async () => {
    document.getElementById.mockReturnValueOnce();

    await runWebLogin(openOptions);

    expect(document.createElement).toHaveBeenCalledTimes(8);
    expect(document.createElement).toHaveBeenNthCalledWith(1, "style");
    expect(document.createElement).toHaveBeenNthCalledWith(2, "div");
    expect(document.createElement).toHaveBeenNthCalledWith(3, "div");
    expect(document.createElement).toHaveBeenNthCalledWith(4, "div");
    expect(document.createElement).toHaveBeenNthCalledWith(5, "div");
    expect(document.createElement).toHaveBeenNthCalledWith(6, "div");
    expect(document.createElement).toHaveBeenNthCalledWith(7, "button");
    expect(document.createElement).toHaveBeenNthCalledWith(8, "button");
    expect(document.head.appendChild).toBeCalled();
    expect(document.body.appendChild).toBeCalled();
  });

  it("uses existing backdrop if already rendered instead of creating it again", async () => {
    await runWebLogin(openOptions);

    expect(classListRemoveMock).toBeCalledWith("hidden");
  });

  describe("Continue Button", () => {
    it("refocuses if popup is already open", async () => {
      mockFrameService.open = jest.fn((obj, callback) => {
        callback();
      });
      frameService.create = jest.fn().mockImplementation((obj, callback) => {
        return Promise.resolve(callback(mockFrameService));
      });
      const popupName = "venmo-popup-continue-button";

      await openPopup(openOptions);

      expect(document.getElementById).toHaveBeenNthCalledWith(1, popupName);
      expect(eventListenerMock).toHaveBeenNthCalledWith(
        1,
        "click",
        expect.any(Function)
      );
      const onClickCallback = eventListenerMock.mock.calls[0][1];

      onClickCallback();
      expect(mockFrameService.focus).toBeCalled();
    });
  });

  describe("Cancel Button", () => {
    it("closes popup, cancels tokenization, and hides the backdrop when clicked", async () => {
      mockFrameService.open = jest.fn((obj, callback) => {
        callback();
      });
      frameService.create = jest.fn().mockImplementation((obj, callback) => {
        return Promise.resolve(callback(mockFrameService));
      });

      await runWebLogin(openOptions);

      const clickCancelCallback = eventListenerMock.mock.calls[1][1];

      clickCancelCallback();

      expect(mockFrameService.close).toBeCalledTimes(2);
      expect(mockCancelTokenization).toBeCalled();
      expect(classListAddMock).toBeCalledWith("hidden");
    });
  });

  describe("setupDesktopWebLogin()", () => {
    it("opens a popup via frameservice with the correct args", async () => {
      const mockWindowOuterHeight = 1000;
      const mockWindowScreenTop = 10;
      const expectedTop = 225;

      window.outerHeight = mockWindowOuterHeight;
      window.screenTop = mockWindowScreenTop;
      const mockWindowOuterWidth = 1000;
      const mockWindowScreenLeft = 10;
      const expectedLeft = 310;

      window.outerWidth = mockWindowOuterWidth;
      window.screenLeft = mockWindowScreenLeft;
      const expectedDispatchFrameUrl = `${mockAssetUrl}/web/${VERSION}/html/dispatch-frame.min.html`;
      const expectedOpenFrameUrl = `${mockAssetUrl}/web/${VERSION}/html/venmo-landing-frame.min.html`;
      const expectedCreateArgs = {
        name: "venmoDesktopWebLogin",
        dispatchFrameUrl: expectedDispatchFrameUrl,
        openFrameUrl: expectedOpenFrameUrl,
        top: expectedTop,
        left: expectedLeft,
        height: POPUP_HEIGHT,
        width: POPUP_WIDTH,
      };

      await setupDesktopWebLogin(setupOptions);

      expect(frameService.create).toBeCalledWith(
        expectedCreateArgs,
        expect.any(Function)
      );
    });

    it("minifies the assets if not in debug mode", async () => {
      const expectedMinified = ".min.html";
      const expectedArgs = {
        name: expect.any(String),
        dispatchFrameUrl: expect.stringContaining(expectedMinified),
        openFrameUrl: expect.stringContaining(expectedMinified),
        top: expect.any(Number),
        left: expect.any(Number),
        height: expect.any(Number),
        width: expect.any(Number),
      };
      const options = {
        ...setupOptions,
        debug: false,
      };

      await setupDesktopWebLogin(options);
      expect(frameService.create).toHaveBeenCalledWith(
        expectedArgs,
        expect.any(Function)
      );
    });

    it("doesn't minify the html when in debug is true", async () => {
      const expectedArgs = {
        name: expect.any(String),
        dispatchFrameUrl: expect.stringContaining("dispatch-frame.html"),
        openFrameUrl: expect.stringContaining("landing-frame.html"),
        top: expect.any(Number),
        left: expect.any(Number),
        height: expect.any(Number),
        width: expect.any(Number),
      };
      const debugTestOptions = {
        ...setupOptions,
        debug: true,
      };

      await setupDesktopWebLogin(debugTestOptions);
      expect(frameService.create).toHaveBeenCalledWith(
        expectedArgs,
        expect.any(Function)
      );
    });
  });

  describe("openPopup()", () => {
    it("opens a popup once frameService is created and redirects it to the Venmo url", async () => {
      await openPopup(openOptions);

      expect(mockFrameService.open).toBeCalledWith({}, expect.any(Function));
      expect(mockFrameService.redirect).toBeCalledWith(mockVenmoUrl);
    });

    it("sets button event listeners when frameservice is created", async () => {
      mockFrameService.open = jest.fn((obj, callback) => {
        callback();
      });
      frameService.create = jest.fn().mockImplementation((obj, callback) => {
        return Promise.resolve(callback(mockFrameService));
      });

      await openPopup(openOptions);

      expect(document.getElementById).toBeCalledWith(
        "venmo-popup-cancel-button"
      );
    });

    it("returns the data from the api on success", async () => {
      const hashFromRedirectParams = {
        venmoSuccess: 1,
      };

      mockFrameService.open = jest.fn((obj, callback) => {
        /* eslint-disable no-undefined */
        callback(undefined, hashFromRedirectParams);
      });
      frameService.create = jest.fn().mockImplementation((obj, callback) => {
        return Promise.resolve(callback(mockFrameService));
      });

      const expectedData = {
        status: "APPROVED",
        paymentMethodId: "some-id",
        username: "someusername",
        payerInfo: {},
      };

      mockStatusCheck.mockResolvedValueOnce(expectedData);

      const result = await openPopup(openOptions);

      expect(result).toBe(expectedData);
      expect(mockFrameService.close).toBeCalled();
      expect(mockFrameService.redirect).toBeCalledWith(mockVenmoUrl);
      expect(document.getElementById).toBeCalledWith(
        "venmo-desktop-web-backdrop"
      );
      expect(classListAddMock).toBeCalledWith("hidden");
    });

    it("rejects when status check rejects", async () => {
      expect.assertions(5);
      const hashFromRedirectParams = {
        venmoCancel: 1,
      };

      mockFrameService.open = jest.fn((obj, callback) => {
        /* eslint-disable no-undefined */
        callback(undefined, hashFromRedirectParams);
      });
      frameService.create = jest.fn().mockImplementation((obj, callback) => {
        return Promise.resolve(callback(mockFrameService));
      });
      const expectedRejectedValue = "some err";

      mockStatusCheck.mockRejectedValue(expectedRejectedValue);
      mockPaymentContextStatus.mockResolvedValue({ status: "FAILED" });

      await openPopup(openOptions).catch((err) => {
        expect(err).toBe(expectedRejectedValue);
        expect(mockFrameService.close).toBeCalled();
        expect(mockFrameService.redirect).toBeCalledWith(mockVenmoUrl);
        expect(document.getElementById).toBeCalledWith(
          "venmo-desktop-web-backdrop"
        );
        expect(classListAddMock).toBeCalledWith("hidden");
      });
    });

    it("rejects when open returns an error", async () => {
      expect.assertions(1);
      mockFrameService.open = jest.fn().mockImplementation((obj, callback) => {
        return Promise.resolve(callback("some error"));
      });

      await openPopup(openOptions).catch((err) => {
        expect(err).toBe("some error");
      });
    });
  });
});
