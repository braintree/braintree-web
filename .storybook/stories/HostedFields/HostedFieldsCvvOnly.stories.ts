import type { Meta, StoryObj } from "@storybook/html";
import { createSimpleBraintreeStory } from "../../utils/story-helper";
import { getAuthorizationToken } from "../../utils/sdk-config";
import { TEST_CARDS } from "../../utils/test-data";
import { SUCCESS_MESSAGES } from "../../constants";

import "../../css/main.css";
import "./hostedFields.css";

const meta: Meta = {
  title: "Braintree/Hosted Fields/CVV Only",
  parameters: {
    layout: "centered",
    braintreeScripts: ["hosted-fields"],
    docs: {
      description: {
        component: `
CVV-only Hosted Fields implementation is used to verify a card that is already stored
in the Braintree vault. Only the CVV field is displayed and tokenized. This is commonly
used in scenarios where you want to verify the possession of a card without collecting
the full card details again.
        `,
      },
    },
  },
};

export default meta;

const createCvvOnlyForm = (): HTMLElement => {
  const container = document.createElement("div");

  container.innerHTML = `
    <div class="shared-container hosted-fields-container">
      <h2 class="hosted-fields-heading">CVV-Only Verification</h2>
      <p class="hosted-fields-description">
        Verify a stored card by entering the CVV code. In a real application, you would
        select the stored card first, then verify with the CVV.
      </p>

      <form id="checkout-form" class="hosted-fields-form">
        <div class="form-field">
          <label for="cvv" class="shared-label">CVV</label>
          <div id="cvv" class="hosted-field-container"></div>
        </div>

        <button type="submit" id="submit-button" class="shared-button submit-button" disabled>Verify Card</button>
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
      const fields = {
        cvv: {
          selector: "#cvv",
          placeholder: args?.cardType === "amex" ? "1234" : "123",
          minLength: args?.cardType === "amex" ? 4 : 3,
          prefill: args?.autoFillTestData
            ? TEST_CARDS[args.cardType as keyof typeof TEST_CARDS]?.cvv
            : "",
        },
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
        let allFieldsValid = Object.keys(event.fields).every((key) => {
          return event.fields[key].isValid;
        });
        // Handle special case for Amex cards - validate 4 digits
        if (args?.cardType === "amex") {
          const cvvField = event.fields.cvv;
          if (cvvField.isValid) {
            allFieldsValid = true;
          }
        }

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
          <strong>${SUCCESS_MESSAGES.VERIFICATION}</strong>
          <small>Nonce: ${payload.nonce}</small>
          <small>Type: ${payload.type}</small>
          <small>This would be sent to your server to verify the card.</small>
        `;

            submitButton.textContent = "Verify Card";
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

            submitButton.textContent = "Verify Card";
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

export const CvvOnlyVerification: StoryObj = {
  render: createSimpleBraintreeStory(
    (container, args) => {
      const formContainer = createCvvOnlyForm(args);
      container.appendChild(formContainer);
      setupBraintreeHostedFields(formContainer, args);
    },
    ["client.min.js", "hosted-fields.min.js"]
  ),
  argTypes: {
    autoFillTestData: {
      control: { type: "boolean" },
      description: "Automatically fill fields with test data",
    },
    cardType: {
      control: { type: "select" },
      options: Object.keys(TEST_CARDS),
      description: "Set card type for proper CVV format (3 or 4 digits)",
    },
  },
  args: {
    autoFillTestData: false,
    cardType: "visa",
  },
};
