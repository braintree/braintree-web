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
var ErrorView = /** @class */ (function (_super) {
  __extends(ErrorView, _super);
  function ErrorView(options) {
    var _this = _super.call(this, options) || this;
    _this.errorMessageContainer = _this.$("#venmo-error__message");
    _this.errorButton = _this.$("#venmo-error__button");
    return _this;
  }
  ErrorView.prototype.reset = function () {
    this.errorMessageContainer.innerText = "";
  };
  ErrorView.prototype.makeActive = function (isActive) {
    if (isActive) {
      this.element.classList.add("active");
    } else {
      this.element.classList.remove("active");
    }
  };
  ErrorView.prototype.setErrorMessage = function (message) {
    this.errorMessageContainer.innerText = message;
  };
  ErrorView.prototype.constructElement = function () {
    var container = document.createElement("div");
    container.id = "venmo-error-view";
    container.innerHTML =
      '\n      <div id="venmo-error__message"></div>\n      <button id="venmo-error__button">Try scanning again</button>\n    ';
    return container;
  };
  ErrorView.prototype.getStyleConfig = function () {
    return "\n      #venmo-error-view {\n        display: none;\n        flex-direction: column;\n        align-items: center;\n        justify-content: center;\n        text-align: center;\n        color: #FFFFFF;\n        background: #2F3033;\n        box-shadow: 0px 0px 8px rgba(0, 0, 0, 0.4);\n        border-radius: 8px;\n        padding: 0 10px;\n      }\n\n      #venmo-error-view.active {\n        display: flex;\n      }\n\n      #venmo-error__button {\n        cursor: pointer;\n        margin-top: 30px;\n        background: linear-gradient(0deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1)), #0074DE;\n        border-radius: 24px;\n        padding: 14px;\n        min-width: 300px;\n        font-size: 18px;\n        font-weight: bold;\n        line-height: 24px;\n        color: #FFFFFF;\n      }\n    ";
  };
  return ErrorView;
})(base_1.default);
exports.default = ErrorView;
