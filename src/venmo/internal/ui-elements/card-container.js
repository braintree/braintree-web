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
var close_icon_1 = __importDefault(require("./close-icon"));
var CardContainer = /** @class */ (function (_super) {
  __extends(CardContainer, _super);
  function CardContainer(options) {
    var _this = _super.call(this, options) || this;
    _this.closeIconContainerElement = _this.$(".close-icon-container");
    close_icon_1.default.create({
      container: _this.$(".close-icon-container"),
    });
    return _this;
  }
  CardContainer.prototype.constructElement = function () {
    var container = document.createElement("div");
    container.className = "card-container";
    container.innerHTML =
      '\n      <div class="close-icon-container"></div>\n    ';
    return container;
  };
  CardContainer.prototype.getStyleConfig = function () {
    return "\n      .card-container {\n        display: flex;\n        border-radius: 8px;\n        background: #FFFFFF;\n        border: 1px solid #888C94;\n        justify-content: center;\n        align-items: center;\n        flex-direction: column;\n        box-shadow: 0px 0px 8px rgba(0, 0, 0, 0.14);\n        animation: 0.5s appear;\n        width: 100%;\n      }\n    ";
  };
  return CardContainer;
})(base_1.default);
exports.default = CardContainer;
