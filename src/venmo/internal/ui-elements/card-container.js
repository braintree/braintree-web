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
var CardContainer = /** @class */ (function (_super) {
  __extends(CardContainer, _super);
  function CardContainer(options) {
    var _this = _super.call(this, options) || this;
    return _this;
  }
  CardContainer.prototype.constructElement = function () {
    var container = document.createElement("div");
    container.className = "card-container";
    return container;
  };
  CardContainer.prototype.getStyleConfig = function () {
    return [
      ".card-container {",
      "  display: flex;",
      "  border-radius: 8px;",
      "  background: #FFFFFF;",
      "  border: 1px solid #888C94;",
      "  justify-content: center;",
      "  align-items: center;",
      "  flex-direction: column;",
      "  box-shadow: 0px 0px 8px rgba(0, 0, 0, 0.14);",
      "  animation: 0.5s appear;",
      "  height: 382px;",
      "  width: 512px;",
      "}",
    ].join("\n");
  };
  return CardContainer;
})(base_1.default);
exports.default = CardContainer;
