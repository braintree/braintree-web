import type { Meta, StoryObj } from "@storybook/html";
import { createSimpleBraintreeStory } from "../../utils/story-helper";
import { getAuthorizationToken } from "../../utils/sdk-config";
import { TEST_CARDS } from "../../utils/test-data";
import { SUCCESS_MESSAGES } from "../../constants";

import "../../css/main.css";
import "./hostedFields.css";

interface TokenizationPayload {
  nonce: string;
  type: string;
  details: {
    cardholderName?: string;
    [key: string]: unknown;
  };
}

interface TokenizationError {
  message: string;
  [key: string]: unknown;
}

const meta: Meta = {
  title: "Braintree/Hosted Fields/Cardholder Name",
  parameters: {
    layout: "centered",
    braintreeScripts: ["hosted-fields"],
    docs: {
      description: {
        component: `
Hosted Fields with cardholder name integration demonstrates how to collect cardholder name information
securely alongside other credit card fields. The cardholder name is included in the tokenization payload.
        `,
      },
    },
  },
};

export default meta;

const createCardholderNameForm = (
  args?: Record<string, string>
): HTMLElement => {
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
      <h2 class="hosted-fields-heading">Hosted Fields with Cardholder Name</h2>

      <form id="checkout-form" class="hosted-fields-form">
        <div class="form-field">
          <label for="cardholder-name" class="shared-label">Cardholder Name</label>
          <div id="cardholder-name" class="hosted-field-container"></div>
        </div>

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

const getTestCardValue = (
  args: Record<string, string> | undefined,
  property: string,
  defaultValue: string = ""
): string => {
  if (!args?.autoFillTestData) {
    return defaultValue;
  }

  const cardType = args.cardType as keyof typeof TEST_CARDS;
  const card = TEST_CARDS[cardType];
  return card?.[property as keyof typeof card] || defaultValue;
};

const createFieldConfig = (
  selector: string,
  placeholder: string,
  prefillValue: string = ""
) => {
  return {
    selector,
    placeholder,
    prefill: prefillValue,
  };
};

interface FieldConfig {
  selector: string;
  placeholder: string;
  prefill?: string;
}

const configureFields = (args?: Record<string, string>) => {
  const fields: Record<string, FieldConfig> = {
    cardholderName: createFieldConfig(
      "#cardholder-name",
      args?.autoFillTestData
        ? `${getTestCardValue(args, "type")} Test User`
        : "Name as shown on card"
    ),
    number: createFieldConfig(
      "#card-number",
      "4111 1111 1111 1111",
      getTestCardValue(args, "number")
    ),
    cvv: createFieldConfig("#cvv", "123", getTestCardValue(args, "cvv")),
    expirationDate: createFieldConfig(
      "#expiration-date",
      "MM/YY",
      getTestCardValue(args, "expirationDate")
    ),
  };

  if (args?.includePostalCode) {
    fields.postalCode = createFieldConfig(
      "#postal-code",
      "12345",
      getTestCardValue(args, "postalCode")
    );
  }

  return fields;
};

const handleTokenizationResponse = (
  submitButton: HTMLButtonElement,
  resultDiv: HTMLElement,
  payload: TokenizationPayload
) => {
  resultDiv.classList.add("shared-result--visible", "shared-result--success");
  resultDiv.classList.remove("shared-result--error");
  resultDiv.innerHTML = `
    <strong>${SUCCESS_MESSAGES.TOKENIZATION}</strong>
    <small>Nonce: ${payload.nonce}</small>
    <small>Type: ${payload.type}</small>
    <small>Cardholder Name: ${payload.details.cardholderName || "Not provided"}</small>
  `;

  submitButton.textContent = "Pay Now";
  submitButton.disabled = false;
};

const handleTokenizationError = (
  submitButton: HTMLButtonElement,
  resultDiv: HTMLElement,
  error: TokenizationError
) => {
  resultDiv.classList.add("shared-result--visible", "shared-result--error");
  resultDiv.classList.remove("shared-result--success");
  resultDiv.innerHTML = `
    <strong>Error:</strong> ${error.message}
  `;

  submitButton.textContent = "Pay Now";
  submitButton.disabled = false;
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
      const fields = configureFields(args);

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
        const fields = event.fields;

        const requiredFieldsValid = Object.keys(fields).every(
          (key) => fields[key].isValid
        );

        submitButton.disabled = !requiredFieldsValid;

        if (requiredFieldsValid) {
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
            handleTokenizationResponse(submitButton, resultDiv, payload);
          })
          .catch((error) => {
            handleTokenizationError(submitButton, resultDiv, error);
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

export const CardholderNameField: StoryObj = {
  render: createSimpleBraintreeStory(
    (container, args) => {
      const formContainer = createCardholderNameForm(args);
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
