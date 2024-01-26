"use strict";

var frameService = require("../../lib/frame-service/external");
var useMin = require("../../lib/use-min");
var ExtendedPromise = require("@braintree/extended-promise");
var errors = require("../shared/errors");
var BraintreeError = require("../../lib/braintree-error");

var VERSION = process.env.npm_package_version;
var VENMO_LOGO_SVG =
  '<svg width="198" height="58" viewBox="0 0 198 58" fill="none" xmlns="http://www.w3.org/2000/svg">\n  <path fill-rule="evenodd" clip-rule="evenodd" d="M43.0702 13.6572C44.1935 15.4585 44.6999 17.3139 44.6999 19.6576C44.6999 27.1328 38.1277 36.8436 32.7935 43.6625H20.6099L15.7236 15.2939L26.3917 14.3105L28.9751 34.4966C31.389 30.6783 34.3678 24.6779 34.3678 20.587C34.3678 18.3477 33.9727 16.8225 33.3553 15.5666L43.0702 13.6572Z" fill="white"/>\n  <path fill-rule="evenodd" clip-rule="evenodd" d="M56.8965 26.1491C58.8596 26.1491 63.8018 25.2772 63.8018 22.5499C63.8018 21.2402 62.8481 20.587 61.7242 20.587C59.7579 20.587 57.1776 22.8763 56.8965 26.1491ZM56.6715 31.5506C56.6715 34.8807 58.5787 36.1873 61.107 36.1873C63.8603 36.1873 66.4966 35.534 69.923 33.8433L68.6324 42.3523C66.2183 43.4976 62.4559 44.2617 58.8039 44.2617C49.5403 44.2617 46.2249 38.8071 46.2249 31.9879C46.2249 23.1496 51.6179 13.765 62.7365 13.765C68.858 13.765 72.2809 17.0949 72.2809 21.7317C72.2815 29.2066 62.4005 31.4965 56.6715 31.5506Z" fill="white"/>\n  <path fill-rule="evenodd" clip-rule="evenodd" d="M103.067 20.3142C103.067 21.4052 102.897 22.9875 102.727 24.0216L99.5262 43.6622H89.1385L92.0585 25.658C92.1139 25.1696 92.284 24.1865 92.284 23.6411C92.284 22.3314 91.4414 22.0047 90.4282 22.0047C89.0826 22.0047 87.7337 22.6042 86.8354 23.0418L83.5234 43.6625H73.0772L77.8495 14.257H86.8908L87.0052 16.6041C89.1382 15.2404 91.9469 13.7656 95.932 13.7656C101.212 13.765 103.067 16.3845 103.067 20.3142Z" fill="white"/>\n  <path fill-rule="evenodd" clip-rule="evenodd" d="M133.906 16.9841C136.881 14.9131 139.69 13.765 143.563 13.765C148.897 13.765 150.753 16.3845 150.753 20.3142C150.753 21.4052 150.583 22.9875 150.413 24.0216L147.216 43.6622H136.825L139.801 25.2774C139.855 24.786 139.971 24.1865 139.971 23.8063C139.971 22.3317 139.128 22.0047 138.115 22.0047C136.824 22.0047 135.535 22.5501 134.577 23.0418L131.266 43.6625H120.878L123.854 25.2777C123.908 24.7863 124.02 24.1868 124.02 23.8065C124.02 22.332 123.177 22.0049 122.167 22.0049C120.819 22.0049 119.473 22.6045 118.574 23.0421L115.26 43.6628H104.817L109.589 14.2573H118.52L118.8 16.7122C120.878 15.241 123.684 13.7662 127.446 13.7662C130.704 13.765 132.837 15.129 133.906 16.9841Z" fill="white"/>\n  <path fill-rule="evenodd" clip-rule="evenodd" d="M171.426 25.5502C171.426 23.1496 170.808 21.513 168.956 21.513C164.857 21.513 164.015 28.55 164.015 32.1498C164.015 34.8807 164.802 36.5709 166.653 36.5709C170.528 36.5709 171.426 29.1497 171.426 25.5502ZM153.458 31.7152C153.458 22.442 158.511 13.765 170.136 13.765C178.896 13.765 182.098 18.7854 182.098 25.7148C182.098 34.8805 177.099 44.3723 165.194 44.3723C156.378 44.3723 153.458 38.7525 153.458 31.7152Z" fill="white"/>\n</svg>';
var CONTINUE_OR_CANCEL_INSTRUCTIONS =
  "Tap cancel payment to cancel and return to the business. Continue payment will relaunch the payment window.";

var POPUP_WIDTH = 400;
var POPUP_HEIGHT = 570;
var ELEMENT_IDS = {
  backdrop: "venmo-desktop-web-backdrop",
  backdropHidden: "venmo-desktop-web-backdrop.hidden",
  backdropContainer: "venmo-backdrop-container",
  cancelButton: "venmo-popup-cancel-button",
  continueButton: "venmo-popup-continue-button",
  message: "venmo-message",
  instructions: "venmo-instructions",
  venmoLogo: "venmo-full-logo",
};

