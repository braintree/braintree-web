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
var DEFAULT_AUTHORIZATION_MESSAGE = "We'll wait here.";
var DEFAULT_AUTHORIZATION_MESSAGE_SMALL =
  "Come back after reviewing your details in the app.";
var DEFAULT_AUTHORIZATION_RESCAN_MESSAGE = "Rescan code";
var V_LOGO_SVG =
  '<svg width="416" height="200" viewBox="0 0 416 200" fill="none" xmlns="http://www.w3.org/2000/svg">' +
  '  <g clip-path="url(#clip0_15119_24385)">' +
  '    <rect x="163.24" y="2.68457" width="89.5213" height="194.631"' +
  '      rx="12.2479" fill="#0074DE"/>' +
  "  </g>" +
  '  <rect x="161.904" y="1.34843" width="92.1936" height="197.303"' +
  '    rx="13.5841" stroke="black" stroke-width="2.67228"/>' +
  '  <path fill-rule="evenodd" clip-rule="evenodd"' +
  '    d="M190.029 94.9722C190.388 95.5646 190.55 96.1748 190.55 96.9456' +
  "C190.55 99.4042 188.45 102.598 186.745 104.841H182.852L181.291 95.5105" +
  "L184.7 95.187L185.525 101.826C186.297 100.57 187.248 98.5968 187.248 97.2513" +
  'C187.248 96.5148 187.122 96.0132 186.925 95.6002L190.029 94.9722Z" fill="white"/>' +
  '  <path fill-rule="evenodd" clip-rule="evenodd"' +
  '    d="M194.447 99.0813C195.075 99.0813 196.654 98.7945 196.654 97.8975' +
  "C196.654 97.4668 196.349 97.252 195.99 97.252C195.362 97.252 194.537 98.0049" +
  " 194.447 99.0813ZM194.375 100.857C194.375 101.952 194.985 102.382 195.792 102.382" +
  "C196.672 102.382 197.515 102.167 198.609 101.611L198.197 104.41" +
  "C197.426 104.786 196.223 105.038 195.057 105.038C192.096 105.038 191.037 103.244" +
  " 191.037 101.001C191.037 98.0941 192.76 95.0076 196.313 95.0076" +
  "C198.269 95.0076 199.363 96.1027 199.363 97.6277C199.363 100.086 196.206 100.839" +
  ' 194.375 100.857Z" fill="white"/>' +
  '  <path fill-rule="evenodd" clip-rule="evenodd"' +
  '    d="M209.2 97.1614C209.2 97.5202 209.146 98.0406 209.091 98.3807' +
  "L208.069 104.84H204.749L205.682 98.9189C205.7 98.7583 205.754 98.4349" +
  " 205.754 98.2555C205.754 97.8248 205.485 97.7173 205.161 97.7173" +
  "C204.731 97.7173 204.3 97.9145 204.013 98.0584L202.955 104.84H199.617" +
  "L201.142 95.1692H204.031L204.068 95.9411C204.749 95.4926 205.647 95.0076" +
  ' 206.92 95.0076C208.607 95.0074 209.2 95.8689 209.2 97.1614Z" fill="white"/>' +
  '  <path fill-rule="evenodd" clip-rule="evenodd"' +
  '    d="M219.055 96.0663C220.005 95.3852 220.903 95.0076 222.141 95.0076' +
  "C223.845 95.0076 224.438 95.8691 224.438 97.1615C224.438 97.5203 224.383 98.0408" +
  " 224.329 98.3809L223.308 104.84H219.987L220.938 98.7939C220.956 98.6323" +
  " 220.992 98.4351 220.992 98.31C220.992 97.8251 220.723 97.7175 220.399 97.7175" +
  "C219.987 97.7175 219.575 97.8969 219.269 98.0586L218.211 104.841H214.892" +
  "L215.843 98.794C215.86 98.6324 215.896 98.4352 215.896 98.3101" +
  "C215.896 97.8252 215.626 97.7176 215.304 97.7176C214.873 97.7176 214.443 97.9148" +
  " 214.156 98.0587L213.097 104.841H209.76L211.285 95.1695H214.138L214.228 95.9769" +
  "C214.892 95.493 215.788 95.0079 216.991 95.0079C218.031 95.0076 218.713 95.4562" +
  ' 219.055 96.0663Z" fill="white"/>' +
  '  <path fill-rule="evenodd" clip-rule="evenodd"' +
  '    d="M231.042 98.8837C231.042 98.0942 230.844 97.5559 230.253 97.5559' +
  "C228.943 97.5559 228.674 99.8703 228.674 101.054C228.674 101.952 228.925 102.508" +
  " 229.517 102.508C230.755 102.508 231.042 100.068 231.042 98.8837Z" +
  "M225.301 100.911C225.301 97.8614 226.915 95.0076 230.63 95.0076" +
  "C233.429 95.0076 234.452 96.6587 234.452 98.9377C234.452 101.952 232.855 105.074" +
  ' 229.051 105.074C226.234 105.074 225.301 103.226 225.301 100.911Z" fill="white"/>' +
  "  <defs>" +
  '    <clipPath id="clip0_15119_24385">' +
  '      <rect x="163.24" y="2.68457" width="89.5213" height="194.631"' +
  '        rx="12.2479" fill="white"/>' +
  "    </clipPath>" +
  "  </defs>" +
  "</svg>";
