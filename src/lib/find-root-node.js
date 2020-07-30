'use strict';

module.exports = function findRootNode(element) {
  while (element.parentNode) {
    element = element.parentNode;
  }

  return element;
};
