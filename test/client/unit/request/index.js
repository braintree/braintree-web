"use strict";

const request = require("../../../../src/client/request");
const AJAXDriver = require("../../../../src/client/request/ajax-driver");
const { noop } = require("../../../helpers");

describe("Client request driver", () => {
  beforeEach(() => {
    jest.spyOn(AJAXDriver, "request").mockReturnValue(null);
  });

  it("defaults the timeout if not given", () => {
    request({}, noop);

    expect(AJAXDriver.request).toBeCalledWith(
      expect.objectContaining({
        timeout: 60000,
      }),
      expect.any(Function)
    );
  });

  it("defaults the data if not given", () => {
    request({}, noop);

    expect(AJAXDriver.request.mock.calls[0][0]).toMatchObject({
      data: {},
    });
  });

  it("defaults the method if not given", () => {
    request({}, noop);

    expect(AJAXDriver.request.mock.calls[0][0]).toMatchObject({
      method: "GET",
    });
  });

  it("uppercases the method if given", () => {
    request({ method: "post" }, noop);

    expect(AJAXDriver.request.mock.calls[0][0]).toMatchObject({
      method: "POST",
    });
  });

  it("prevents the callback from being accidentally invoked multiple times", () => {
    let count = 0;

    function callback() {
      count++;
    }

    jest.spyOn(AJAXDriver, "request").mockImplementation((_, cb) => {
      cb();
      cb();
      cb();
    });

    request({ method: "post" }, callback);

    expect(count).toBe(1);
  });
});
