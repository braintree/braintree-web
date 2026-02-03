"use strict";

var VERSION = process.env.npm_package_version;

var PAYPAL_V6_SDK_BASE_URL = "https://www.{ENV}paypal.com/web-sdk/v6/core";

var PAYPAL_V6_ENVIRONMENT = {
  stage: "https://www.msmaster.qa.paypal.com/web-sdk/v6/core",
  teBraintree: "https://www.braintree.stage.paypal.com/web-sdk/v6/core",
};

// Analytics event constants
var ANALYTICS_PREFIX = "paypal-checkout-v6";
var ANALYTICS_EVENTS = {
  INITIALIZED: ANALYTICS_PREFIX + ".initialized",
  TEARDOWN: ANALYTICS_PREFIX + ".teardown",

  // SDK Loading
  SDK_ALREADY_LOADED: ANALYTICS_PREFIX + ".sdk-already-loaded",
  SDK_LOAD_STARTED: ANALYTICS_PREFIX + ".load-sdk.started",
  SDK_LOAD_SUCCEEDED: ANALYTICS_PREFIX + ".sdk-load.succeeded",
  SDK_LOAD_FAILED: ANALYTICS_PREFIX + ".sdk-load.failed",

  // Instance Creation
  CREATE_INSTANCE_STARTED: ANALYTICS_PREFIX + ".create-instance.started",
  CREATE_INSTANCE_SUCCEEDED: ANALYTICS_PREFIX + ".create-instance.succeeded",
  CREATE_INSTANCE_FAILED: ANALYTICS_PREFIX + ".create-instance.failed",

  // Session Creation
  SESSION_CHECKOUT_CREATED: ANALYTICS_PREFIX + ".session.checkout.created",
  SESSION_VAULT_CREATED: ANALYTICS_PREFIX + ".session.vault.created",

  // Payment Flow
  PAYMENT_STARTED: ANALYTICS_PREFIX + ".payment.started",
  PAYMENT_APPROVED: ANALYTICS_PREFIX + ".payment.approved",
  PAYMENT_CANCELED: ANALYTICS_PREFIX + ".payment.canceled",

  // Order Creation
  CREATE_ORDER_STARTED: ANALYTICS_PREFIX + ".create-order.started",
  CREATE_ORDER_SUCCEEDED: ANALYTICS_PREFIX + ".create-order.succeeded",
  CREATE_ORDER_FAILED: ANALYTICS_PREFIX + ".create-order.failed",

  // Billing Agreement Token
  CREATE_BA_TOKEN_STARTED:
    ANALYTICS_PREFIX + ".create-billing-agreement-token.started",
  CREATE_BA_TOKEN_SUCCEEDED:
    ANALYTICS_PREFIX + ".create-billing-agreement-token.succeeded",
  CREATE_BA_TOKEN_FAILED:
    ANALYTICS_PREFIX + ".create-billing-agreement-token.failed",

  // Billing Agreement Session
  CREATE_BA_SESSION_STARTED:
    ANALYTICS_PREFIX + ".create-billing-agreement-session.started",
  CREATE_BA_SESSION_INSTANCE_CREATED:
    ANALYTICS_PREFIX + ".create-billing-agreement-session.instance-created",
  CREATE_BA_SESSION_SDK_NOT_LOADED:
    ANALYTICS_PREFIX + ".create-billing-agreement-session.sdk-not-loaded",
  CREATE_BA_SESSION_SESSION_CREATED:
    ANALYTICS_PREFIX + ".create-billing-agreement-session.session-created",
  CREATE_BA_SESSION_APPROVED:
    ANALYTICS_PREFIX + ".create-billing-agreement-session.approved",
  CREATE_BA_SESSION_CANCELED:
    ANALYTICS_PREFIX + ".create-billing-agreement-session.canceled",
  CREATE_BA_SESSION_FAILED:
    ANALYTICS_PREFIX + ".create-billing-agreement-session.failed",

  // Tokenization
  TOKENIZE_PAYMENT_PREFIX: ANALYTICS_PREFIX + ".tokenize-payment",
  TOKENIZE_BA_PREFIX: ANALYTICS_PREFIX + ".tokenize-billing-agreement",

  // Credit
  CREDIT_OFFERED: ANALYTICS_PREFIX + ".credit.offered",
  CREDIT_ACCEPTED: ANALYTICS_PREFIX + ".credit.accepted",
};

module.exports = {
  VERSION: VERSION,
  PAYPAL_V6_SDK_BASE_URL: PAYPAL_V6_SDK_BASE_URL,
  PAYPAL_V6_ENVIRONMENT: PAYPAL_V6_ENVIRONMENT,
  ANALYTICS_PREFIX: ANALYTICS_PREFIX,
  ANALYTICS_EVENTS: ANALYTICS_EVENTS,
};