ExtendedPromise.suppressUnhandledPromiseMessage = true;

function openPopup(options) {
  var frameServiceInstance = options.frameServiceInstance;
  var venmoUrl = options.venmoUrl;
  var checkForStatusChange = options.checkForStatusChange;
  var cancelTokenization = options.cancelTokenization;
  var checkPaymentContextStatus = options.checkPaymentContextStatus;
  var extendedPromise = new ExtendedPromise();

  document
    .getElementById(ELEMENT_IDS.continueButton)
    .addEventListener("click", function () {
      frameServiceInstance.focus();
    });
  document
    .getElementById(ELEMENT_IDS.cancelButton)
    .addEventListener("click", function () {
      frameServiceInstance.close();
      cancelTokenization();
      closeBackdrop();
    });
  frameServiceInstance.open({}, function (frameServiceErr) {
    var retryStartingCount = 1;

    if (frameServiceErr) {
      extendedPromise.reject(frameServiceErr);
    } else {
      checkForStatusChange(retryStartingCount)
        .then(function (data) {
          extendedPromise.resolve(data);
        })
        .catch(function (statusCheckError) {
          // We add this check here because at this point
          // the status should not be in CREATED status.
          // However, there is an edge case where if a buyer
          // cancels in the popup, the popup might close itself
          // before it can send the graphQL mutation to update its status.
          // In these cases, the status will be stuck in CREATED status, and
          // tokenization would fail, incorrectly throwing a tokenization error
          // instead of informing the merchant that the customer canceled.
          checkPaymentContextStatus().then(function (node) {
            if (node.status === "CREATED") {
              extendedPromise.reject(
                new BraintreeError(errors.VENMO_CUSTOMER_CANCELED)
              );
            } else {
              extendedPromise.reject(statusCheckError);
            }
          });
        });
    }

    frameServiceInstance.close();
    closeBackdrop();
  });
  frameServiceInstance.redirect(venmoUrl);

  return extendedPromise;
}

function centeredPopupDimensions() {
  var popupTop =
    Math.round((window.outerHeight - POPUP_HEIGHT) / 2) + window.screenTop;
  var popupLeft =
    Math.round((window.outerWidth - POPUP_WIDTH) / 2) + window.screenLeft;

  return {
    top: popupTop,
    left: popupLeft,
  };
}

function closeBackdrop() {
  document.getElementById("venmo-desktop-web-backdrop").classList.add("hidden");
}

function getElementStyles() {
  var backdropStyles = [
    "#" + ELEMENT_IDS.backdropHidden + " {",
    "display: none;",
    "}",
    "#" + ELEMENT_IDS.backdrop + " {",
    "z-index: 3141592632;",
    "cursor: pointer;",
    "position: fixed;",
    "top: 0;",
    "left: 0;",
    "bottom: 0;",
    "width: 100%;",
    "background: rgba(0, 0, 0, 0.8);",
    "}",
  ];
  var backdropContainerStyles = [
    "#" + ELEMENT_IDS.backdropContainer + " {",
    "display: flex;",
    "align-content: center;",
    "justify-content: center;",
    "align-items: center;",
    "width: 100%;",
    "height: 100%;",
    "flex-direction: column;",
    "}",
  ];

  var cancelButtonStyles = [
    "#" + ELEMENT_IDS.cancelButton + " {",
    "height: 24px;",
    "width: 380px;",
    "font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;",
    "font-style: normal;",
    "font-weight: 700;",
    "font-size: 18px;",
    "line-height: 24px;",
    "text-align: center;",
    "background-color: transparent;",
    "border: none;",
    "color: #FFFFFF;",
    "margin-top: 28px;",
    "}",
  ];

  var continueButtonStyles = [
    "#" + ELEMENT_IDS.continueButton + " {",
    "width: 400px;",
    "height: 50px;",
    "background: #0074DE;",
    "border-radius: 24px;",
    "border: none;",
    "font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;",
    "font-style: normal;",
    "font-weight: 700;",
    "font-size: 18px;",
    "color: #FFFFFF;",
    "margin-top: 44px;",
    "}",
  ];

  var messageStyles = [
    "#" + ELEMENT_IDS.message + " {",
    "font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;",
    "font-style: normal;",
    "font-weight: 500;",
    "font-size: 24px;",
    "line-height: 32px;",
    "text-align: center;",
    "color: #FFFFFF;",
    "margin-top: 32px;",
    "}",
  ];

  var instructionStyles = [
    "#" + ELEMENT_IDS.instructions + " {",
    "font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;",
    "font-style: normal;",
    "font-weight: 400;",
    "font-size: 16px;",
    "line-height: 20px;",
    "text-align: center;",
    "color: #FFFFFF;",
    "margin-top: 16px;",
    "width: 400px;",
    "}",
  ];

  var allStyles = backdropStyles.concat(
    backdropContainerStyles,
    cancelButtonStyles,
    continueButtonStyles,
    messageStyles,
    instructionStyles
  );

  return allStyles.join("\n");
}

