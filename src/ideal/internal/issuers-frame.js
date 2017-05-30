'use strict';

var Bus = require('../../lib/bus');
var sanitizeHtml = require('../../lib/sanitize-html');
var events = require('../shared/events');
var TIMEOUT_TILL_OVERLAY_SHOULD_BE_HIDDEN = 1000;
var bankSelectionInProgress = false;
var cachedBus, redirectTimeout, overlayNode;

function start() {
  var confirmView = document.querySelector('.confirm-view');

  overlayNode = document.querySelector('.overlay');

  confirmView.querySelector('.back-btn').addEventListener('click', function () {
    bankSelectionInProgress = false;
    hideNode(confirmView);
    clearTimeout(redirectTimeout);
  });

  getBus().emit(Bus.events.CONFIGURATION_REQUEST, function (config) {
    setupBankList(config);
    setTimeout(function () {
      hideNode(overlayNode);
    }, TIMEOUT_TILL_OVERLAY_SHOULD_BE_HIDDEN);
  });
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
  var totalNumberOfBankLogos = bankData.reduce(function (accumulated, banksByCountry) {
    return accumulated + banksByCountry.issuers.reduce(function (accumlatedIssuers) {
      return accumlatedIssuers + 1;
    }, 0);
  }, 0);
  var bankLogosLoaded = 0;
  var bankListIsOnPage = false;

  function hideOverlayIfPageIsLoaded() {
    if (bankListIsOnPage && bankLogosLoaded === totalNumberOfBankLogos) {
      hideNode(overlayNode);
    }
  }

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
      var bankName = sanitizeHtml(issuer.name);
      var logoFile = sanitizeImageFileName(issuer.image_file_name);
      var logoImage = document.createElement('img');
      var logoImageContainer;

      logoImage.src = '../../static/images/ideal_issuer-logo_' + logoFile;
      logoImage.onload = logoImage.onerror = function () {
        bankLogosLoaded++;

        hideOverlayIfPageIsLoaded();
      };

      bankNode.id = issuer.id;
      bankNode.className = 'list--item list--item--ideal';
      bankNode.innerHTML = '<a class="list--link">' +
        '<div class="list--icon"></div>' +
        '<span class="list--name">' + bankName + '</span>' +
      '</a>';

      logoImageContainer = bankNode.querySelector('.list--icon');
      logoImageContainer.style.height = '36px';
      logoImageContainer.appendChild(logoImage);

      bankNode.addEventListener('click', function () {
        bankSelectHandler(issuer.id, logoImage, bankName);
      });

      issuersList.appendChild(bankNode);
    });

    bankListNode.appendChild(countryNode);
  });

  document.querySelector('.ideal-list-container').appendChild(bankListNode);
  bankListIsOnPage = true;

  hideOverlayIfPageIsLoaded();
}

function showNode(node) {
  node.style.display = 'block';
  setTimeout(function () {
    node.style.opacity = '1';
  }, 10);
}

function hideNode(node) {
  node.style.opacity = 0;
  setTimeout(function () {
    node.style.display = 'none';
  }, 250);
}

function bankSelectHandler(id, logoImage, bankName) {
  var confirmView = document.querySelector('.confirm-view');
  var bankLogoNode = confirmView.querySelector('.bank-message--logo');
  var bankNameNode = confirmView.querySelector('.bank-message--name');

  if (bankSelectionInProgress) {
    return;
  }

  bankSelectionInProgress = true;

  logoImage = logoImage.cloneNode();

  bankLogoNode.innerHTML = '';

  bankNameNode.textContent = bankName;
  bankLogoNode.appendChild(logoImage.cloneNode());

  logoImage.onload = logoImage.onerror = function () {
    showNode(confirmView);
    redirectTimeout = setTimeout(createIssuingBankHandler(id), 3000);
  };
}

function createIssuingBankHandler(id) {
  var bus = getBus();

  return function chooseIssuingBank() {
    bus.emit(events.BANK_CHOSEN, {issuingBankId: id});
  };
}

module.exports = {
  start: start
};
