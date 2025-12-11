import type { Meta, StoryObj } from "@storybook/html";
import { createSimpleBraintreeStory } from "../../utils/story-helper";
import { getAuthorizationToken } from "../../utils/sdk-config";
import { SUCCESS_MESSAGES } from "../../constants";

import "../../css/main.css";
import "./hostedFields.css";

const meta: Meta = {
  title: "Braintree/Hosted Fields/Custom Styling",
  parameters: {
    layout: "centered",
    braintreeScripts: ["hosted-fields"],
    docs: {
      description: {
        component: `
Hosted Fields supports extensive styling customization. This story demonstrates different styling options.
`,
      },
    },
  },
};

export default meta;

const createCustomStyledForm = (args?: Record<string, string>): HTMLElement => {
  const container = document.createElement("div");

  container.innerHTML = `
    <div class="shared-container hosted-fields-container" ${args?.theme === "dark" ? 'data-theme="dark"' : ""}>
      <h2 class="hosted-fields-heading">Hosted Fields - ${args?.theme === "dark" ? "Dark Theme" : "Light Theme"}</h2>

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

        <div class="form-field">
          <label for="postal-code" class="shared-label">Postal Code</label>
          <div id="postal-code" class="hosted-field-container"></div>
        </div>

        <button type="submit" id="submit-button" class="shared-button submit-button" disabled>Pay Now</button>
      </form>

      <div id="result" class="shared-result"></div>

      <style>
        [data-theme="dark"] {
          background-color: #333;
          color: #fff;
          padding: 20px;
          border-radius: 8px;
        }

        [data-theme="dark"] .hosted-field-container {
          background-color: #555;
          border-color: #777;
        }

        [data-theme="dark"] .submit-button {
          background-color: #007bff;
          border-color: #007bff;
        }

        [data-theme="dark"] .submit-button--success {
          background-color: #28a745;
          border-color: #28a745;
        }
      </style>
    </div>
  `;

  return container;
};

const setupBraintreeHostedFields = (
  container,
  args?: Record<string, string>
) => {
  const authorization = getAuthorizationToken();
  const isDarkTheme = args?.theme === "dark";

  window.braintree.client
    .create({
      authorization: authorization,
    })
    .then((clientInstance) => {
      const fields = {
        number: {
          selector: "#card-number",
          placeholder: "4111 1111 1111 1111",
        },
        cvv: {
          selector: "#cvv",
          placeholder: "123",
        },
        expirationDate: {
          selector: "#expiration-date",
          placeholder: "MM/YY",
        },
        postalCode: {
          selector: "#postal-code",
          placeholder: "12345",
        },
      };

      return window.braintree.hostedFields.create({
        client: clientInstance,
        styles: {
          input: {
            "font-size": "16px",
            "font-family": isDarkTheme ? "monospace" : "inherit",
            color: isDarkTheme ? "#ffffff" : "#3a3a3a",
          },
          ".number": {
            "font-family": "monospace",
          },
          "input.invalid": {
            color: isDarkTheme ? "#ff6b6b" : "#dc3545",
          },
          "input.valid": {
            color: isDarkTheme ? "#82e362" : "#28a745",
          },
          ":focus": {
            color: isDarkTheme ? "#ffffff" : "#000000",
          },
          "::placeholder": {
            color: isDarkTheme ? "#aaaaaa" : "#6c757d",
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

export const LightTheme: StoryObj = {
  render: createSimpleBraintreeStory(
    (container, args) => {
      const formContainer = createCustomStyledForm({ ...args, theme: "light" });
      container.appendChild(formContainer);
      setupBraintreeHostedFields(formContainer, { ...args, theme: "light" });
    },
    ["client.min.js", "hosted-fields.min.js"]
  ),
};

export const DarkTheme: StoryObj = {
  render: createSimpleBraintreeStory(
    (container, args) => {
      const formContainer = createCustomStyledForm({ ...args, theme: "dark" });
      container.appendChild(formContainer);
      setupBraintreeHostedFields(formContainer, { ...args, theme: "dark" });
    },
    ["client.min.js", "hosted-fields.min.js"]
  ),
};
