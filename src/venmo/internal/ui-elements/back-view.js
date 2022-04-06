"use strict";
var __extends =
  (this && this.__extends) ||
  (function () {
    var extendStatics = function (d, b) {
      extendStatics =
        Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array &&
          function (d, b) {
            d.__proto__ = b;
          }) ||
        function (d, b) {
          for (var p in b)
            if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p];
        };
      return extendStatics(d, b);
    };
    return function (d, b) {
      if (typeof b !== "function" && b !== null)
        throw new TypeError(
          "Class extends value " + String(b) + " is not a constructor or null"
        );
      extendStatics(d, b);
      function __() {
        this.constructor = d;
      }
      d.prototype =
        b === null
          ? Object.create(b)
          : ((__.prototype = b.prototype), new __());
    };
  })();
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
var base_1 = __importDefault(require("./base"));
var card_container_1 = __importDefault(require("./card-container"));
var DEFAULT_AUTHORIZE_MESSAGE = "Authorize on your Venmo app";
var V_LOGO_SVG =
  '\n<svg width="98" height="102" viewBox="0 0 98 102" fill="none" xmlns="http://www.w3.org/2000/svg">\n  <path fill-rule="evenodd" clip-rule="evenodd" d="M92.1214 0.235107C95.8867 6.33106 97.5862 12.608 97.5862 20.5402C97.5862 45.8333 75.5507 78.6923 57.6645 101.765H16.8159L0.434998 5.77487L36.2029 2.4466L44.8635 70.7513C52.959 57.831 62.9439 37.5259 62.9439 23.6831C62.9439 16.1084 61.6196 10.9438 59.5494 6.69743L92.1214 0.235107Z" fill="white"/>\n</svg>\n';
var CHECKMARK_SVG =
  '\n<svg width="59" height="59" viewBox="0 0 59 59" fill="none" xmlns="http://www.w3.org/2000/svg">\n  <rect x="1" y="1" width="57" height="57" rx="28.5" fill="#148572" stroke="#888C94"/>\n  <g clip-path="url(#clip0)">\n  <path d="M24.0067 40.8397C22.9209 39.7538 22.9209 37.9933 24.0067 36.9075L39.2931 21.621C40.379 20.5352 42.1395 20.5352 43.2254 21.621C44.3112 22.7069 44.3112 24.4674 43.2254 25.5532L27.9389 40.8397C26.8531 41.9255 25.0926 41.9255 24.0067 40.8397Z" fill="white"/>\n  <path d="M27.9762 40.8397C26.8904 41.9255 25.1299 41.9255 24.044 40.8397L17.1627 33.9583C16.0768 32.8725 16.0768 31.112 17.1627 30.0261C18.2485 28.9403 20.009 28.9403 21.0949 30.0261L27.9762 36.9075C29.0621 37.9933 29.0621 39.7538 27.9762 40.8397Z" fill="white"/>\n  </g>\n  <defs>\n  <clipPath id="clip0">\n  <rect width="27.8049" height="27.8049" fill="white" transform="translate(16.2927 16.2925)"/>\n  </clipPath>\n  </defs>\n</svg>\n';
var BackView = /** @class */ (function (_super) {
  __extends(BackView, _super);
  function BackView(options) {
    var _this = _super.call(this, options) || this;
    _this.checkmark = _this.$("#venmo-checkmark");
    _this.message = _this.$("#venmo-authorization_message");
    return _this;
  }
  BackView.prototype.authorize = function () {
    this.checkmark.classList.add("active");
    this.message.innerText = "Venmo account authorized";
  };
  BackView.prototype.reset = function () {
    this.checkmark.classList.remove("active");
    this.message.innerText = DEFAULT_AUTHORIZE_MESSAGE;
  };
  BackView.prototype.constructElement = function () {
    var container = document.createElement("div");
    container.className = "view-box";
    container.id = "back-view";
    var venmoContainer = document.createElement("div");
    venmoContainer.id = "venmo-authorization";
    venmoContainer.innerHTML =
      '\n      <div id="venmo-logo">\n        ' +
      V_LOGO_SVG +
      '\n\n        <div id="venmo-checkmark">\n          ' +
      CHECKMARK_SVG +
      '\n        </div>\n      </div>\n\n      <div id="venmo-authorization_message">' +
      DEFAULT_AUTHORIZE_MESSAGE +
      "</div>\n    ";
    card_container_1.default.create({
      container: container,
      children: [venmoContainer],
    });
    return container;
  };
  BackView.prototype.getStyleConfig = function () {
    return "\n      #back-view {\n        transform: rotateY(-180deg);\n        position: absolute;\n        visibility: hidden;\n      }\n\n      #view-boxes.is-flipped #back-view {\n        transform: rotateY(0deg);\n        position: relative;\n        visibility: visible;\n      }\n\n      #venmo-authorization {\n        height: 100%;\n        width: 100%;\n        position: relative;\n        display: flex;\n        flex-direction: column;\n        align-content: center;\n        justify-content: center;\n      }\n\n      #venmo-logo {\n        position: relative;\n        border-radius: 8px;\n        display: flex;\n        height: 70%;\n        width: 70%;\n        margin: 10% auto 0;\n        background: #008CFF;\n        box-shadow: 0px 0px 8px rgba(0, 0, 0, 0.14);\n        align-items: center;\n        justify-content: center;\n      }\n\n      #venmo-checkmark {\n        position: absolute;\n        right: 50px;\n        bottom: 20px;\n        display: none;\n        animation: 0.5s appear, 0.5s checkmark-drop;\n      }\n\n      #venmo-checkmark.active {\n        display: block;\n      }\n\n      #venmo-authorization_message {\n        font-size: 18px;\n        line-height: 16px;\n        text-align: center;\n        color: #2F3033;\n        width: 100%;\n        height: 20%;\n        display: flex;\n        justify-content: center;\n        align-items: center;\n      }\n\n      @keyframes checkmark-drop {\n        from {\n          bottom: 0;\n        }\n      }\n    ";
  };
  return BackView;
})(base_1.default);
exports.default = BackView;
