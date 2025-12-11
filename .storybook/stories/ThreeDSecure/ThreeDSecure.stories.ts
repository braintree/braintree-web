import type { Meta, StoryObj } from "@storybook/html";
import { createSimpleBraintreeStory } from "../../utils/story-helper";
import "./threeDSecure.css";

const meta: Meta = {
  title: "Braintree/3D Secure",
  parameters: {
    layout: "centered",
    braintreeScripts: ["hosted-fields", "three-d-secure"],
    docs: {
      description: {
        component: `
3D Secure (3DS) adds an extra authentication layer for online transactions, linking issuer, acquirer, and interoperability domains.
It helps prevent fraud and meets Strong Customer Authentication (SCA) requirements.
        `,
      },
    },
  },
};

export default meta;

const createThreeDSecureForm = (): HTMLElement => {
  const container = document.createElement("div");
  container.innerHTML = `
    <div class="shared-container three-d-secure-container">
      <h2>3D Secure with Hosted Fields</h2>

      <div class="three-d-secure-intro">
        <p class="shared-description">
          3D Secure provides an additional layer of security for online card transactions. Fill out the form below to test the authentication flow.
        </p>
      </div>

      <div class="credentials-section">
        <h3>Merchant Credentials</h3>
        <div class="form-grid">
          <div>
            <label class="shared-label">Public Key</label>
            <input type="text" id="public-key" class="shared-input" placeholder="Enter your public key" />
            <div id="help-public-key" class="help-text"></div>
          </div>
          <div>
            <label class="shared-label">Private Key</label>
            <input type="password" id="private-key" class="shared-input" placeholder="Enter your private key" />
            <div id="help-private-key" class="help-text"></div>
          </div>
        </div>
        <button id="initialize-3ds" type="button" class="autofill-button">Initialize 3D Secure</button>
      </div>

      <div id="three-ds-content" class="three-ds-content" style="display: none;">
        <div class="three-d-secure-intro">
          <button id="autofill" type="button" class="autofill-button">Auto-fill form</button>
        </div>

      <div class="form-grid">
        <div>
          <label class="shared-label">Card Number</label>
          <div id="card-number" class="hosted-field"></div>
        </div>
        <div>
          <label class="shared-label">CVV</label>
          <div id="cvv" class="hosted-field"></div>
        </div>
        <div class="form-grid-full-width">
          <label class="shared-label">Expiration Date</label>
          <div id="expiration-date" class="hosted-field"></div>
        </div>
      </div>

      <div class="form-grid">
        <div>
          <label class="shared-label">Email</label>
          <input type="email" id="email" class="shared-input" />
          <div id="help-email" class="help-text"></div>
        </div>
        <div>
          <label class="shared-label">Phone</label>
          <input type="tel" id="billing-phone" class="shared-input" />
          <div id="help-billing-phone" class="help-text"></div>
        </div>
        <div>
          <label class="shared-label">First Name</label>
          <input type="text" id="billing-given-name" class="shared-input" />
          <div id="help-billing-given-name" class="help-text"></div>
        </div>
        <div>
          <label class="shared-label">Last Name</label>
          <input type="text" id="billing-surname" class="shared-input" />
          <div id="help-billing-surname" class="help-text"></div>
        </div>
        <div>
          <label class="shared-label">Street Address</label>
          <input type="text" id="billing-street-address" class="shared-input" />
          <div id="help-billing-street-address" class="help-text"></div>
        </div>
        <div>
          <label class="shared-label">Extended Address (Optional)</label>
          <input type="text" id="billing-extended-address" class="shared-input" />
          <div id="help-billing-extended-address" class="help-text"></div>
        </div>
        <div>
          <label class="shared-label">City</label>
          <input type="text" id="billing-locality" class="shared-input" />
          <div id="help-billing-locality" class="help-text"></div>
        </div>
        <div>
          <label class="shared-label">State/Region</label>
          <input type="text" id="billing-region" class="shared-input" />
          <div id="help-billing-region" class="help-text"></div>
        </div>
        <div>
          <label class="shared-label">Postal Code</label>
          <input type="text" id="billing-postal-code" class="shared-input" />
          <div id="help-billing-postal-code" class="help-text"></div>
        </div>
        <div>
          <label class="shared-label">Country Code</label>
          <select id="billing-country-code" class="shared-select">
            <option value="">Select Country</option>
            <option value="US">United States</option>
            <option value="CA">Canada</option>
            <option value="GB">United Kingdom</option>
            <option value="DE">Germany</option>
            <option value="FR">France</option>
          </select>
          <div id="help-billing-country-code" class="help-text"></div>
        </div>
      </div>

      <button type="button" id="pay-button" class="shared-button pay-button" disabled>Processing...</button>

      <div id="result" class="shared-result-display"></div>

      <!-- Modal for 3DS authentication -->
      <div id="three-ds-modal" class="three-ds-modal">
        <div class="three-ds-modal-content">
          <h3>3D Secure Authentication</h3>
          <div id="three-ds-container"></div>
          <button id="cancel-3ds" class="cancel-button">Cancel</button>
        </div>
      </div>
    </div>
  `;

  return container;
};

