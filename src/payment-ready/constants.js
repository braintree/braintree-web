"use strict";

module.exports = {
  CREATE_PAYMENT_READY_SESSION_QUERY:
    "mutation CreateCustomerSession($input: CreateCustomerSessionInput!) {\n  createCustomerSession(input: $input) {\n    sessionId\n clientMutationId\n }\n}",

  /**
   * @typedef PaymentReady~BUTTON_ORDER
   * @property {string} FIRST "first"
   * @property {string} SECOND "second"
   * @property {string} THIRD "third"
   * @property {string} FOURTH "fourth"
   * @property {string} FIFTH "fifth"
   * @property {string} SIXTH "sixth"
   * @property {string} SEVENTH "seventh"
   * @property {string} EIGHT "eight"
   * @property {string} OTHER "other"
   */
  BUTTON_ORDER: {
    FIRST: "first",
    SECOND: "second",
    THIRD: "third",
    FOURTH: "fourth",
    FIFTH: "fifth",
    SIXTH: "sixth",
    SEVENTH: "seventh",
    EIGHT: "eight",
    OTHER: "other",
  },

  /**
   * @typedef PaymentReady~BUTTON_TYPE
   * @property {string} PAYPAL "paypal"
   * @property {string} VENMO "venmo"
   * @property {string} OTHER "other"
   */
  BUTTON_TYPE: {
    PAYPAL: "paypal",
    VENMO: "venmo",
    OTHER: "other",
  },

  EVENT_BUTTON_PRESENTED: "payment-ready.button_presented",
  EVENT_BUTTON_SELECTED: "payment-ready.button_selected",

  /**
   * @typedef PaymentReady~EXPERIMENT_TYPE
   * @property {string} CONTROL "control"
   * @property {string} TEST "test"
   */
  EXPERIMENT_TYPE: {
    CONTROL: "control",
    TEST: "test",
  },

  /**
   * @typedef PaymentReady~PAGE_TYPE
   * @property {string} ABOUT "about"
   * @property {string} CART "cart"
   * @property {string} CHECKOUT "checkout"
   * @property {string} HOMEPAGE "homepage"
   * @property {string} MINICART "minicart"
   * @property {string} ORDER_CONFIRMATION "order_confirmation"
   * @property {string} ORDER_REVIEW "order_review"
   * @property {string} PRODUCT_CATEGORY "product_category"
   * @property {string} PRODUCT_DETAILS "product_details"
   * @property {string} SEARCH "search"
   * @property {string} OTHER "other"
   */
  PAGE_TYPE: {
    HOMEPAGE: "homepage",
    ABOUT: "about",
    PRODUCT_CATEGORY: "product_category",
    PRODUCT_DETAILS: "product_details",
    SEARCH: "search",
    CART: "cart",
    CHECKOUT: "checkout",
    ORDER_REVIEW: "order_review",
    ORDER_CONFIRMATION: "order_confirmation",
    MINICART: "minicart",
    OTHER: "other",
  },

  UPDATE_PAYMENT_READY_SESSION_QUERY:
    "mutation UpdateCustomerSession($input: UpdateCustomerSessionInput!) {\n  updateCustomerSession(input: $input) {\n    sessionId\n clientMutationId\n }\n}",

  GENERATE_CUSTOMER_RECOMMENDATIONS_QUERY:
    "mutation GenerateCustomerRecommendations($input: GenerateCustomerRecommendationsInput!) {\n  generateCustomerRecommendations(input: $input) {\n     clientMutationId\n      sessionId\n      paymentRecommendations {\n        paymentOption\n        recommendedPriority\n      }\n      isInPayPalNetwork\n  }\n}",

  REQUIRED_OPTIONS_CREATE_SESSION: ["customer"],
  REQUIRED_OPTIONS_UPDATE_SESSION: ["sessionId", "customer"],
  REQUIRED_OPTIONS_GET_RECOMMENDATIONS: ["sessionId"],
};
