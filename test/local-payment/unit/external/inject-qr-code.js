"use strict";

const injectQrCode = require("../../../../src/local-payment/external/inject-qr-code");
const BraintreeError = require("../../../../src/lib/braintree-error");

describe("injectQrCode", () => {
  let container;

  beforeEach(() => {
    document.body.innerHTML = "";
    container = document.createElement("div");
    container.id = "qr-container";
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("with valid inputs", () => {
    it.each([
      [
        "container element",
        () => container,
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      ],
      ["CSS selector", () => "#qr-container", "validBase64Data="],
    ])(
      "injects QR code image into %s",
      (description, containerProvider, base64Data) => {
        const targetContainer = containerProvider();
        const result = injectQrCode(base64Data, targetContainer);

        expect(container.children.length).toBe(1);
        expect(container.children[0].tagName).toBe("IMG");
        expect(container.children[0].src).toBe(
          `data:image/png;base64,${base64Data}`
        );
        expect(container.children[0].alt).toBe("QR Code for payment");
        expect(result).toBe(container.children[0]);
      }
    );

    it("sets proper styling on the image", () => {
      const base64Data = "validBase64Data=";

      const result = injectQrCode(base64Data, container);

      expect(result.style.display).toBe("block");
      expect(result.style.maxWidth).toBe("100%");
      expect(result.style.height).toBe("auto");
    });

    it("clears existing content in container before injecting", () => {
      container.innerHTML = "<p>Existing content</p>";
      const base64Data = "validBase64Data=";

      injectQrCode(base64Data, container);

      expect(container.children.length).toBe(1);
      expect(container.children[0].tagName).toBe("IMG");
    });
  });

  describe("with invalid base64 data", () => {
    it.each([
      ["null", null],
      ["undefined", undefined],
      ["empty string", ""],
      ["number", 123],
      ["object", {}],
      ["array", []],
      ["invalid base64", "invalidBase64Data"],
    ])("throws error when base64Data is %s", (description, invalidData) => {
      expect(() => {
        injectQrCode(invalidData, container);
      }).toThrow(BraintreeError);

      expect(() => {
        injectQrCode(invalidData, container);
      }).toThrow("QR code data must be a valid base64 string.");
    });

    it("throws BraintreeError with correct error code for invalid data", () => {
      try {
        injectQrCode(null, container);
      } catch (error) {
        expect(error).toBeInstanceOf(BraintreeError);
        expect(error.type).toBe(BraintreeError.types.MERCHANT);
        expect(error.code).toBe("LOCAL_PAYMENT_QR_CODE_INVALID_DATA");
        expect(error.message).toBe(
          "QR code data must be a valid base64 string."
        );
      }
    });
  });

  describe("with invalid container", () => {
    it("throws error when container selector does not match any element", () => {
      expect(() => {
        injectQrCode("validBase64Data=", "#non-existent-container");
      }).toThrow(BraintreeError);

      expect(() => {
        injectQrCode("validBase64Data=", "#non-existent-container");
      }).toThrow(
        "QR code container element not found: #non-existent-container"
      );
    });

    it.each([
      ["null", null],
      ["undefined", undefined],
      ["number", 123],
      ["object", {}],
      ["array", []],
    ])("throws error when container is %s", (description, invalidContainer) => {
      expect(() => {
        injectQrCode("validBase64Data=", invalidContainer);
      }).toThrow(BraintreeError);
    });

    it("throws error when container is not an element node", () => {
      const textNode = document.createTextNode("text");

      expect(() => {
        injectQrCode("validBase64Data=", textNode);
      }).toThrow(BraintreeError);
    });

    it("throws BraintreeError with correct error code for container not found", () => {
      try {
        injectQrCode("validBase64Data=", "#non-existent");
      } catch (error) {
        expect(error).toBeInstanceOf(BraintreeError);
        expect(error.type).toBe(BraintreeError.types.MERCHANT);
        expect(error.code).toBe("LOCAL_PAYMENT_QR_CODE_CONTAINER_NOT_FOUND");
        expect(error.message).toBe(
          "QR code container element not found: #non-existent"
        );
      }
    });

    it("throws BraintreeError with correct error code for invalid container", () => {
      try {
        injectQrCode("validBase64Data=", 123);
      } catch (error) {
        expect(error).toBeInstanceOf(BraintreeError);
        expect(error.type).toBe(BraintreeError.types.MERCHANT);
        expect(error.code).toBe("LOCAL_PAYMENT_QR_CODE_INVALID_CONTAINER");
        expect(error.message).toBe(
          "QR code container must be a valid CSS selector string or HTML element."
        );
      }
    });
  });

  describe("edge cases", () => {
    it("works with complex CSS selectors", () => {
      const innerContainer = document.createElement("div");
      innerContainer.className = "inner qr-target";
      container.appendChild(innerContainer);

      const base64Data = "validBase64Data=";

      const result = injectQrCode(base64Data, ".qr-target");

      expect(innerContainer.children.length).toBe(1);
      expect(innerContainer.children[0].tagName).toBe("IMG");
      expect(result).toBe(innerContainer.children[0]);
    });

    it("replaces content when called multiple times on same container", () => {
      const base64Data1 = "firstQrCode=";
      const base64Data2 = "secondQrCode";

      injectQrCode(base64Data1, container);
      expect(container.children.length).toBe(1);
      expect(container.children[0].src).toBe(
        `data:image/png;base64,${base64Data1}`
      );

      injectQrCode(base64Data2, container);
      expect(container.children.length).toBe(1);
      expect(container.children[0].src).toBe(
        `data:image/png;base64,${base64Data2}`
      );
    });
  });
});