var BackView = /** @class */ (function (_super) {
  __extends(BackView, _super);
  function BackView(options) {
    var _this = _super.call(this, options) || this;
    _this.message = _this.$("#venmo-authorization_message");
    _this.messageSmall = _this.$("#venmo-authorization_message_small");
    _this.messageRescan = _this.$("#venmo-authorization_rescan_message");
    _this.sendEvent = options.sendEvent;
    _this.messageRescan.addEventListener("click", function () {
      if (_this.sendEvent) {
        _this.sendEvent("venmo.tokenize.desktop.status-change.rescan-clicked");
      }
      if (options.onRequestNewQrCode) {
        options.onRequestNewQrCode("rescan");
      }
    });
    return _this;
  }
  BackView.prototype.authorize = function () {
    this.message.innerText = DEFAULT_AUTHORIZATION_MESSAGE;
    this.messageSmall.innerText = DEFAULT_AUTHORIZATION_MESSAGE_SMALL;
    this.messageRescan.innerText = DEFAULT_AUTHORIZATION_RESCAN_MESSAGE;
  };
  BackView.prototype.constructElement = function () {
    var container = document.createElement("div");
    container.className = "view-box";
    container.id = "back-view";
    var venmoContainer = document.createElement("div");
    venmoContainer.id = "venmo-authorization";
    venmoContainer.innerHTML =
      '<div id="venmo-logo">' +
      V_LOGO_SVG +
      "</div>" +
      "<div id='venmo-authorization_message'>" +
      DEFAULT_AUTHORIZATION_MESSAGE +
      "</div>" +
      "<div id='venmo-authorization_message_small'>" +
      DEFAULT_AUTHORIZATION_MESSAGE_SMALL +
      "</div>" +
      "<button id='venmo-authorization_rescan_message'>" +
      DEFAULT_AUTHORIZATION_RESCAN_MESSAGE +
      "</button>";
    card_container_1.default.create({
      container: container,
      children: [venmoContainer],
    });

    return container;
  };
  BackView.prototype.getStyleConfig = function () {
    return [
      "#back-view {",
      "  transform: rotateY(-180deg);",
      "  position: absolute;",
      "  visibility: hidden;",
      "  height: 406px;",
      "  width: 512px;",
      "}",
      "#view-boxes.is-flipped #back-view {",
      "  transform: rotateY(0deg);",
      "  visibility: visible;",
      "}",
      "#venmo-authorization {",
      "  height: 100%;",
      "  width: 100%;",
      "  position: relative;",
      "  display: flex;",
      "  flex-direction: column;",
      "  align-content: center;",
      "  justify-content: center;",
      "}",
      "#venmo-logo {",
      "  position: relative;",
      "  border-radius: 8px;",
      "  display: flex;",
      "  height: 100%;",
      "  background: #F5F5F5;",
      "  box-shadow: 0px 0px 8px rgba(0, 0, 0, 0.14);",
      "  align-items: center;",
      "  justify-content: center;",
      "}",
      "#venmo-authorization_message {",
      '  font-family: "Athletics";',
      "  font-weight: 500;",
      "  font-size: 24px;",
      "  line-height: 32px;",
      "  letter-spacing: 0px;",
      "  text-align: center;",
      "  color: #2F3033;",
      "  width: 100%;",
      "  display: flex;",
      "  justify-content: center;",
      "  align-items: center;",
      "  margin-top: 16px;",
      "  margin-bottom: 4px;",
      "}",
      "#venmo-authorization_message_small {",
      '  font-family: "Scto Grotesk A";',
      "  color: #55585E;",
      "  font-weight: 400;",
      "  font-size: 18px;",
      "  line-height: 24px;",
      "  letter-spacing: 0px;",
      "  text-align: center;",
      "  margin-bottom: 4px;",
      "}",
      "#venmo-authorization_rescan_message {",
      '  font-family: "Scto Grotesk A";',
      "  cursor: pointer;",
      "  background: transparent;",
      "  border: 0;",
      "  padding: 0;",
      "  color: #0074DE;",
      "  font-weight: 500;",
      "  font-size: 16px;",
      "  line-height: 20px;",
      "  letter-spacing: 0px;",
      "  text-align: center;",
      "  margin: 0 auto 28px auto;",
      "}",
    ].join("\n");
  };
  return BackView;
})(base_1.default);
exports.default = BackView;
