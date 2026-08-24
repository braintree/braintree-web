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
var modal_backdrop_1 = __importDefault(require("./modal-backdrop"));
var front_view_1 = __importDefault(require("./front-view"));
var back_view_1 = __importDefault(require("./back-view"));
var Modal = /** @class */ (function (_super) {
  __extends(Modal, _super);
  function Modal(options) {
    var _this = _super.call(this, options) || this;
    _this.authorized = false;
    _this.viewBoxesElement = _this.$("#view-boxes");
    var viewBoxesContainerElement = _this.$("#view-boxes-container");
    _this.frontView = front_view_1.default.create({
      container: viewBoxesContainerElement,
      onRequestNewQrCode: options.onRequestNewQrCode,
    });
    _this.backView = back_view_1.default.create({
      container: viewBoxesContainerElement,
      sendEvent: options.sendEvent,
      onRequestNewQrCode: function (source) {
        _this.showFrontFace();
        if (options.onRequestNewQrCode) {
          options.onRequestNewQrCode(source);
        }
      },
    });
    return _this;
  }
  Modal.prototype.close = function () {
    if (this.authorized) {
      return;
    }
    _super.prototype.close.call(this);
  };
  Modal.prototype.flip = function () {
    this.viewBoxesElement.classList.toggle("is-flipped");
  };
  Modal.prototype.showFrontFace = function () {
    this.resetViews();
    this.viewBoxesElement.classList.remove("is-flipped");
  };
  Modal.prototype.showBackFace = function () {
    this.viewBoxesElement.classList.add("is-flipped");
  };
  Modal.prototype.displayQRCode = function (url) {
    var _this = this;
    this.showFrontFace();

    this.frontView.generateQRCode(url, function (err) {
      if (err) {
        _this.displayError("Something went wrong: " + err.message);
      }
    });
  };
  Modal.prototype.authorizing = function () {
    this.showBackFace();
  };
  Modal.prototype.authorize = function () {
    this.authorized = true;
    this.showBackFace();
    this.backView.authorize();
  };
  Modal.prototype.displayError = function (message) {
    this.showFrontFace();
    this.frontView.displayError(message);
  };
  Modal.prototype.reset = function () {
    this.authorized = false;
    this.hide();
    this.showFrontFace();
  };
  Modal.prototype.show = function () {
    this.$("#outer-container").classList.remove("hidden");
  };
  Modal.prototype.hide = function () {
    this.$("#outer-container").classList.add("hidden");
  };
  Modal.prototype.resetViews = function () {
    this.frontView.reset();
  };
  Modal.prototype.constructElement = function () {
    var _this = this;
    var modal = document.createElement("div");
    modal.id = "venmo-desktop-modal";
    modal.innerHTML =
      '<div id="outer-container">' +
      '  <div id="view-boxes">' +
      '    <div id="view-boxes-container">' +
      "    </div>" +
      "  </div>" +
      "</div>";
    modal_backdrop_1.default.create({
      container: document.body,
      onClose: function () {
        _this.close();
      },
    });
    window.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        _this.close();
      }
    });
    return modal;
  };
  Modal.prototype.getStyleConfig = function () {
    return [
      "#venmo-desktop-modal {",
      "  display: flex;",
      "  align-items: center;",
      "  justify-content: center;",
      "  height: 100vh;",
      "}",
      "#outer-container {",
      "  position: absolute;",
      "  top: 0;",
      "  bottom: 0;",
      "  width: 100%;",
      "  perspective: 840px;",
      "  animation: 1s drop;",
      "  pointer-events: none;",
      "}",
      "#outer-container.hidden {",
      "  display: none;",
      "}",
      "#view-boxes {",
      "  display: flex;",
      "  align-items: center;",
      "  justify-content: center;",
      "  height: 100%;",
      "  width: 100%;",
      "  perspective: 1000;",
      "  transition: transform 1s;",
      "  transform-style: preserve-3d;",
      "}",
      "#view-boxes-container {",
      "  display: flex;",
      "  align-items: center;",
      "  justify-content: center;",
      "  position: relative;",
      "  height: 100%;",
      "  width: 100%;",
      "  font-family: sans-serif;",
      "  font-style: normal;",
      "  font-weight: 100;",
      "  perspective: 1000;",
      "}",
      ".view-box {",
      "  display: flex;",
      "  position: absolute;",
      "  max-width: 95%;",
      "  pointer-events: auto;",
      "  -webkit-backface-visibility: hidden; /* Safari */",
      "  backface-visibility: hidden;",
      "  transition: transform 1s;",
      "  transform-style: preserve-3d;",
      "}",
    ].join("\n");
  };
  return Modal;
})(base_1.default);
exports.default = Modal;
