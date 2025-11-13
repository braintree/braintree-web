"use strict";

var BraintreeError = require("../../lib/braintree-error");
var errors = require("../shared/errors");

/**
 * Injects a QR code image into a specified container element.
 * @function
 * @param {string} base64Data The base64 encoded QR code image data.
 * @param {(string|HTMLElement)} container A CSS selector string or HTML element to inject the QR code into.
 * @returns {HTMLImageElement} The created image element containing the QR code.
 * @throws {BraintreeError} Throws an error if the container is invalid or base64 data is invalid.
 */
function injectQrCode(base64Data, container) {
  var containerElement, imageElement;
  var base64regex =
    /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;

  if (
    !base64Data ||
    typeof base64Data !== "string" ||
    !base64regex.test(base64Data)
  ) {
    throw new BraintreeError(errors.LOCAL_PAYMENT_QR_CODE_INVALID_DATA);
  }

  if (typeof container === "string") {
    containerElement = document.querySelector(container);
    if (!containerElement) {
      throw new BraintreeError({
        type: BraintreeError.types.MERCHANT,
        code: "LOCAL_PAYMENT_QR_CODE_CONTAINER_NOT_FOUND",
        message: "QR code container element not found: " + container,
      });
    }
  } else if (container && container.nodeType === Node.ELEMENT_NODE) {
    containerElement = container;
  } else {
    throw new BraintreeError(errors.LOCAL_PAYMENT_QR_CODE_INVALID_CONTAINER);
  }

  containerElement.innerHTML = "";

  imageElement = document.createElement("img");
  imageElement.src = "data:image/png;base64," + base64Data;
  imageElement.alt = "QR Code for payment";
  imageElement.style.display = "block";
  imageElement.style.maxWidth = "100%";
  imageElement.style.height = "auto";

  containerElement.appendChild(imageElement);

  return imageElement;
}

module.exports = injectQrCode;
