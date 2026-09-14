import BraintreeError from "../../braintree-error";
import frameService from "./";
import frameServiceErrors from "../shared/errors";
import querystring from "../../querystring";

function start() {
  frameService.report(
    new BraintreeError(frameServiceErrors.FRAME_SERVICE_FRAME_CLOSED),
    querystring.parse()
  );

  frameService.asyncClose();
}

export default {
  start,
};
