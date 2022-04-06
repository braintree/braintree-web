"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
var add_styles_1 = __importDefault(require("./add-styles"));
var UIElement = /** @class */ (function () {
  function UIElement(options) {
    add_styles_1.default(this.getStyleConfig());
    this.element = this.constructElement();
    if (options.onClick) {
      this.element.addEventListener("click", options.onClick);
    }
    console.log("about to append", this.element);
    options.container.appendChild(this.element);
    console.log("did append", this.element);
  }
  return UIElement;
})();
exports.default = UIElement;
