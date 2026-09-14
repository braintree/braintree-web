import BraintreeError from "../../braintree-error";

/**
 * @name BraintreeError.Popup Related Error Codes
 * @ignore
 * @description Errors that occur when using a component that opens a popup window.
 * @property {INTERNAL} FRAME_SERVICE_FRAME_CLOSED - Occurs when the frame is closed before tokenization can occur.
 * @property {INTERNAL} FRAME_SERVICE_FRAME_OPEN_FAILED - Occurs when the popup could not be opened.
 */

const _default = {
  FRAME_SERVICE_FRAME_CLOSED: {
    type: BraintreeError.types.INTERNAL,
    code: "FRAME_SERVICE_FRAME_CLOSED",
    message: "Frame closed before tokenization could occur.",
  },
  FRAME_SERVICE_FRAME_OPEN_FAILED: {
    type: BraintreeError.types.INTERNAL,
    code: "FRAME_SERVICE_FRAME_OPEN_FAILED",
    message: "Frame failed to open.",
  },
};

export const { FRAME_SERVICE_FRAME_CLOSED, FRAME_SERVICE_FRAME_OPEN_FAILED } =
  _default;

export default _default;
