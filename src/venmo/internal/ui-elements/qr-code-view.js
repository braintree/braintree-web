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
var QRCode = require("qrcode");
var VENMO_LOGO_SVG =
  '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">' +
  '  <rect width="40" height="40" rx="12" fill="#0074DE"/>' +
  '  <path d="M29.1504 9L22.2504 10.4C22.6504 11.35 22.9504 12.45 22.9504 14.1' +
  "C22.9504 17.1 20.8504 21.5 19.1004 24.3L17.2504 9.5L9.65039 10.25L13.1504 31" +
  "H21.8504C25.7004 26 30.3504 18.85 30.3504 13.4C30.3504 11.7 29.9504 10.35" +
  ' 29.1504 9Z" fill="white"/>' +
  "</svg>";
var QRCodeView = /** @class */ (function (_super) {
  __extends(QRCodeView, _super);
  function QRCodeView(options) {
    var _this = _super.call(this, options) || this;
    _this.qrCodePlaceholder = _this.$(
      "#venmo-qr-code-view__code-container-placeholder"
    );
    _this.qrCodeContainer = _this.$(
      "#venmo-qr-code-view__code-container-qr-code"
    );
    return _this;
  }
  QRCodeView.prototype.makeActive = function (isActive) {
    if (isActive) {
      this.element.classList.add("active");
    } else {
      this.element.classList.remove("active");
    }
  };
  QRCodeView.prototype.reset = function () {
    this.qrCodePlaceholder.classList.remove("hidden");
    this.qrCodeContainer.innerHTML = "";
    this.qrCodeContainer.classList.add("hidden");
  };
  QRCodeView.prototype.generateQRCode = function (url, cb) {
    var _this = this;
    if (this.isNotValidDomain(url)) {
      cb(new Error("Invalid domain"));
      return;
    }
    this.qrCodeContainer.innerHTML = "";
    var canvas = document.createElement("canvas");
    canvas.id = "venmo-qr-code-view__code-container-qr-code-canvas";

    QRCode.toCanvas(
      canvas,
      url,
      {
        width: 210,
        version: 17,
        errorCorrectionLevel: "H",
        color: {
          dark: "#000000",
        },
      },
      function (error) {
        if (error) {
          cb(error);
          return;
        }
        var ctx = canvas.getContext("2d");
        var img = new Image();
        var svgBlob = new Blob([VENMO_LOGO_SVG], { type: "image/svg+xml" });
        var svgUrl = URL.createObjectURL(svgBlob);

        img.onload = function () {
          var logoSize = 40;
          var strokeWidth = 4;
          var x = (canvas.width - logoSize) / 2;
          var y = (canvas.height - logoSize) / 2;

          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.roundRect(
            x - strokeWidth,
            y - strokeWidth,
            logoSize + strokeWidth * 2,
            logoSize + strokeWidth * 2,
            12 + strokeWidth
          );
          ctx.fill();

          ctx.drawImage(img, x, y, logoSize, logoSize);
          URL.revokeObjectURL(svgUrl);

          _this.qrCodePlaceholder.classList.add("hidden");
          _this.qrCodeContainer.appendChild(canvas);
          _this.qrCodeContainer.classList.remove("hidden");
          cb();
        };

        img.onerror = function () {
          URL.revokeObjectURL(svgUrl);
          _this.qrCodePlaceholder.classList.add("hidden");
          _this.qrCodeContainer.appendChild(canvas);
          _this.qrCodeContainer.classList.remove("hidden");
          cb();
        };

        img.src = svgUrl;
      }
    );
  };
  QRCodeView.prototype.isNotValidDomain = function (url) {
    var protocol, hostname;

    try {
      var parsed = new URL(url);
      protocol = parsed.protocol;
      hostname = parsed.hostname;
    } catch (e) {
      var protocolMatch = url.match(/^(https?):/);
      var hostnameMatch = url.match(/^https?:\/\/([^/?#]+)/);
      protocol = protocolMatch ? protocolMatch[1] + ":" : "";
      hostname = hostnameMatch ? hostnameMatch[1] : "";
    }

    return protocol !== "https:" || hostname !== "venmo.com";
  };
  QRCodeView.prototype.constructElement = function () {
    var container = document.createElement("div");
    container.id = "venmo-qr-code-view";
    var footer = document.createElement("div");
    var header = document.createElement("div");
    header.id = "venmo-qr-code-view__header";
    header.innerHTML =
      '<div id="close-icon-container"></div>' +
      '<div id="venmo-qr-code-backdrop">' +
      '  <div id="venmo-qr-code-view__code-container" width="210" height="210">' +
      '    <div id="venmo-qr-code-view__code-container-placeholder">' +
      '      <div id="venmo-qr-code-view__code-container-placeholder-shimmer"></div>' +
      "    </div>" +
      '    <div id="venmo-qr-code-view__code-container-qr-code" class="hidden"></div>' +
      "  </div>" +
      "</div>";
    footer.id = "venmo-qr-code-view__footer";
    footer.innerHTML =
      '<div id="venmo-qr-code-view__footer__text">' +
      '  <div id="venmo-qr-code-view__footer__text__line1">Scan to pay with Venmo</div>' +
      '  <div id="venmo-qr-code-view__footer__text__line2">Use your phone’s camera to open the app.</div>' +
      "</div>";
    container.classList.add("active");
    card_container_1.default.create({
      container: container,
      children: [header, footer],
    });
    return container;
  };
  QRCodeView.prototype.getStyleConfig = function () {
    return [
      "@font-face {",
      '  font-family: "Athletics";',
      '  src: url("https://assets.braintreegateway.com/web/sdk-fonts/v1/Athletics-Medium.woff")',
      '  format("woff");',
      "  font-weight: 500;",
      "  font-style: normal;",
      "  font-display: swap;",
      "}",
      "@font-face {",
      '  font-family: "Scto Grotesk A";',
      '  src: url("https://assets.braintreegateway.com/web/sdk-fonts/v1/Scto-Grotesk-A-Regular.woff")',
      '  format("woff");',
      "  font-weight: 400;",
      "  font-style: normal;",
      "  font-display: swap;",
      "}",
      "#venmo-qr-code-view {",
      "  display: none;",
      "}",
      "#venmo-qr-code-view.active {",
      "  display: flex;",
      "}",
      "#venmo-qr-code-backdrop {",
      "  background: #f5f5f5;",
      "  width: 100%;",
      "  height: 100%;",
      "  display: flex;",
      "  justify-content: center;",
      "  align-items: center;",
      "  border-radius: 12px 12px 0 0;",
      "}",
      "#venmo-qr-code-view__header {",
      "  flex-grow: 1;",
      "  display: flex;",
      "  justify-content: center;",
      "  align-items: center;",
      "  flex-direction: column;",
      "  margin: 0 10px 16px 10px;",
      "  width: 100%;",
      "}",
      "#venmo-qr-code-view__code-container {",
      "  width: 210px;",
      "  height: 210px;",
      "  display: flex;",
      "  align-items: center;",
      "  justify-content: center;",
      "}",
      "#venmo-qr-code-view__code-container-placeholder {",
      "  background: rgb(213, 211, 213);",
      "  height: 210px;",
      "  width: 210px;",
      "  border-radius: 12px;",
      "  overflow: hidden;",
      "}",
      "#venmo-qr-code-view__code-container-qr-code-canvas {",
      "  background: #ffffff;",
      "  padding: 25px;",
      "  border-radius: 12px;",
      "  box-shadow: 0px 4px 12px 2px #00000014;",
      "}",
      "#venmo-qr-code-view__code-container-placeholder.hidden {",
      "  display: none;",
      "}",
      "#venmo-qr-code-view__code-container-qr-code {",
      "  height: 210px;",
      "  width: 210px;",
      "  animation: 1s appear;",
      "}",
      "#venmo-qr-code-view__code-container-qr-code.hidden {",
      "  display: none;",
      "}",
      "#venmo-qr-code-view__code-container-placeholder-shimmer {",
      "  background: rgb(216, 215, 216);",
      "  width: 300px;",
      "  height: 50px;",
      "  transform: rotate(-45deg);",
      "  position: relative;",
      "  animation: 1.5s shimmer infinite;",
      "  top: 1000px;",
      "  left: 50px;",
      "}",
      "#venmo-qr-code-view__footer {",
      "  display: flex;",
      "  align-items: center;",
      "}",
      "#venmo-qr-code-view__footer__text {",
      "  text-align: center;",
      "  padding: 0 14px 32px 14px;",
      "  letter-spacing: 0px;",
      "}",
      "#venmo-qr-code-view__footer__text__line1 {",
      "  font-family: Athletics;",
      "  font-size: 24px;",
      "  margin-bottom: 4px;",
      "  font-weight: 500;",
      "  line-height: 32px;",
      "  color: #2F3033;",
      "}",
      "#venmo-qr-code-view__footer__text__line2 {",
      "  font-family: 'Scto Grotesk A';",
      "  font-size: 18px;",
      "  font-weight: 400;",
      "  line-height: 24px;",
      "  color: #55585E;",
      "}",
      "@keyframes shimmer {",
      "  from {",
      "    top: -80px;",
      "    left: -60px;",
      "  }",
      "}",
    ].join("\n");
  };
  return QRCodeView;
})(base_1.default);
exports.default = QRCodeView;
