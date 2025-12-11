class BaseIntegration {
  private authorization;
  private braintreeClient;
  protected client;

  constructor(options: { authorization: string }) {
    this.authorization = options.authorization;
  }

  async init() {
    await this.initializeBraintreeClient();
  }

  getBraintreeClient() {
    return this.braintreeClient;
  }

  getClient() {
    return this.client;
  }

  private async initializeBraintreeClient() {
    this.braintreeClient = await window.braintree.client.create({
      authorization: this.authorization,
    });
  }
}

class VenmoIntegration extends BaseIntegration {
  constructor(options: { authorization: string }) {
    super(options);
  }

  async init() {
    await super.init();
    await this.initializeVenmoClient();
  }

  render(buttonElement: HTMLButtonElement) {
    buttonElement.addEventListener("click", () => {
      // eslint-disable-next-line no-console
      console.log("Venmo button clicked");
      buttonElement.disabled = true;

      this.client.tokenize((tokenizeErr, payload) => {
        if (tokenizeErr) {
          // eslint-disable-next-line no-console
          console.error("Failed to tokenize Venmo payment", tokenizeErr);
        }
        // eslint-disable-next-line no-console
        console.log("payload", payload);
        buttonElement.removeAttribute("disabled");
      });
    });
  }

  async initializeVenmoClient(options = {}) {
    this.client = await window.braintree.venmo.create({
      client: this.getBraintreeClient(),
      ...options,
    });
  }
}

export default VenmoIntegration;
