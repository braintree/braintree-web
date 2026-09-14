vi.mock("../../../../src/hosted-fields/shared/browser-detection");

import browserDetection from "../../../../src/hosted-fields/shared/browser-detection";
import focusIntercept from "../../../../src/hosted-fields/shared/focus-intercept";
import { navigationDirections as directions } from "../../../../src/hosted-fields/shared/constants";
import { triggerEvent } from "../helpers";

const DOCUMENT_FRAGMENT_NODE_TYPE = 11;
const ELEMENT_NODE_TYPE = 1;

describe("focusIntercept", () => {
  beforeEach(() => {
    browserDetection.hasSoftwareKeyboard.mockReturnValue(true);
  });

  describe("generate", () => {
    describe("on targeted devices", () => {
      it("adds focus intercept input to page for Firefox", () => {
        let input;

        browserDetection.hasSoftwareKeyboard.mockReturnValue(false);
        browserDetection.isFirefox.mockReturnValue(true);

        input = focusIntercept.generate(
          "unique-id",
          "type",
          "direction",
          vi.fn()
        );

        expect(input.nodeType).toBe(ELEMENT_NODE_TYPE);
      });

      it("has the expected attributes", () => {
        const input = focusIntercept.generate(
          "unique-id",
          "type",
          "direction",
          vi.fn()
        );

        expect(input.getAttribute("aria-hidden")).toContain("true");
        expect(input.getAttribute("autocomplete")).toContain("off");
        expect(input.getAttribute("class")).toContain("focus-intercept");
        expect(input.getAttribute("data-braintree-direction")).toContain(
          "direction"
        );
        expect(input.getAttribute("data-braintree-type")).toContain("type");
        expect(input.getAttribute("id")).toContain(
          "bt-type-direction-unique-id"
        );
        expect(input.getAttribute("style")).toContain(
          "border:none !important;display:block !important;height:1px !important;left:-1px !important;opacity:0 !important;position:absolute !important;top:-1px !important;width:1px !important"
        );
      });

      it("adds event handlers to inputs", () =>
        new Promise((resolve) => {
          const input = focusIntercept.generate(
            "unique-id",
            "cvv",
            directions.BACK,
            (event) => {
              expect(event.target.getAttribute("id")).toContain(
                `bt-cvv-${directions.BACK}-unique-id`
              );
              expect(event.type).toContain("focus");
              resolve();
            }
          );

          triggerEvent("focus", input);
        }));

      it("does not blur the input when on a browser with a software keyboard", () =>
        new Promise((resolve) => {
          const input = focusIntercept.generate(
            "unique-id",
            "cvv",
            directions.BACK,
            () => {
              // would happen after the handler is called
              setTimeout(() => {
                expect(input.blur).not.toBeCalled();
                resolve();
              }, 1);
            }
          );

          browserDetection.hasSoftwareKeyboard.mockReturnValue(true);
          vi.spyOn(input, "blur").mockReturnValue(null);

          triggerEvent("focus", input);
        }));

      it("does blur the input when on a browser without a software keyboard", () =>
        new Promise((resolve) => {
          const input = focusIntercept.generate(
            "unique-id",
            "cvv",
            directions.BACK,
            () => {
              // happens after the handler is called
              setTimeout(() => {
                expect(input.blur).toHaveBeenCalledTimes(1);
                resolve();
              }, 1);
            }
          );

          browserDetection.hasSoftwareKeyboard.mockReturnValue(false);
          vi.spyOn(input, "blur").mockReturnValue(null);

          triggerEvent("focus", input);
        }));
    });

    describe("on devices that do not require focus intercepts", () => {
      beforeEach(() => {
        browserDetection.hasSoftwareKeyboard.mockReturnValue(false);
        browserDetection.isFirefox.mockReturnValue(false);
      });

      it("returns an empty document fragment", () => {
        expect(focusIntercept.generate().nodeType).toBe(
          DOCUMENT_FRAGMENT_NODE_TYPE
        );
      });
    });
  });

  describe("destroy", () => {
    it("does nothing if there are not focusIntercept inputs to destroy", () => {
      vi.spyOn(Node.prototype, "removeChild");
      focusIntercept.destroy();

      expect(Node.prototype.removeChild).not.toBeCalled();
    });

    describe("on targeted devices", () => {
      let testContext;

      beforeEach(() => {
        testContext = {};

        testContext.form = document.createElement("form");
        document.body.appendChild(testContext.form);
      });

      afterEach(() => {
        document.body.removeChild(testContext.form);
      });

      it("removes the desired focusInput when called with an ID string", () => {
        testContext.form.appendChild(
          focusIntercept.generate(
            "unique-id",
            "cvv",
            directions.FORWARD,
            vi.fn()
          )
        );

        expect(document.getElementsByClassName("focus-intercept")).toHaveLength(
          1
        );
        focusIntercept.destroy(`bt-cvv-${directions.FORWARD}-unique-id`);
        expect(document.getElementsByClassName("focus-intercept")).toHaveLength(
          0
        );
      });

      it("removes the desired internal focusInput when called with an ID string", () => {
        testContext.form.appendChild(
          focusIntercept.generate(
            "unique-id",
            "cvv",
            directions.FORWARD,
            vi.fn()
          )
        );

        expect(document.getElementsByClassName("focus-intercept")).toHaveLength(
          1
        );
        focusIntercept.destroy(`bt-cvv-${directions.FORWARD}-unique-id`);
        expect(document.getElementsByClassName("focus-intercept")).toHaveLength(
          0
        );
      });

      it("does not remove anything when argument does not match existing element", () => {
        testContext.form.appendChild(
          focusIntercept.generate("unique-id", "cvv", directions.BACK, vi.fn())
        );

        expect(document.getElementsByClassName("focus-intercept")).toHaveLength(
          1
        );
        focusIntercept.destroy(`bt-number-${directions.FORWARD}-unique-id`);
        expect(document.getElementsByClassName("focus-intercept")).toHaveLength(
          1
        );
      });

      it("removes all focusIntercept inputs when called without an ID string", () => {
        testContext.form.appendChild(
          focusIntercept.generate(
            "unique-id",
            "number",
            directions.BACK,
            vi.fn()
          )
        );
        testContext.form.appendChild(
          focusIntercept.generate(
            "unique-id",
            "number",
            directions.FORWARD,
            vi.fn()
          )
        );
        testContext.form.appendChild(
          focusIntercept.generate(
            "unique-id",
            "expirationDate",
            directions.BACK,
            vi.fn()
          )
        );
        testContext.form.appendChild(
          focusIntercept.generate(
            "unique-id",
            "expirationDate",
            directions.FORWARD,
            vi.fn()
          )
        );
        testContext.form.appendChild(
          focusIntercept.generate("unique-id", "cvv", directions.BACK, vi.fn())
        );
        testContext.form.appendChild(
          focusIntercept.generate(
            "unique-id",
            "cvv",
            directions.FORWARD,
            vi.fn()
          )
        );

        expect(document.getElementsByClassName("focus-intercept")).toHaveLength(
          6
        );
        focusIntercept.destroy();
        expect(document.getElementsByClassName("focus-intercept")).toHaveLength(
          0
        );
      });

      it("removes all focusIntercept inputs when called with a falsy value", () => {
        testContext.form.appendChild(
          focusIntercept.generate(
            "unique-id",
            "number",
            directions.BACK,
            vi.fn()
          )
        );
        testContext.form.appendChild(
          focusIntercept.generate(
            "unique-id",
            "number",
            directions.FORWARD,
            vi.fn()
          )
        );
        testContext.form.appendChild(
          focusIntercept.generate(
            "unique-id",
            "expirationDate",
            directions.BACK,
            vi.fn()
          )
        );
        testContext.form.appendChild(
          focusIntercept.generate(
            "unique-id",
            "expirationDate",
            directions.FORWARD,
            vi.fn()
          )
        );
        testContext.form.appendChild(
          focusIntercept.generate("unique-id", "cvv", directions.BACK, vi.fn())
        );
        testContext.form.appendChild(
          focusIntercept.generate(
            "unique-id",
            "cvv",
            directions.FORWARD,
            vi.fn()
          )
        );

        expect(document.getElementsByClassName("focus-intercept")).toHaveLength(
          6
        );
        focusIntercept.destroy(null);
        expect(document.getElementsByClassName("focus-intercept")).toHaveLength(
          0
        );
      });

      it("does not remove element with ID that matches argument but is not a focusIntercept", () => {
        const protectedElement = document.createElement("input");

        protectedElement.setAttribute("aria-hidden", "true");
        protectedElement.setAttribute("autocomplete", "off");
        protectedElement.setAttribute("class", "focus-intercept");
        protectedElement.setAttribute("id", "do-not-destroy-me");

        testContext.form.appendChild(
          focusIntercept.generate(
            "unique-id",
            "number",
            directions.BACK,
            vi.fn()
          )
        );
        testContext.form.appendChild(protectedElement);
        testContext.form.appendChild(
          focusIntercept.generate(
            "unique-id",
            "number",
            directions.FORWARD,
            vi.fn()
          )
        );

        expect(document.getElementsByClassName("focus-intercept")).toHaveLength(
          3
        );
        focusIntercept.destroy("do-not-destroy-me");
        expect(document.getElementsByClassName("focus-intercept")).toHaveLength(
          3
        );
      });
    });
  });

  describe("match", () => {
    it("returns true when passed in a string matching focusIntercept ids", () => {
      expect(
        focusIntercept.matchFocusElement(
          `bt-cvv-${directions.FORWARD}-unique-id`
        )
      ).toBe(true);
    });

    it("returns false when no id is passed in", () => {
      expect(focusIntercept.matchFocusElement()).toBe(false);
    });

    it("returns false when passed in a string that does not contain an allowed field", () => {
      expect(
        focusIntercept.matchFocusElement(
          `bt-name-${directions.FORWARD}-unique-id`
        )
      ).toBe(false);
    });

    it("returns false when passed in a string that does not match focusIntercept ids", () => {
      expect(focusIntercept.matchFocusElement("bring-me-a-popsicle")).toBe(
        false
      );
    });
  });
});
