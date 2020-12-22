"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VENMO_DESKTOP_PAYMENT_RESOURCE_STATUS_QUERY = exports.UPDATE_VENMO_DESKTOP_PAYMENT_RESOURCE_QUERY = exports.CREATE_VENMO_DESKTOP_PAYMENT_RESOURCE_QUERY = void 0;
exports.CREATE_VENMO_DESKTOP_PAYMENT_RESOURCE_QUERY = "mutation CreateVenmoQRCodePaymentContext($input: CreateVenmoQRCodePaymentContextInput!) {\n  createVenmoQRCodePaymentContext(input: $input) {\n    clientMutationId\n    venmoQRCodePaymentContext {\n      id\n      merchantId\n      createdAt\n      expiresAt\n    }\n  }\n}";
exports.UPDATE_VENMO_DESKTOP_PAYMENT_RESOURCE_QUERY = "mutation UpdateVenmoQRCodePaymentContext($input: UpdateVenmoQRCodePaymentContextInput!) {\n  updateVenmoQRCodePaymentContext(input: $input) {\n    clientMutationId\n  }\n}";
exports.VENMO_DESKTOP_PAYMENT_RESOURCE_STATUS_QUERY = "query PaymentContext($id: ID!) {\n  node(id: $id) {\n    ... on VenmoQRCodePaymentContext {\n      status\n      paymentMethodId\n      userName\n    }\n  }\n}";
