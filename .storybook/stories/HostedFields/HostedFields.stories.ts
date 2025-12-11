import type { Meta, StoryObj } from "@storybook/html";
import { createSimpleBraintreeStory } from "../../utils/story-helper";
import { getAuthorizationToken } from "../../utils/sdk-config";
import { TEST_CARDS } from "../../utils/test-data";
import { SUCCESS_MESSAGES } from "../../constants";
import "./hostedFields.css";

const meta: Meta = {
  title: "Braintree/Hosted Fields",
  parameters: {
    layout: "centered",
    braintreeScripts: ["hosted-fields"],
    docs: {
      description: {
        component: `
Hosted Fields allow you to create secure payment forms while maintaining full control over styling and user experience.
Each field is rendered in a secure iframe that can be styled to match your application's design.
        `,
      },
    },
  },
};

export default meta;

const createHostedFieldsForm = (args?: Record<string, string>): HTMLElement => {
  const container = document.createElement("div");

  // Use args to conditionally include postal code field
  const postalCodeField = args?.includePostalCode
    ? `
    <div class="form-field">
      <label for="postal-code" class="shared-label">Postal Code</label>
      <div id="postal-code" class="hosted-field-container"></div>
    </div>
  `
    : "";

  container.innerHTML = `
    <div class="shared-container hosted-fields-container">
      <h2 class="hosted-fields-heading">Braintree Hosted Fields</h2>

      <form id="checkout-form" class="hosted-fields-form">
        <div class="form-field">
          <label for="card-number" class="shared-label">Card Number</label>
          <div id="card-number" class="hosted-field-container"></div>
        </div>

        <div class="form-field-group">
          <div class="form-field-flex">
            <label for="expiration-date" class="shared-label">Expiration Date</label>
            <div id="expiration-date" class="hosted-field-container"></div>
          </div>
          <div class="form-field-flex">
            <label for="cvv" class="shared-label">CVV</label>
            <div id="cvv" class="hosted-field-container"></div>
          </div>
        </div>

        ${postalCodeField}

        <button type="submit" id="submit-button" class="shared-button submit-button" disabled>Pay Now</button>
      </form>

      <div id="card-type"></div>
      <div id="emptyEvent"></div>
      <div id="notEmptyEvent"></div>
      <div id="focus"></div>
      <div id="blur"></div>
      <div id="inputSubmitRequest"></div>
      <div id="binAvailable"></div>

      <div class="form-field-group" style="margin-top: 20px;">
        <label for="field-to-clear" class="shared-label">Field Actions</label>
        <select id="field-to-clear" class="field-control">
          <option value="number">Card Number</option>
          <option value="cvv">CVV</option>
          <option value="expirationDate">Expiration Date</option>
          <option value="postalCode">Postal Code</option>
        </select>
        <button id="clear-field-button" class="shared-button" type="button">Clear Field</button>
      </div>

      <div class="form-field-group" style="margin-top: 10px;">
        <label for="class-action-field" class="shared-label">Class Actions</label>
        <select id="class-action-field" class="field-control">
          <option value="number">Card Number</option>
          <option value="cvv">CVV</option>
          <option value="expirationDate">Expiration Date</option>
          <option value="postalCode">Postal Code</option>
        </select>
        <input type="text" id="class-name-input" placeholder="custom-class" value="custom-class" />
        <button id="add-class-button" class="shared-button" type="button">Add Class</button>
        <button id="remove-class-button" class="shared-button" type="button">Remove Class</button>
      </div>

      <div class="form-field-group" style="margin-top: 10px;">
        <label for="attribute-field" class="shared-label">Attribute Actions</label>
        <select id="attribute-field" class="field-control">
          <option value="cvv">CVV</option>
          <option value="number">Card Number</option>
          <option value="expirationDate">Expiration Date</option>
          <option value="postalCode">Postal Code</option>
        </select>
        <input type="text" id="attribute-name-input" placeholder="placeholder" value="placeholder" />
        <input type="text" id="attribute-value-input" placeholder="Security Code" value="Security Code" />
        <button id="set-attribute-button" class="shared-button" type="button">Set Attribute</button>
        <button id="remove-attribute-button" class="shared-button" type="button">Remove Attribute</button>
      </div>

      <div class="form-field-group" style="margin-top: 10px;">
        <label for="focus-field" class="shared-label">Focus Field</label>
        <select id="focus-field" class="field-control">
          <option value="number">Card Number</option>
          <option value="cvv">CVV</option>
          <option value="expirationDate">Expiration Date</option>
          <option value="postalCode">Postal Code</option>
        </select>
        <button id="focus-field-button" class="shared-button" type="button">Focus Field</button>
      </div>

      <div class="form-field-group" style="margin-top: 10px;">
        <button id="get-state-button" class="shared-button" type="button">Get State</button>
        <div id="state-container"></div>
      </div>


      <div class="form-field-group" style="margin-top: 10px;">
        <button id="teardown-button" class="shared-button" type="button" disabled>Teardown Component</button>
        <div id="teardown-status"></div>
      </div>

      <div id="result" class="shared-result"></div>
    </div>
  `;

  return container;
};

