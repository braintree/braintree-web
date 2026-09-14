import type { Meta, StoryObj } from "@storybook/html";
import { isIntegrationCoverageRun } from "../../utils/integration-coverage";
import { createSimpleBraintreeStory } from "../../utils/story-helper";
import { getAuthorizationToken } from "../../utils/sdk-config";
import { getBraintree } from "../../utils/braintree-globals";
import type {
  IHostedFieldsCreateOptions,
  IHostedFieldsEventData,
  IHostedFieldsInstance,
} from "../../types/global";
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

const createHostedFieldsForm = (args?: {
  includePostalCode?: boolean;
}): HTMLElement => {
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
  container: HTMLElement,
  args?: {
    autoFillTestData?: boolean;
    cardType?: string;
    includePostalCode?: boolean;
    binVerificationLength?: 6 | 8;
  },
  debugMode?: boolean
) => {
  const authorization = getAuthorizationToken();

  getBraintree()
    .client.create({
      authorization: authorization,
      ...(debugMode !== undefined && { debug: debugMode }),
    })
    // eslint-disable-next-line complexity
    .then((clientInstance) => {
      // Configure fields based on args
      const fields = {
        number: {
          container: "#card-number",
          placeholder: "4111 1111 1111 1111",
          prefill: args?.autoFillTestData
            ? TEST_CARDS[args.cardType as keyof typeof TEST_CARDS]?.number
            : "",
        },
        cvv: {
          container: "#cvv",
          placeholder: "123",
          prefill: args?.autoFillTestData
            ? TEST_CARDS[args.cardType as keyof typeof TEST_CARDS]?.cvv
            : "",
        },
        expirationDate: {
          container: "#expiration-date",
          placeholder: "MM/YY",
          prefill: args?.autoFillTestData
            ? TEST_CARDS[args.cardType as keyof typeof TEST_CARDS]
                ?.expirationDate
            : "",
        },
        // Only include postal code field if specified in args
        ...(args?.includePostalCode
          ? {
              postalCode: {
                container: "#postal-code",
                placeholder: "12345",
                prefill: args?.autoFillTestData
                  ? TEST_CARDS[args.cardType as keyof typeof TEST_CARDS]
                      ?.postalCode
                  : "",
              },
            }
          : {}),
      };

      const hostedFieldsConfig: IHostedFieldsCreateOptions = {
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
      };

      if (
        args?.binVerificationLength === 6 ||
        args?.binVerificationLength === 8
      ) {
        hostedFieldsConfig.binVerificationLength = args.binVerificationLength;
      }

      return getBraintree().hostedFields.create(hostedFieldsConfig);
    })
    .then((hostedFieldsInstance: IHostedFieldsInstance) => {
      const form = container.querySelector("#checkout-form") as HTMLElement;
      const emptyEventContainer = container.querySelector(
        "#emptyEvent"
      ) as HTMLElement;
      const notEmptyEventContainer = container.querySelector(
        "#notEmptyEvent"
      ) as HTMLElement;
      const focusEventContainer = container.querySelector(
        "#focus"
      ) as HTMLElement;
      const blurEventContainer = container.querySelector(
        "#blur"
      ) as HTMLElement;
      const binAvailableContainer = container.querySelector(
        "#binAvailable"
      ) as HTMLElement;
      const inputSubmitRequestContainer = container.querySelector(
        "#inputSubmitRequest"
      ) as HTMLElement;
      const submitButton = container.querySelector(
        "#submit-button"
      ) as HTMLButtonElement;
      const resultDiv = container.querySelector("#result") as HTMLElement;
      const teardownButton = container.querySelector(
        "#teardown-button"
      ) as HTMLButtonElement;
      const teardownStatus = container.querySelector(
        "#teardown-status"
      ) as HTMLElement;

      hostedFieldsInstance.on(
        "validityChange",
        (event: IHostedFieldsEventData) => {
          const allFieldsValid = (
            Object.keys(event.fields) as Array<keyof typeof event.fields>
          ).every((key) => event.fields[key]?.isValid ?? true);

          submitButton.disabled = !allFieldsValid;
          if (allFieldsValid) {
            submitButton.classList.add("submit-button--success");
          } else {
            submitButton.classList.remove("submit-button--success");
          }
        }
      );

      // Enable the teardown button now that the hosted fields are fully initialized
      teardownButton.disabled = false;

      hostedFieldsInstance.on(
        "cardTypeChange",
        (event: IHostedFieldsEventData) => {
          const cardTypeContainer = container.querySelector("#card-type")!;
          if (!event.fields.number?.isEmpty) {
            cardTypeContainer.innerHTML =
              "Detected Card Type: " + event.cards[0].niceType;
          } else {
            cardTypeContainer.innerHTML = "";
          }
        }
      );

      hostedFieldsInstance.on("empty", (event: IHostedFieldsEventData) => {
        emptyEventContainer.classList.add(event.emittedBy);
        notEmptyEventContainer.classList.remove(event.emittedBy);
      });

      hostedFieldsInstance.on("notEmpty", (event: IHostedFieldsEventData) => {
        notEmptyEventContainer.classList.add(event.emittedBy);
        emptyEventContainer.classList.remove(event.emittedBy);
      });

      hostedFieldsInstance.on("focus", (event: IHostedFieldsEventData) => {
        focusEventContainer.classList.add(event.emittedBy);
        blurEventContainer.classList.remove(event.emittedBy);
      });

      hostedFieldsInstance.on("blur", (event: IHostedFieldsEventData) => {
        blurEventContainer.classList.add(event.emittedBy);
        focusEventContainer.classList.remove(event.emittedBy);
      });

      hostedFieldsInstance.on(
        "inputSubmitRequest",
        (event: IHostedFieldsEventData) => {
          inputSubmitRequestContainer.classList.add(event.emittedBy);
        }
      );

      hostedFieldsInstance.on(
        "binAvailable",
        (event: IHostedFieldsEventData) => {
          binAvailableContainer.setAttribute("binAvailable", "true");
          binAvailableContainer.setAttribute("data-bin", event.bin ?? "");
          binAvailableContainer.textContent =
            "BIN Available: " +
            event.bin +
            " (" +
            event.bin?.length +
            " digits)";
        }
      );

      // Add clear field button functionality
      const clearFieldButton = container.querySelector(
        "#clear-field-button"
      ) as HTMLButtonElement;
      const fieldToClearSelect = container.querySelector(
        "#field-to-clear"
      ) as HTMLSelectElement;

      clearFieldButton.addEventListener("click", () => {
        const fieldToClear = fieldToClearSelect.value;
        hostedFieldsInstance.clear(fieldToClear);
      });

      // Add class button functionality
      const classActionFieldSelect = container.querySelector(
        "#class-action-field"
      ) as HTMLSelectElement;
      const classNameInput = container.querySelector(
        "#class-name-input"
      ) as HTMLInputElement;
      const addClassButton = container.querySelector(
        "#add-class-button"
      ) as HTMLButtonElement;
      const removeClassButton = container.querySelector(
        "#remove-class-button"
      ) as HTMLButtonElement;

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

      const attributeFieldSelect = container.querySelector(
        "#attribute-field"
      ) as HTMLSelectElement;
      const attributeNameInput = container.querySelector(
        "#attribute-name-input"
      ) as HTMLInputElement;
      const attributeValueInput = container.querySelector(
        "#attribute-value-input"
      ) as HTMLInputElement;
      const setAttributeButton = container.querySelector(
        "#set-attribute-button"
      ) as HTMLButtonElement;
      const removeAttributeButton = container.querySelector(
        "#remove-attribute-button"
      ) as HTMLElement;

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

      const focusFieldButton = container.querySelector(
        "#focus-field-button"
      ) as HTMLButtonElement;
      const focusFieldSelect = container.querySelector(
        "#focus-field"
      ) as HTMLSelectElement;

      focusFieldButton.addEventListener("click", () => {
        const fieldToFocus = focusFieldSelect.value;
        hostedFieldsInstance.focus(fieldToFocus);
      });

      const getStateButton = container.querySelector(
        "#get-state-button"
      ) as HTMLButtonElement;
      const stateContainer = container.querySelector(
        "#state-container"
      ) as HTMLElement;

      getStateButton.addEventListener("click", () => {
        const state = hostedFieldsInstance.getState();
        stateContainer.textContent = JSON.stringify(state, null, 2);
        stateContainer.setAttribute("data-state", JSON.stringify(state));
      });

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

const setupSeparateExpirationFields = (container: HTMLElement) => {
  const authorization = getAuthorizationToken();

  getBraintree()
    .client.create({
      authorization: authorization,
      ...(isIntegrationCoverageRun() && { debug: true }),
    })
    .then((clientInstance) => {
      return getBraintree().hostedFields.create({
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
            container: "#card-number",
            placeholder: "4111 1111 1111 1111",
          },
          cvv: {
            container: "#cvv",
            placeholder: "123",
          },
          expirationMonth: {
            container: "#expiration-month",
            placeholder: "06",
          },
          expirationYear: {
            container: "#expiration-year",
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

      hostedFieldsInstance.on(
        "validityChange",
        (event: IHostedFieldsEventData) => {
          const allFieldsValid = (
            Object.keys(event.fields) as Array<keyof typeof event.fields>
          ).every((key) => event.fields[key]?.isValid ?? true);

          submitButton.disabled = !allFieldsValid;
          submitButton.style.backgroundColor = allFieldsValid
            ? "#28a745"
            : "#007bff";
        }
      );

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
      setupBraintreeHostedFields(
        formContainer,
        args,
        isIntegrationCoverageRun() ? true : undefined
      );
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
    binVerificationLength: {
      control: { type: "number", min: 6, max: 8, step: 1 },
      description: "BIN verification length (6 or 8 digits)",
    },
  },
  args: {
    includePostalCode: true,
    autoFillTestData: false,
    cardType: "visa",
    binVerificationLength: 6,
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
      const debugMode = isIntegrationCoverageRun() ? true : !useMinified; // debug=true loads .html, debug=false loads .min.html

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
