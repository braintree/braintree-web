"use strict";

function errorResponseAdapter(responseBody) {
  var response;
  var errorClass =
    responseBody.errors &&
    responseBody.errors[0] &&
    responseBody.errors[0].extensions &&
    responseBody.errors[0].extensions.errorClass;

  if (errorClass === "VALIDATION") {
    response = userErrorResponseAdapter(responseBody);
  } else if (errorClass) {
    response = errorWithClassResponseAdapter(responseBody);
  } else {
    response = {
      error: { message: "There was a problem serving your request" },
      fieldErrors: [],
    };
  }

  return response;
}

function errorWithClassResponseAdapter(responseBody) {
  return {
    error: { message: responseBody.errors[0].message },
    fieldErrors: [],
  };
}

function userErrorResponseAdapter(responseBody) {
  var fieldErrors = buildFieldErrors(responseBody.errors);

  if (fieldErrors.length === 0) {
    return { error: { message: responseBody.errors[0].message } };
  }

  return {
    error: { message: getLegacyMessage(fieldErrors) },
    fieldErrors: fieldErrors,
  };
}

function buildFieldErrors(errors) {
  var fieldErrors = [];

  errors.forEach(function (error) {
    if (!(error.extensions && error.extensions.inputPath)) {
      return;
    }
    addFieldError(error.extensions.inputPath.slice(1), error, fieldErrors);
  });

  return fieldErrors;
}

function addFieldError(inputPath, errorDetail, fieldErrors) {
  var fieldError;
  var legacyCode = errorDetail.extensions.legacyCode;
  var inputField = inputPath[0];

  if (inputPath.length === 1) {
    fieldErrors.push({
      code: legacyCode,
      field: inputField,
      message: errorDetail.message,
    });

    return;
  }

  fieldErrors.forEach(function (candidate) {
    if (candidate.field === inputField) {
      fieldError = candidate;
    }
  });

  if (!fieldError) {
    fieldError = { field: inputField, fieldErrors: [] };
    fieldErrors.push(fieldError);
  }

  addFieldError(inputPath.slice(1), errorDetail, fieldError.fieldErrors);
}

function getLegacyMessage(errors) {
  var legacyMessages = {
    creditCard: "Credit card is invalid",
  };

  var field = errors[0].field;

  return legacyMessages[field];
}

module.exports = errorResponseAdapter;