const setupBraintreeHostedFields = (
  container,
  args?: Record<string, string>,
  debugMode?: boolean
) => {
  const authorization = getAuthorizationToken();

  window.braintree.client
    .create({
      authorization: authorization,
      ...(debugMode !== undefined && { debug: debugMode }),
    })
    .then((clientInstance) => {
      // Configure fields based on args
      const fields = {
        number: {
          selector: "#card-number",
          placeholder: "4111 1111 1111 1111",
          prefill: args?.autoFillTestData
            ? TEST_CARDS[args.cardType as keyof typeof TEST_CARDS]?.number
            : "",
        },
        cvv: {
          selector: "#cvv",
          placeholder: "123",
          prefill: args?.autoFillTestData
            ? TEST_CARDS[args.cardType as keyof typeof TEST_CARDS]?.cvv
            : "",
        },
        expirationDate: {
          selector: "#expiration-date",
          placeholder: "MM/YY",
          prefill: args?.autoFillTestData
            ? TEST_CARDS[args.cardType as keyof typeof TEST_CARDS]
                ?.expirationDate
            : "",
        },
        // Only include postal code field if specified in args
        ...(args?.includePostalCode && {
          postalCode: {
            selector: "#postal-code",
            placeholder: "12345",
            prefill: args?.autoFillTestData
              ? TEST_CARDS[args.cardType as keyof typeof TEST_CARDS]?.postalCode
              : "",
          },
        }),
      };

      return window.braintree.hostedFields.create({
        client: clientInstance,
        styles: {
          input: {
            "font-size": "14px",
            color: "#3a3a3a",
          },
          "input.invalid": {
            color: "red",
          },
          "input.valid": {
            color: "green",
          },
          ":focus": {
            color: "black",
          },
        },
        fields: fields,
      });
    })
    .then((hostedFieldsInstance) => {
      const form = container.querySelector("#checkout-form") as HTMLElement;
      const emptyEventContainer = container.querySelector("#emptyEvent");
      const notEmptyEventContainer = container.querySelector("#notEmptyEvent");
      const focusEventContainer = container.querySelector("#focus");
      const blurEventContainer = container.querySelector("#blur");
      const binAvailableContainer = container.querySelector("#binAvailable");
      const inputSubmitRequestContainer = container.querySelector(
        "#inputSubmitRequest"
      );
      const submitButton = container.querySelector(
        "#submit-button"
      ) as HTMLButtonElement;
      const resultDiv = container.querySelector("#result") as HTMLElement;

      hostedFieldsInstance.on("validityChange", (event) => {
        const allFieldsValid = Object.keys(event.fields).every((key) => {
          return event.fields[key].isValid;
        });

        submitButton.disabled = !allFieldsValid;
        if (allFieldsValid) {
          submitButton.classList.add("submit-button--success");
        } else {
          submitButton.classList.remove("submit-button--success");
        }
      });

      // Enable the teardown button now that the hosted fields are fully initialized
      const teardownButton = container.querySelector("#teardown-button");
      teardownButton.disabled = false;

      hostedFieldsInstance.on("cardTypeChange", (event) => {
        const cardTypeContainer = container.querySelector("#card-type");
        if (!event.fields.number.isEmpty) {
          cardTypeContainer.innerHTML =
            "Detected Card Type: " + event.cards[0].niceType;
        } else {
          cardTypeContainer.innerHTML = "";
        }
      });

      hostedFieldsInstance.on("empty", (event) => {
        emptyEventContainer.classList.add(event.emittedBy);
        notEmptyEventContainer.classList.remove(event.emittedBy);
      });

      hostedFieldsInstance.on("notEmpty", (event) => {
        notEmptyEventContainer.classList.add(event.emittedBy);
        emptyEventContainer.classList.remove(event.emittedBy);
      });

      hostedFieldsInstance.on("focus", (event) => {
        focusEventContainer.classList.add(event.emittedBy);
        blurEventContainer.classList.remove(event.emittedBy);
      });

      hostedFieldsInstance.on("blur", (event) => {
        blurEventContainer.classList.add(event.emittedBy);
        focusEventContainer.classList.remove(event.emittedBy);
      });

      hostedFieldsInstance.on("inputSubmitRequest", (event) => {
        inputSubmitRequestContainer.classList.add(event.emittedBy);
      });

      hostedFieldsInstance.on("binAvailable", () => {
        binAvailableContainer.setAttribute("binAvailable", true);
      });

      // Add clear field button functionality
      const clearFieldButton = container.querySelector("#clear-field-button");
      const fieldToClearSelect = container.querySelector("#field-to-clear");

      clearFieldButton.addEventListener("click", () => {
        const fieldToClear = fieldToClearSelect.value;
        hostedFieldsInstance.clear(fieldToClear);
      });

      // Add class button functionality
      const classActionFieldSelect = container.querySelector(
        "#class-action-field"
      );
      const classNameInput = container.querySelector("#class-name-input");
      const addClassButton = container.querySelector("#add-class-button");
      const removeClassButton = container.querySelector("#remove-class-button");

      addClassButton.addEventListener("click", () => {
        const field = classActionFieldSelect.value;
        const className = classNameInput.value;
        hostedFieldsInstance.addClass(field, className);
      });

      removeClassButton.addEventListener("click", () => {
        const field = classActionFieldSelect.value;
        const className = classNameInput.value;
        hostedFieldsInstance.removeClass(field, className);
      });

      const attributeFieldSelect = container.querySelector("#attribute-field");
      const attributeNameInput = container.querySelector(
        "#attribute-name-input"
      );
      const attributeValueInput = container.querySelector(
        "#attribute-value-input"
      );
      const setAttributeButton = container.querySelector(
        "#set-attribute-button"
      );
      const removeAttributeButton = container.querySelector(
        "#remove-attribute-button"
      );

      setAttributeButton.addEventListener("click", () => {
        const field = attributeFieldSelect.value;
        const attributeName = attributeNameInput.value;
        const attributeValue = attributeValueInput.value;

        hostedFieldsInstance.setAttribute({
          field: field,
          attribute: attributeName,
          value: attributeName === "disabled" ? true : attributeValue,
        });
      });

      removeAttributeButton.addEventListener("click", () => {
        const field = attributeFieldSelect.value;
        const attributeName = attributeNameInput.value;

        hostedFieldsInstance.removeAttribute({
          field: field,
          attribute: attributeName,
        });
      });

      const focusFieldButton = container.querySelector("#focus-field-button");
      const focusFieldSelect = container.querySelector("#focus-field");

      focusFieldButton.addEventListener("click", () => {
        const fieldToFocus = focusFieldSelect.value;
        hostedFieldsInstance.focus(fieldToFocus);
      });

      const getStateButton = container.querySelector("#get-state-button");
      const stateContainer = container.querySelector("#state-container");

      getStateButton.addEventListener("click", () => {
        const state = hostedFieldsInstance.getState();
        stateContainer.textContent = JSON.stringify(state, null, 2);
        stateContainer.setAttribute("data-state", JSON.stringify(state));
      });

      const teardownStatus = container.querySelector("#teardown-status");

      teardownButton.addEventListener("click", () => {
        teardownStatus.textContent = "Tearing down...";
        hostedFieldsInstance
          .teardown()
          .then(() => {
            teardownStatus.textContent = "Teardown complete";
          })
          .catch((err) => {
            teardownStatus.textContent = `Teardown failed: ${err.message}`;
          });
      });

      form.addEventListener("submit", (event) => {
        event.preventDefault();

        submitButton.disabled = true;
        submitButton.textContent = "Processing...";

        hostedFieldsInstance
          .tokenize()
          .then((payload) => {
            resultDiv.classList.add(
              "shared-result--visible",
              "shared-result--success"
            );
            resultDiv.classList.remove("shared-result--error");
            resultDiv.innerHTML = `
          <strong>${SUCCESS_MESSAGES.TOKENIZATION}</strong>
          <small>Nonce: ${payload.nonce}</small>
          <small>Type: ${payload.type}</small>
        `;

            submitButton.textContent = "Pay Now";
            submitButton.disabled = false;
          })
          .catch((error) => {
            resultDiv.classList.add(
              "shared-result--visible",
              "shared-result--error"
            );
            resultDiv.classList.remove("shared-result--success");
            resultDiv.innerHTML = `
          <strong>Error:</strong> ${error.message}
        `;

            submitButton.textContent = "Pay Now";
            submitButton.disabled = false;
          });
      });
    })
    .catch((error) => {
      const resultDiv = container.querySelector("#result") as HTMLElement;
      resultDiv.classList.add("shared-result--visible", "shared-result--error");
      resultDiv.innerHTML = `
      <strong>Initialization Error:</strong> ${error.message}
    `;
    });
};

