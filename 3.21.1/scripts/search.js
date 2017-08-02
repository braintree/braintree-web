'use strict';

$(function () {
  window.docsearch({
    apiKey: '1097a5c904574f31dd6d5d174a658739',
    indexName: 'braintree',
    inputSelector: '.search-input',
    debug: false, // Set debug to true if you want to inspect the dropdown
    algoliaOptions: {
      hitsPerPage: 7
    }
  });
});
