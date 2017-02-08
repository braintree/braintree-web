'use strict';

function rejectIfResolves() {
  throw new Error('should not resolve');
}

module.exports = {
  rejectIfResolves: rejectIfResolves
};