const setupSeparateExpirationFields = (container) => {
  const authorization = getAuthorizationToken();

  window.braintree.client
    .create({
      authorization: authorization,
    })
    .then((clientInstance) => {
      return window.braintree.hostedFields.create({
        client: clientInstance,
        styles: {
          input: {
            "font-size": "14px",
            color: "#3a3a3a",
          },
          ":focus": {
            color: "black",
          },
          "input.invalid": {
            color: "red",
          },
          "input.valid": {
            color: "green",
          },
        },
        fields: {
          number: {
            selector: "#card-number",
            placeholder: "4111 1111 1111 1111",
          },
          cvv: {
            selector: "#cvv",
            placeholder: "123",
          },
          expirationMonth: {
            selector: "#expiration-month",
            placeholder: "06",
          },
          expirationYear: {
            selector: "#expiration-year",
            placeholder: "2025",
            select: true,
          },
        },
      });
    })
    .then((hostedFieldsInstance) => {
      const form = container.querySelector("#checkout-form") as HTMLElement;
      const submitButton = container.querySelector(
        "#submit-button"
      ) as HTMLButtonElement;
      const resultDiv = container.querySelector("#result") as HTMLElement;

      hostedFieldsInstance.on("validityChange", (event) => {
        const allFieldsValid = Object.keys(event.fields).every((key) => {
          return event.fields[key].isValid;
        });

        submitButton.disabled = !allFieldsValid;
        submitButton.style.backgroundColor = allFieldsValid
          ? "#28a745"
          : "#007bff";
      });

      form.addEventListener("submit", (event) => {
        event.preventDefault();

        submitButton.disabled = true;
        submitButton.textContent = "Processing...";

        hostedFieldsInstance
          .tokenize()
          .then((payload) => {
            resultDiv.style.display = "block";
            resultDiv.style.backgroundColor = "#d4edda";
            resultDiv.style.color = "#155724";
            resultDiv.style.border = "1px solid #c3e6cb";
            resultDiv.innerHTML = `
          <strong>${SUCCESS_MESSAGES.TOKENIZATION}</strong><br>
          <small>Nonce: ${payload.nonce}</small><br>
          <small>Type: ${payload.type}</small>
        `;

            submitButton.textContent = "Pay Now";
            submitButton.disabled = false;
          })
          .catch((error) => {
            resultDiv.style.display = "block";
            resultDiv.style.backgroundColor = "#f8d7da";
            resultDiv.style.color = "#721c24";
            resultDiv.style.border = "1px solid #f5c6cb";
            resultDiv.innerHTML = `
          <strong>Error:</strong> ${error.message}
        `;

            submitButton.textContent = "Pay Now";
            submitButton.disabled = false;
          });
      });
    });
};