const initialize3DSecure = (container: HTMLElement): void => {
  const publicKeyInput = container.querySelector(
    "#public-key"
  ) as HTMLInputElement;
  const privateKeyInput = container.querySelector(
    "#private-key"
  ) as HTMLInputElement;
  const initializeButton = container.querySelector(
    "#initialize-3ds"
  ) as HTMLButtonElement;
  const threeDSContent = container.querySelector(
    "#three-ds-content"
  ) as HTMLElement;
  const payButton = container.querySelector("#pay-button") as HTMLButtonElement;
  const resultDiv = container.querySelector("#result") as HTMLElement;
  const threeDSModal = container.querySelector(
    "#three-ds-modal"
  ) as HTMLElement;
  const threeDSContainer = container.querySelector(
    "#three-ds-container"
  ) as HTMLElement;
  const cancelButton = container.querySelector("#cancel-3ds") as HTMLElement;
  const autofillButton = container.querySelector("#autofill") as HTMLElement;

  let hostedFieldsInstance;
  let threeDSecureInstance;
  let authorization;

  const validateCredentials = (): boolean => {
    let isValid = true;
    const publicKey = publicKeyInput.value.trim();
    const privateKey = privateKeyInput.value.trim();

    const publicKeyHelp = container.querySelector(
      "#help-public-key"
    ) as HTMLElement;
    const privateKeyHelp = container.querySelector(
      "#help-private-key"
    ) as HTMLElement;

    if (!publicKey) {
      isValid = false;
      publicKeyHelp.textContent = "Public key is required.";
      publicKeyInput.parentElement?.classList.add("has-error");
    } else {
      publicKeyHelp.textContent = "";
      publicKeyInput.parentElement?.classList.remove("has-error");
    }

    if (!privateKey) {
      isValid = false;
      privateKeyHelp.textContent = "Private key is required.";
      privateKeyInput.parentElement?.classList.add("has-error");
    } else {
      privateKeyHelp.textContent = "";
      privateKeyInput.parentElement?.classList.remove("has-error");
    }

    return isValid;
  };

  const getClientToken = async (): Promise<string> => {
    const publicKey = publicKeyInput.value.trim();
    const privateKey = privateKeyInput.value.trim();

    const gqlAuthorization = window.btoa(`${publicKey}:${privateKey}`);
    const responseBody = `{"query": "mutation CreateClientToken($input: CreateClientTokenInput!) { createClientToken(input: $input) { clientToken } }","variables": {"input": {"clientToken": {}}}}`;

    const response = await fetch(
      "https://payments.sandbox.braintree-api.com/graphql",
      {
        method: "POST",
        headers: {
          Authorization: gqlAuthorization,
          "Braintree-version": "2023-07-03",
          "Content-Type": "application/json",
        },
        body: responseBody,
      }
    );

    const clientTokenResponse = await response.json();
    return clientTokenResponse?.data.createClientToken.clientToken;
  };

  // Billing field elements
  const billingFields = {
    email: container.querySelector("#email") as HTMLInputElement,
    "billing-phone": container.querySelector(
      "#billing-phone"
    ) as HTMLInputElement,
    "billing-given-name": container.querySelector(
      "#billing-given-name"
    ) as HTMLInputElement,
    "billing-surname": container.querySelector(
      "#billing-surname"
    ) as HTMLInputElement,
    "billing-street-address": container.querySelector(
      "#billing-street-address"
    ) as HTMLInputElement,
    "billing-extended-address": container.querySelector(
      "#billing-extended-address"
    ) as HTMLInputElement,
    "billing-locality": container.querySelector(
      "#billing-locality"
    ) as HTMLInputElement,
    "billing-region": container.querySelector(
      "#billing-region"
    ) as HTMLInputElement,
    "billing-postal-code": container.querySelector(
      "#billing-postal-code"
    ) as HTMLInputElement,
    "billing-country-code": container.querySelector(
      "#billing-country-code"
    ) as HTMLSelectElement,
  };

  // Auto-fill functionality
  autofillButton.addEventListener("click", () => {
    billingFields.email.value = "test@example.com";
    billingFields["billing-phone"].value = "123-456-7890";
    billingFields["billing-given-name"].value = "Jane";
    billingFields["billing-surname"].value = "Doe";
    billingFields["billing-street-address"].value = "123 XYZ Street";
    billingFields["billing-locality"].value = "Anytown";
    billingFields["billing-region"].value = "CA";
    billingFields["billing-postal-code"].value = "12345";
    billingFields["billing-country-code"].value = "US";

    // Clear any existing error messages
    Object.keys(billingFields).forEach((fieldName) => {
      const helpElement = container.querySelector(`#help-${fieldName}`);
      if (helpElement && helpElement.parentElement) {
        helpElement.textContent = "";
        helpElement.parentElement.classList.remove("has-error");
      }
    });
  });

  // Validation
  const validateBillingFields = () => {
    let isValid = true;

    Object.keys(billingFields).forEach((fieldName) => {
      const field = billingFields[fieldName];
      const helpElement = container.querySelector(`#help-${fieldName}`);

      if (fieldName === "billing-extended-address") return; // Optional field

      if (!field.value.trim()) {
        isValid = false;
        if (helpElement && helpElement.parentElement) {
          helpElement.textContent = "Field cannot be blank.";
          helpElement.parentElement.classList.add("has-error");
        }
      } else if (helpElement && helpElement.parentElement) {
        helpElement.textContent = "";
        helpElement.parentElement.classList.remove("has-error");
      }
    });

    return isValid;
  };

  // Modal controls
  const showModal = () => {
    threeDSModal.style.display = "block";
  };

  const hideModal = () => {
    threeDSModal.style.display = "none";
    threeDSContainer.innerHTML = "";
  };

  cancelButton.addEventListener("click", () => {
    if (threeDSecureInstance) {
      threeDSecureInstance.cancelVerifyCard(() => {
        hideModal();
        payButton.disabled = false;
        payButton.textContent = "Pay $100.00";
      });
    }
  });

  const setupBraintree = () => {
    window.braintree.client
      .create({
        authorization: authorization,
      })
      .then((clientInstance) => {
        return Promise.all([
          window.braintree.hostedFields.create({
            client: clientInstance,
            styles: {
              input: {
                "font-size": "14px",
                "font-family": "monospace",
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
              expirationDate: {
                selector: "#expiration-date",
                placeholder: "12/34",
              },
            },
          }),
          window.braintree.threeDSecure.create({
            authorization: authorization,
            version: "2-inline-iframe",
          }),
        ]);
      })
      .then(([hostedFields, threeDSecure]) => {
        hostedFieldsInstance = hostedFields;
        threeDSecureInstance = threeDSecure;

        // Set up 3D Secure event handlers
        threeDSecureInstance.on("lookup-complete", (payload, next) => {
          next();
        });

        threeDSecureInstance.on(
          "authentication-iframe-available",
          (payload, next) => {
            threeDSContainer.appendChild(payload.element);
            showModal();
            next();
          }
        );

        payButton.disabled = false;
        payButton.textContent = "Pay $100.00";
        threeDSContent.style.display = "block";
      })
      .catch((error) => {
        resultDiv.style.display = "block";
        resultDiv.className =
          "shared-result-display shared-result--error shared-result--visible";
        resultDiv.innerHTML = `<strong>Initialization Error:</strong> ${error.message}`;
      });
  };

  // Initialize button event listener
  initializeButton.addEventListener("click", async () => {
    if (!validateCredentials()) {
      return;
    }

    initializeButton.disabled = true;
    initializeButton.textContent = "Initializing...";

    try {
      const clientToken = await getClientToken();
      authorization = clientToken;
      setupBraintree();
    } catch (error) {
      resultDiv.style.display = "block";
      resultDiv.className =
        "shared-result-display shared-result--error shared-result--visible";
      resultDiv.innerHTML = `<strong>Error:</strong> ${error.message}`;
      initializeButton.disabled = false;
      initializeButton.textContent = "Initialize 3D Secure";
    }
  });

  // Payment flow
  payButton.addEventListener("click", () => {
    payButton.disabled = true;
    payButton.textContent = "Processing...";

    const billingIsValid = validateBillingFields();

    if (!billingIsValid) {
      payButton.disabled = false;
      payButton.textContent = "Pay $100.00";
      return;
    }

    hostedFieldsInstance
      .tokenize()
      .then((payload) => {
        return threeDSecureInstance.verifyCard({
          amount: "100.00",
          nonce: payload.nonce,
          bin: payload.details.bin,
          email: billingFields.email.value,
          billingAddress: {
            givenName: billingFields["billing-given-name"].value,
            surname: billingFields["billing-surname"].value,
            phoneNumber: billingFields["billing-phone"].value.replace(
              /[()\s-]/g,
              ""
            ),
            streetAddress: billingFields["billing-street-address"].value,
            extendedAddress: billingFields["billing-extended-address"].value,
            locality: billingFields["billing-locality"].value,
            region: billingFields["billing-region"].value,
            postalCode: billingFields["billing-postal-code"].value,
            countryCodeAlpha2: billingFields["billing-country-code"].value,
          },
        });
      })
      .then((payload) => {
        hideModal();

        resultDiv.style.display = "block";
        if (payload.liabilityShifted) {
          resultDiv.className =
            "shared-result-display shared-result--success shared-result--visible";
          resultDiv.innerHTML = `
            <strong>3D Secure verification successful!</strong><br>
            <small>Nonce: ${payload.nonce}</small><br>
            <small>Liability shifted: Yes</small><br>
            <small>3D Secure authentication completed</small>
          `;
        } else {
          resultDiv.className =
            "shared-result-display result-warning shared-result--visible";
          resultDiv.innerHTML = `
            <strong>3D Secure verification completed</strong><br>
            <small>Nonce: ${payload.nonce}</small><br>
            <small>Liability shifted: No</small><br>
            <small>Transaction can proceed but without liability shift</small>
          `;
        }

        payButton.disabled = false;
        payButton.textContent = "Pay $100.00";
      })
      .catch((error) => {
        hideModal();

        resultDiv.style.display = "block";
        resultDiv.className =
          "shared-result-display shared-result--error shared-result--visible";
        resultDiv.innerHTML = `<strong>Error:</strong> ${error.message}`;

        payButton.disabled = false;
        payButton.textContent = "Pay $100.00";
      });
  });
};

export const ThreeDSecure: StoryObj = {
  render: createSimpleBraintreeStory(
    (container) => {
      const formContainer = createThreeDSecureForm();
      container.appendChild(formContainer);
      initialize3DSecure(formContainer);
    },
    ["client.min.js", "hosted-fields.min.js", "three-d-secure.min.js"]
  ),
};
