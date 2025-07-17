"use strict";

const {
  BaseInput,
} = require("../../../../../src/hosted-fields/internal/components/base-input");
const {
  ExpirationSplitInput,
} = require("../../../../../src/hosted-fields/internal/components/expiration-split-input");
const {
  ExpirationMonthInput,
} = require("../../../../../src/hosted-fields/internal/components/expiration-month-input");
const {
  CreditCardForm,
} = require("../../../../../src/hosted-fields/internal/models/credit-card-form");
const { events } = require("../../../../../src/hosted-fields/shared/constants");
const { createInput } = require("../../helpers");
const { findFirstEventCallback } = require("../../../../helpers");

describe("Expiration Month Input", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
    testContext.input = createInput("expirationMonth");
  });

  describe("inheritance", () => {
    it("extends BaseInput", () => {
      expect(testContext.input).toBeInstanceOf(BaseInput);
    });
  });

  describe("element creation", () => {
    describe("prefill", () => {
      it("applies prefill", () => {
        const input = new ExpirationMonthInput({
          type: "expirationMonth",
          model: new CreditCardForm({
            fields: {
              expirationMonth: {
                prefill: "09",
                selector: "#expiration-month",
                select: false,
              },
            },
          }),
        });

        expect(input.element.value).toMatch("09");
      });

      it("prefixes month value with a leading zero if it is one digit", () => {
        const input = new ExpirationMonthInput({
          type: "expirationMonth",
          model: new CreditCardForm({
            fields: {
              expirationMonth: {
                prefill: "9",
                selector: "#expiration-month",
                select: false,
              },
            },
          }),
        });

        expect(input.element.value).toMatch("09");
      });

      it("does not prefix month value with a leading zero if it is not one digit", () => {
        const input = new ExpirationMonthInput({
          type: "expirationMonth",
          model: new CreditCardForm({
            fields: {
              expirationMonth: {
                prefill: "11",
                selector: "#expiration-month",
                select: false,
              },
            },
          }),
        });

        expect(input.element.value).toMatch("11");
      });
    });

    describe("without a `select` option", () => {
      it("is an <input> element", () => {
        expect(testContext.input.element).toBeInstanceOf(HTMLInputElement);
      });

      it('has type="text"', () => {
        expect(testContext.input.element.getAttribute("type")).toMatch("text");
      });

      it("sets the maxLength to 2", () => {
        expect(testContext.input.element.getAttribute("maxlength")).toMatch(
          "2"
        );
      });
    });

    describe("with a `select` option", () => {
      it("select: false calls BaseInput's constructElement", () => {
        jest.spyOn(BaseInput.prototype, "constructElement");

        new ExpirationMonthInput({
          type: "expirationMonth",
          model: new CreditCardForm({
            fields: {
              expirationMonth: {
                selector: "#expiration-month",
                select: false,
              },
            },
          }),
        });

        expect(BaseInput.prototype.constructElement).toHaveBeenCalledTimes(1);
        // expect(BaseInput.prototype.constructElement).to.be.calledOn(input);
      });

      it("select: true creates a <select> with twelve <option>s inside", () => {
        let month, optionEl;
        const input = new ExpirationMonthInput({
          type: "expirationMonth",
          model: new CreditCardForm({
            fields: {
              expirationMonth: {
                selector: "#expiration-month",
                select: true,
              },
            },
          }),
        });

        expect(input.element).toBeInstanceOf(HTMLSelectElement);
        expect(input.element.className).toMatch("expirationMonth valid");
        expect(input.element.getAttribute("data-braintree-name")).toMatch(
          "expirationMonth"
        );
        expect(input.element.name).toMatch("expiration-month");
        expect(input.element.id).toMatch("expiration-month");

        for (month = 1; month <= 12; month++) {
          optionEl = input.element.childNodes[month - 1];

          expect(optionEl).toBeInstanceOf(HTMLOptionElement);
          expect(optionEl.value).toMatch(month.toString());
          expect(optionEl.textContent).toMatch(month.toString());
        }

        expect(input.element.querySelectorAll("option")).toHaveLength(12);
      });

      it("prepends select values with a 0 for months 1-9", () => {
        const input = new ExpirationMonthInput({
          type: "expirationMonth",
          model: new CreditCardForm({
            fields: {
              expirationMonth: {
                selector: "#expiration-month",
                select: true,
              },
            },
          }),
        });
        const nodes = input.element.childNodes;

        expect(nodes[0].value).toMatch("01");
        expect(nodes[1].value).toMatch("02");
        expect(nodes[2].value).toMatch("03");
        expect(nodes[3].value).toMatch("04");
        expect(nodes[4].value).toMatch("05");
        expect(nodes[5].value).toMatch("06");
        expect(nodes[6].value).toMatch("07");
        expect(nodes[7].value).toMatch("08");
        expect(nodes[8].value).toMatch("09");
        expect(nodes[9].value).toMatch("10");
        expect(nodes[10].value).toMatch("11");
        expect(nodes[11].value).toMatch("12");
      });

      it("select: {} creates a <select> with twelve <option>s inside", () => {
        let month, optionEl;
        const input = new ExpirationMonthInput({
          type: "expirationMonth",
          model: new CreditCardForm({
            fields: {
              expirationMonth: {
                selector: "#expiration-month",
                select: {},
              },
            },
          }),
        });

        expect(input.element).toBeInstanceOf(HTMLSelectElement);
        expect(input.element.className).toMatch("expirationMonth valid");
        expect(input.element.getAttribute("data-braintree-name")).toMatch(
          "expirationMonth"
        );
        expect(input.element.name).toMatch("expiration-month");
        expect(input.element.id).toMatch("expiration-month");

        for (month = 1; month <= 12; month++) {
          optionEl = input.element.childNodes[month - 1];

          expect(optionEl).toBeInstanceOf(HTMLOptionElement);
          expect(optionEl.value).toMatch(month.toString());
          expect(optionEl.textContent).toMatch(month.toString());
        }

        expect(input.element.querySelectorAll("option")).toHaveLength(12);
      });

      it("select: { options: null } creates a <select> with twelve <option>s inside", () => {
        let month, optionEl;
        const input = new ExpirationMonthInput({
          type: "expirationMonth",
          model: new CreditCardForm({
            fields: {
              expirationMonth: {
                selector: "#expiration-month",
                select: { options: null },
              },
            },
          }),
        });

        expect(input.element).toBeInstanceOf(HTMLSelectElement);
        expect(input.element.className).toMatch("expirationMonth valid");
        expect(input.element.getAttribute("data-braintree-name")).toMatch(
          "expirationMonth"
        );
        expect(input.element.name).toMatch("expiration-month");
        expect(input.element.id).toMatch("expiration-month");

        for (month = 1; month <= 12; month++) {
          optionEl = input.element.childNodes[month - 1];

          expect(optionEl).toBeInstanceOf(HTMLOptionElement);
          expect(optionEl.value).toMatch(month.toString());
          expect(optionEl.textContent).toMatch(month.toString());
        }

        expect(input.element.querySelectorAll("option")).toHaveLength(12);
      });

      it("select options with 13 strings creates a <select> with twelve <option>s inside", () => {
        let month, optionEl;
        const options = "abcdefghijklm".split("");
        const input = new ExpirationMonthInput({
          type: "expirationMonth",
          model: new CreditCardForm({
            fields: {
              expirationMonth: {
                selector: "#expiration-month",
                select: { options },
              },
            },
          }),
        });

        expect(input.element).toBeInstanceOf(HTMLSelectElement);
        expect(input.element.className).toMatch("expirationMonth valid");
        expect(input.element.getAttribute("data-braintree-name")).toMatch(
          "expirationMonth"
        );
        expect(input.element.name).toMatch("expiration-month");
        expect(input.element.id).toMatch("expiration-month");

        for (month = 1; month <= 12; month++) {
          optionEl = input.element.childNodes[month - 1];

          expect(optionEl).toBeInstanceOf(HTMLOptionElement);
          expect(optionEl.value).toMatch(month.toString());
          expect(optionEl.textContent).toMatch(options[month - 1]);
        }

        expect(input.element.querySelectorAll("option")).toHaveLength(12);
      });

      it("select options with 3 strings creates a <select> with twelve <option>s inside", () => {
        let month, optionEl;
        const input = new ExpirationMonthInput({
          type: "expirationMonth",
          model: new CreditCardForm({
            fields: {
              expirationMonth: {
                selector: "#expiration-month",
                select: { options: ["a", "b", "c"] },
              },
            },
          }),
        });

        expect(input.element).toBeInstanceOf(HTMLSelectElement);
        expect(input.element.className).toMatch("expirationMonth valid");
        expect(input.element.getAttribute("data-braintree-name")).toMatch(
          "expirationMonth"
        );
        expect(input.element.name).toMatch("expiration-month");
        expect(input.element.id).toMatch("expiration-month");

        for (month = 1; month <= 3; month++) {
          optionEl = input.element.childNodes[month - 1];

          expect(optionEl.value).toMatch(month.toString());
          expect(optionEl.textContent).toBe(["a", "b", "c"][month - 1]);
        }

        for (month = 4; month <= 12; month++) {
          optionEl = input.element.childNodes[month - 1];

          expect(optionEl.value).toMatch(month.toString());
          expect(optionEl.textContent).toMatch(month.toString());
        }

        expect(input.element.querySelectorAll("option")).toHaveLength(12);
      });

      it("select options with non-strings ignores the non-string options", () => {
        let optionEl;
        const input = new ExpirationMonthInput({
          type: "expirationMonth",
          model: new CreditCardForm({
            fields: {
              expirationMonth: {
                selector: "#expiration-month",
                select: { options: [99] },
              },
            },
          }),
        });

        optionEl = input.element.childNodes[0];
        expect(optionEl.value).toMatch("01");
        expect(optionEl.textContent).toMatch("1");

        expect(input.element.querySelectorAll("option")).toHaveLength(12);
      });

      it("allows a placeholder in the select", () => {
        let placeholderEl;
        const input = new ExpirationMonthInput({
          type: "expirationMonth",
          model: new CreditCardForm({
            fields: {
              expirationMonth: {
                selector: "#expiration-month",
                placeholder: "foo & <boo>",
                select: true,
              },
            },
          }),
        });

        placeholderEl = input.element.childNodes[0];
        expect(placeholderEl.value).toMatch("");
        expect(placeholderEl.getAttribute("selected")).toMatch("selected");
        expect(placeholderEl.getAttribute("disabled")).toMatch("disabled");
        expect(placeholderEl.innerHTML).toMatch("foo &amp; &lt;boo&gt;");

        expect(input.element.querySelectorAll("option")).toHaveLength(13);
      });

      it("selects current month value when no placeholder is set", () => {
        let i, el;
        const currentMonth = parseInt(new Date().getMonth(), 10);
        const input = new ExpirationMonthInput({
          type: "expirationMonth",
          model: new CreditCardForm({
            fields: {
              expirationMonth: {
                selector: "#expiration-month",
                select: true,
              },
            },
          }),
        });

        for (i = 0; i < input.element.childNodes.length; i++) {
          el = input.element.childNodes[i];

          if (i === currentMonth) {
            expect(el.getAttribute("selected")).toMatch("selected");
          } else {
            expect(el.getAttribute("selected")).toBeNull();
          }
        }
        expect(input.element.selectedIndex).toBe(currentMonth);
      });
    });

    it("has autocomplete cc-exp-month", () => {
      expect(testContext.input.element.getAttribute("autocomplete")).toMatch(
        "cc-exp-month"
      );
    });
  });

  describe("addBusEventListeners", () => {
    beforeEach(() => {
      jest.spyOn(ExpirationSplitInput.prototype, "addBusEventListeners");
    });

    it("calls parent class method", () => {
      new ExpirationMonthInput({
        type: "expirationMonth",
        model: new CreditCardForm({
          fields: {
            expirationMonth: {
              selector: "#expiration-month",
            },
          },
        }),
      });

      expect(
        ExpirationSplitInput.prototype.addBusEventListeners
      ).toHaveBeenCalledTimes(1);
    });

    it("sets up listener for SET_MONTH_OPTIONS if expiration month is a select", () => {
      new ExpirationMonthInput({
        type: "expirationMonth",
        model: new CreditCardForm({
          fields: {
            expirationMonth: {
              selector: "#expiration-month",
              select: true,
            },
          },
        }),
      });

      expect(window.bus.on).toHaveBeenCalledWith(
        events.SET_MONTH_OPTIONS,
        expect.any(Function)
      );
    });

    it("does not set up listener for SET_MONTH_OPTIONS if expiration month is not a select", () => {
      new ExpirationMonthInput({
        type: "expirationMonth",
        model: new CreditCardForm({
          fields: {
            expirationMonth: {
              selector: "#expiration-month",
            },
          },
        }),
      });

      expect(window.bus.on).not.toHaveBeenCalledWith(events.SET_MONTH_OPTIONS);
    });

    it("renames the options when SET_MONTH_OPTIONS is emitted", (done) => {
      let callback;
      const input = new ExpirationMonthInput({
        type: "expirationMonth",
        model: new CreditCardForm({
          fields: {
            expirationMonth: {
              selector: "#expiration-month",
              select: {
                options: [
                  "January",
                  "February",
                  "March",
                  "April",
                  "May",
                  "June",
                  "July",
                  "August",
                  "September",
                  "October",
                  "November",
                  "December",
                ],
              },
            },
          },
        }),
      });

      document.body.appendChild(input.element);
      expect(input.element.querySelectorAll("option")[0].textContent).toMatch(
        "January"
      );
      expect(input.element.querySelectorAll("option")[11].textContent).toMatch(
        "December"
      );

      callback = findFirstEventCallback(
        events.SET_MONTH_OPTIONS,
        window.bus.on.mock.calls
      );

      callback(
        [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "June",
          "July",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ],
        () => {
          expect(
            input.element.querySelectorAll("option")[0].textContent
          ).toMatch("Jan");
          expect(
            input.element.querySelectorAll("option")[11].textContent
          ).toMatch("Dec");

          done();
        }
      );
    });

    it("defaults to existing value if passed options are less than the options", (done) => {
      let callback;
      const input = new ExpirationMonthInput({
        type: "expirationMonth",
        model: new CreditCardForm({
          fields: {
            expirationMonth: {
              selector: "#expiration-month",
              select: {
                options: [
                  "January",
                  "February",
                  "March",
                  "April",
                  "May",
                  "June",
                  "July",
                  "August",
                  "September",
                  "October",
                  "November",
                  "December",
                ],
              },
            },
          },
        }),
      });

      callback = findFirstEventCallback(
        events.SET_MONTH_OPTIONS,
        window.bus.on.mock.calls
      );

      callback(["Jan"], () => {
        expect(input.element.querySelectorAll("option")[0].textContent).toMatch(
          "Jan"
        );
        expect(input.element.querySelectorAll("option")[1].textContent).toMatch(
          "February"
        );
        expect(
          input.element.querySelectorAll("option")[11].textContent
        ).toMatch("December");

        done();
      });
    });

    it("ignores options beyond the 12th", (done) => {
      let callback;
      const input = new ExpirationMonthInput({
        type: "expirationMonth",
        model: new CreditCardForm({
          fields: {
            expirationMonth: {
              selector: "#expiration-month",
              select: {
                options: [
                  "January",
                  "February",
                  "March",
                  "April",
                  "May",
                  "June",
                  "July",
                  "August",
                  "September",
                  "October",
                  "November",
                  "December",
                ],
              },
            },
          },
        }),
      });

      expect(input.element.querySelectorAll("option")[0].textContent).toMatch(
        "January"
      );
      expect(input.element.querySelectorAll("option")[11].textContent).toMatch(
        "December"
      );

      callback = findFirstEventCallback(
        events.SET_MONTH_OPTIONS,
        window.bus.on.mock.calls
      );

      callback(
        [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "June",
          "July",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
          "foo",
          "bar",
          "baz",
        ],
        () => {
          expect(
            input.element.querySelectorAll("option")[0].textContent
          ).toMatch("Jan");
          expect(
            input.element.querySelectorAll("option")[11].textContent
          ).toMatch("Dec");
          expect(input.element.querySelectorAll("option")[12]).toBeFalsy();

          done();
        }
      );
    });

    it("does not override the placeholder if set", (done) => {
      let callback;
      const input = new ExpirationMonthInput({
        type: "expirationMonth",
        model: new CreditCardForm({
          fields: {
            expirationMonth: {
              selector: "#expiration-month",
              placeholder: "Month",
              select: {
                options: [
                  "January",
                  "February",
                  "March",
                  "April",
                  "May",
                  "June",
                  "July",
                  "August",
                  "September",
                  "October",
                  "November",
                  "December",
                ],
              },
            },
          },
        }),
      });

      expect(input.element.querySelectorAll("option")[0].textContent).toMatch(
        "Month"
      );
      expect(input.element.querySelectorAll("option")[1].textContent).toMatch(
        "January"
      );
      expect(input.element.querySelectorAll("option")[12].textContent).toMatch(
        "December"
      );

      callback = findFirstEventCallback(
        events.SET_MONTH_OPTIONS,
        window.bus.on.mock.calls
      );

      callback(
        [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "June",
          "July",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ],
        () => {
          expect(
            input.element.querySelectorAll("option")[0].textContent
          ).toMatch("Month");
          expect(
            input.element.querySelectorAll("option")[1].textContent
          ).toMatch("Jan");
          expect(
            input.element.querySelectorAll("option")[12].textContent
          ).toMatch("Dec");

          done();
        }
      );
    });
  });
});
