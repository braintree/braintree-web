'use strict';

function errorResponseAdapter(responseBody) {
  var response;
  var errorType = responseBody.errors &&
    responseBody.errors[0] &&
    responseBody.errors[0].extensions &&
    responseBody.errors[0].extensions.errorType;

  if (errorType === 'user_error') {
    response = userErrorResponseAdapter(responseBody);
  } else if (errorType) {
    response = errorWithTypeResponseAdapter(responseBody);
  } else {
    response = {error: {message: 'There was a problem serving your request'}, fieldErrors: []};
  }

  return response;
}

function errorWithTypeResponseAdapter(responseBody) {
  return {error: {message: responseBody.errors[0].message}, fieldErrors: []};
}

function userErrorResponseAdapter(responseBody) {
  var error = responseBody.errors[0];
  var message = error.extensions.legacyMessage;
  var errorDetails = error.extensions.errorDetails;
  var fieldErrors = buildFieldErrors(errorDetails);

  return {error: {message: message}, fieldErrors: fieldErrors};
}

function buildFieldErrors(errorDetails) {
  var fieldErrors = [];

  errorDetails.forEach(function (detail) {
    addFieldError(detail.inputPath.slice(1), detail, fieldErrors);
  });

  return fieldErrors;
}

function addFieldError(inputPath, errorDetail, fieldErrors) {
  var fieldError;
  var legacyCode = errorDetail.legacyCode;
  var inputField = inputPath[0];

  if (inputPath.length === 1) {
    fieldErrors.push({
      code: legacyCode,
      field: inputField,
      message: errorDetail.message
    });

    return;
  }

  fieldErrors.forEach(function (candidate) {
    if (candidate.field === inputField) {
      fieldError = candidate;
    }
  });

  if (!fieldError) {
    fieldError = {field: inputField, fieldErrors: []};
    fieldErrors.push(fieldError);
  }

  addFieldError(inputPath.slice(1), errorDetail, fieldError.fieldErrors);
}

module.exports = errorResponseAdapter;
