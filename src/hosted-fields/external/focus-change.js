'use strict';

var directions = require('../shared/constants').navigationDirections;
var browserDetection = require('../shared/browser-detection');
var focusIntercept = require('../shared/focus-intercept');
var findParentTags = require('../shared/find-parent-tags');
var userFocusableTagNames = [
  'INPUT', 'SELECT', 'TEXTAREA'
];
// Devices with software keyboards do not or cannot focus on input types
// that do not require keyboard-based interaction.
var unfocusedInputTypes = [
  'hidden', 'button', 'reset', 'submit', 'checkbox', 'radio', 'file'
];

function _isUserFocusableElement(element) {
  if (!browserDetection.hasSoftwareKeyboard()) {
    // on desktop browsers, the only input type that isn't focusable
    // is the hidden input
    return element.type !== 'hidden';
  }

  return userFocusableTagNames.indexOf(element.tagName) > -1 &&
    unfocusedInputTypes.indexOf(element.type) < 0;
}

function _createNavigationHelper(direction, numberOfElementsInForm) {
  switch (direction) {
    case directions.BACK:
      return {
        checkIndexBounds: function (index) {
          return index < 0;
        },
        indexChange: -1
      };
    case directions.FORWARD:
      return {
        checkIndexBounds: function (index) {
          return index > numberOfElementsInForm - 1;
        },
        indexChange: 1
      };
    default:
  }

  return {};
}

function _findFirstFocusableElement(elementsInForm) {
  var elementsIndex, element;

  for (elementsIndex = 0; elementsIndex < elementsInForm.length; elementsIndex++) {
    element = elementsInForm[elementsIndex];

    if (_isUserFocusableElement(element)) {
      return element;
    }
  }

  return null;
}

module.exports = {
  removeExtraFocusElements: function (checkoutForm, onRemoveFocusIntercepts) {
    var elements = Array.prototype.slice.call(checkoutForm.elements);
    var firstFocusableInput = _findFirstFocusableElement(elements);
    var lastFocusableInput = _findFirstFocusableElement(elements.reverse());

    // these should never be identical, because there will at least be the
    // before and the after input
    [
      firstFocusableInput,
      lastFocusableInput
    ].forEach(function (input) {
      if (!input) {
        return;
      }

      if (focusIntercept.matchFocusElement(input.getAttribute('id'))) {
        onRemoveFocusIntercepts(input.getAttribute('id'));
      }
    });
  },

  createFocusChangeHandler: function (hostedFieldsId, callbacks) {
    return function (data) {
      var currentIndex, targetElement, checkoutForm, navHelper;
      var sourceElement = document.getElementById('bt-' + data.field + '-' + data.direction + '-' + hostedFieldsId);

      if (!sourceElement) {
        return;
      }

      checkoutForm = findParentTags(sourceElement, 'form')[0];

      if (document.forms.length < 1 || !checkoutForm) {
        callbacks.onRemoveFocusIntercepts();

        return;
      }

      checkoutForm = [].slice.call(checkoutForm.elements);
      currentIndex = checkoutForm.indexOf(sourceElement);
      navHelper = _createNavigationHelper(data.direction, checkoutForm.length);

      do {
        currentIndex += navHelper.indexChange;
        if (navHelper.checkIndexBounds(currentIndex)) {
          return;
        }
        targetElement = checkoutForm[currentIndex];
      } while (!_isUserFocusableElement(targetElement));

      if (focusIntercept.matchFocusElement(targetElement.getAttribute('id'))) {
        callbacks.onTriggerInputFocus(targetElement.getAttribute('data-braintree-type'));
      } else {
        targetElement.focus();
      }
    };
  }
};