function buildAndStyleElements() {
  var alreadyRenderedBackdrop = document.getElementById(ELEMENT_IDS.backdrop);
  var backdropStylesElement,
    backdropDiv,
    backDropContentContainer,
    venmoLogoDiv,
    venmoMessageDiv,
    instructionsDiv,
    continueButton,
    cancelButton;

  if (alreadyRenderedBackdrop) {
    alreadyRenderedBackdrop.classList.remove("hidden");

    return;
  }
  backdropStylesElement = document.createElement("style");
  backdropDiv = document.createElement("div");
  backDropContentContainer = document.createElement("div");
  venmoLogoDiv = document.createElement("div");
  venmoMessageDiv = document.createElement("div");
  instructionsDiv = document.createElement("div");
  continueButton = document.createElement("button");
  cancelButton = document.createElement("button");

  backdropStylesElement.id = "venmo-desktop-web__injected-styles";
  backdropStylesElement.innerHTML = getElementStyles();

  backdropDiv.id = ELEMENT_IDS.backdrop;

  backDropContentContainer.id = ELEMENT_IDS.backdropContainer;

  venmoLogoDiv.id = ELEMENT_IDS.venmoLogo;
  venmoLogoDiv.innerHTML = VENMO_LOGO_SVG;

  venmoMessageDiv.id = ELEMENT_IDS.message;
  venmoMessageDiv.innerText = "What would you like to do?";

  instructionsDiv.id = ELEMENT_IDS.instructions;
  instructionsDiv.innerText = CONTINUE_OR_CANCEL_INSTRUCTIONS;

  continueButton.id = ELEMENT_IDS.continueButton;
  continueButton.innerText = "Continue payment";

  cancelButton.id = ELEMENT_IDS.cancelButton;
  cancelButton.innerText = "Cancel payment";

  document.head.appendChild(backdropStylesElement);
  backDropContentContainer.appendChild(venmoLogoDiv);
  backDropContentContainer.appendChild(venmoMessageDiv);
  backDropContentContainer.appendChild(instructionsDiv);
  backDropContentContainer.appendChild(continueButton);
  backDropContentContainer.appendChild(cancelButton);
  backdropDiv.appendChild(backDropContentContainer);
  document.body.appendChild(backdropDiv);

  backdropDiv.addEventListener("click", function (event) {
    event.stopPropagation();
  });
}

/**
 * Applies a backdrop over the page, and opens a popup to the supplied url. Uses supplied status and cancel functions to handle the flow.
 * @function runWebLogin
 * @ignore
 * @param {object} options Options for running the web login flow.
 * @param {string} options.venmoUrl Venmo url that is to be used for logging in.
 * @param {Venmo~checkPaymentContextStatusAndProcessResult} options.checkForStatusChange {@link Venmo~checkPaymentContextStatusAndProcessResult} to be invoked in order to check for a payment context status update.
 * @param {Venmo~cancelTokenization} options.cancelTokenization {@link Venmo~cancelTokenization} to be invoked when the appropriate payment context status is retrieved.
 * @param {boolean} options.debug A flag to control whether to use minified assets or not.
 * @returns {Promise} Returns a promise
 */
function runWebLogin(options) {
  buildAndStyleElements();

  return openPopup(options);
}

/**
 * When using frameservice, it needs to be created separately from the action of opening. The setup process includes
 * steps that browsers may consider async or too disconnected from the user action required to open a popup.
 *
 * This function enables us to do that setup at an appropriate time.
 * @function setupDesktopWebLogin
 * @ignore
 * @param {object} options Options use for setting up the Desktop Web Login flow.
 * @param {string} options.assetsUrl Url that points to the hosted Braintree assets.
 * @param {boolean} options.debug A flag to control whether to use minified assets or not.

 * @returns {Promise} Returns a promise
 */
function setupDesktopWebLogin(options) {
  var extendedPromise = new ExtendedPromise();
  var popupName = "venmoDesktopWebLogin";
  var assetsUrl = options.assetsUrl;
  var debug = options.debug || false;
  var popupLocation = centeredPopupDimensions();
  var assetsBaseUrl = assetsUrl + "/web/" + VERSION + "/html";

  frameService.create(
    {
      name: popupName,
      dispatchFrameUrl:
        assetsBaseUrl + "/dispatch-frame" + useMin(debug) + ".html",
      openFrameUrl:
        assetsBaseUrl + "/venmo-landing-frame" + useMin(debug) + ".html",
      top: popupLocation.top,
      left: popupLocation.left,
      height: POPUP_HEIGHT,
      width: POPUP_WIDTH,
    },
    function (frameServiceInstance) {
      extendedPromise.resolve(frameServiceInstance);
    }
  );

  return extendedPromise;
}

module.exports = {
  runWebLogin: runWebLogin,
  openPopup: openPopup,
  setupDesktopWebLogin: setupDesktopWebLogin,
  POPUP_WIDTH: POPUP_WIDTH,
  POPUP_HEIGHT: POPUP_HEIGHT,
};
