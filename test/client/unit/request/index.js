import request from "../../../../src/client/request";
import fetchDriver from "../../../../src/client/request/fetch";
import { noop } from "../../../helpers";

describe("Client request driver", () => {
  beforeEach(() => {
    vi.spyOn(fetchDriver, "request").mockReturnValue(null);
  });

  it("defaults the timeout if not given", () => {
    request({}, noop);

    expect(fetchDriver.request).toBeCalledWith(
      expect.objectContaining({
        timeout: 60000,
      }),
      expect.any(Function)
    );
  });

  it("defaults the data if not given", () => {
    request({}, noop);

    expect(fetchDriver.request.mock.calls[0][0]).toMatchObject({
      data: {},
    });
  });

  it("defaults the method if not given", () => {
    request({}, noop);

    expect(fetchDriver.request.mock.calls[0][0]).toMatchObject({
      method: "GET",
    });
  });

  it("capitalizes the method if given", () => {
    request({ method: "post" }, noop);

    expect(fetchDriver.request.mock.calls[0][0]).toMatchObject({
      method: "POST",
    });
  });

  it("prevents the callback from being accidentally invoked multiple times", () => {
    let count = 0;

    function callback() {
      count++;
    }

    vi.spyOn(fetchDriver, "request").mockImplementation((_, cb) => {
      cb();
      cb();
      cb();
    });

    request({ method: "post" }, callback);

    expect(count).toBe(1);
  });
});