export const StandardHostedFields: StoryObj = {
  render: createSimpleBraintreeStory(
    (container, args) => {
      const formContainer = createHostedFieldsForm(args);
      container.appendChild(formContainer);
      setupBraintreeHostedFields(formContainer, args);
    },
    ["client.min.js", "hosted-fields.min.js"]
  ),
  argTypes: {
    includePostalCode: {
      control: { type: "boolean" },
      description: "Include postal code field",
    },
    autoFillTestData: {
      control: { type: "boolean" },
      description: "Automatically fill fields with test data",
    },
    cardType: {
      control: { type: "select" },
      options: Object.keys(TEST_CARDS),
      description: "Pre-fill with test card data",
    },
  },
  args: {
    includePostalCode: true,
    autoFillTestData: false,
    cardType: "visa",
  },
};

export const SeparateExpirationFields: StoryObj = {
  render: createSimpleBraintreeStory(
    (container) => {
      const formContainer = document.createElement("div");
      formContainer.innerHTML = `
      <div class="shared-container hosted-fields-container">
        <h2 class="hosted-fields-heading">Hosted Fields (Separate Expiration)</h2>

        <form id="checkout-form" class="hosted-fields-form">
          <div class="form-field">
            <label for="card-number" class="shared-label">Card Number</label>
            <div id="card-number" class="hosted-field-container"></div>
          </div>

          <div class="form-field-group form-field-group--small-gap">
            <div class="form-field-flex">
              <label for="expiration-month" class="shared-label">Month</label>
              <div id="expiration-month" class="hosted-field-container"></div>
            </div>
            <div class="form-field-flex">
              <label for="expiration-year" class="shared-label">Year</label>
              <div id="expiration-year" class="hosted-field-container"></div>
            </div>
            <div class="form-field-flex">
              <label for="cvv" class="shared-label">CVV</label>
              <div id="cvv" class="hosted-field-container"></div>
            </div>
          </div>

          <button type="submit" id="submit-button" class="shared-button submit-button" disabled>Pay Now</button>
        </form>

        <div id="result" class="shared-result"></div>
      </div>
    `;
      container.appendChild(formContainer);
      setupSeparateExpirationFields(formContainer);
    },
    ["client.min.js", "hosted-fields.min.js"]
  ),
};

/**
 * CSP Testing Story
 *
 * Dynamically loads minified or non-minified iframe based on useMinified URL param.
 * Used by: .storybook/tests/hosted-fields-csp.test.ts
 *
 * Query Parameters:
 * - useMinified=true: Loads hosted-fields-frame.min.html (debug: false)
 * - useMinified=false: Loads hosted-fields-frame.html (debug: true)
 */
export const HostedFieldsCSPTest: StoryObj = {
  name: "CSP Testing",
  render: createSimpleBraintreeStory(
    (container, args) => {
      // Read useMinified from URL params to control which iframe HTML file loads
      const urlParams = new URLSearchParams(window.location.search);
      const useMinified = urlParams.get("useMinified") === "true";
      const debugMode = !useMinified; // debug=true loads .html, debug=false loads .min.html

      const formContainer = createHostedFieldsForm(args);
      container.appendChild(formContainer);
      setupBraintreeHostedFields(formContainer, args, debugMode);
    },
    ["client.js", "hosted-fields.js"]
  ),
  args: {
    includePostalCode: true,
  },
};
