import type { Meta, StoryObj } from "@storybook/html";
import { createSimpleBraintreeStory } from "../../utils/simple-sdk-loader";
import { getAuthorizationToken } from "../../utils/sdk-config";
import { TEST_CARDS } from "../../utils/test-data";

import "../../shared.css";
import "./hostedFields.css";

const meta: Meta = {
  title: "Braintree/Hosted Fields",
  parameters: {
    layout: "centered",
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

      <div id="result" class="shared-result"></div>
    </div>
  `;

  return container;
};

const setupBraintreeHostedFields = (
  container,
  args?: Record<string, string>
) => {
  const authorization = getAuthorizationToken();

  window.braintree.client
    .create({
      authorization: authorization,
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
          <strong>Payment tokenized successfully!</strong>
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
          <strong>Payment tokenized successfully!</strong><br>
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
