import COMPONENTS from "../../components.json";
var files = COMPONENTS.reduce(function (components, name) {
  components.push(name);
  components.push(name + ".min");

  return components;
}, []);

// Components whose hosted dist/ output is built by Vite+
var VITE_PLUS_COMPONENTS = [
  "american-express",
  "apple-pay",
  "client",
  "data-collector",
  "fastlane",
  "frame-service",
  "google-payment",
  "hosted-fields",
  "instant-verification",
  "local-payment",
  "payment-ready",
  "paypal-checkout",
  "paypal-checkout-v6",
  "sepa",
  "three-d-secure",
  "us-bank-account",
  "vault-manager",
  "venmo",
];

export {
  COMPONENTS as components,
  files,
  VITE_PLUS_COMPONENTS as vitePlusComponents,
};

export default {
  components: COMPONENTS,
  files,
  vitePlusComponents: VITE_PLUS_COMPONENTS,
};
