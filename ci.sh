#!/bin/bash
source ~/.nvm/nvm.sh

init_repo() {
  nvm install
  nvm use
  npm install
}

run_braintree_js_tests() {
  init_repo
  npm test
}

if [ $# -eq 0 ]; then
  run_braintree_js_tests
fi
