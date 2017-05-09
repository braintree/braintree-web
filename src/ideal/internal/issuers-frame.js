'use strict';

var Bus = require('../../lib/bus');
var sanitizeHtml = require('../../lib/sanitize-html');
var classList = require('../../lib/classlist');
var events = require('../shared/events');
var cachedBus;

function start() {
  getBus().emit(Bus.events.CONFIGURATION_REQUEST, setupBankList);
}

function getBus() {
  if (!cachedBus) {
    cachedBus = new Bus({
      channel: window.name.split('_')[1]
    });
  }

  return cachedBus;
}

function sanitizeImageFileName(filename) {
  return filename.replace(/[^a-z0-9-_.]/ig, '');
}

function setupBankList(config) {
  var bankData = config.bankData;
  var bankListNode = document.createElement('div');
  var displayCountryName = bankData.length > 1;

  bankListNode.className = 'container--ideal container--ideal--mobile';

  bankData.forEach(function (banksByCountry) {
    var countryNode = document.createElement('div');
    var issuersList = document.createElement('ul');
    var issuers = banksByCountry.issuers;

    if (displayCountryName) {
      countryNode.innerHTML = '<h2 class="list--heading--ideal list--heading--ideal--mobile">' + sanitizeHtml(banksByCountry.localized_country_names[0]) + ':</h2>';
    }

    issuersList.className = 'list list--ideal list--ideal--mobile';
    countryNode.appendChild(issuersList);

    issuers.forEach(function (issuer) {
      var bankNode = document.createElement('li');

      bankNode.id = issuer.id;
      bankNode.className = 'list--item list--item--ideal';
      bankNode.innerHTML = '<a class="list--link">' +
        '<div class="list--icon"><img src="../../static/images/ideal_issuer-logo_' + sanitizeImageFileName(issuer.image_file_name) + '"></div>' +
        '<span class="list--name">' + sanitizeHtml(issuer.name) + '</span>' +
      '</a>';

      bankNode.addEventListener('click', createIssuingBankHandler(issuer.id));

      issuersList.appendChild(bankNode);
    });

    bankListNode.appendChild(countryNode);
  });

  document.body.appendChild(bankListNode);
}

function createIssuingBankHandler(id) {
  var bus = getBus();

  return function chooseIssuingBank() {
    classList.add(document.body, 'loading');
    bus.emit(events.BANK_CHOSEN, {issuingBankId: id});
  };
}

module.exports = {
  start: start
};
