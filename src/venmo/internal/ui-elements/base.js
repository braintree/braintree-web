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
    var _this = this;
    add_styles_1.default(this.getStyleConfig());
    this.element = this.constructElement();
    if (options.onClick) {
      this.element.addEventListener("click", options.onClick);
    }
    if (options.onClose) {
      this.onClose = options.onClose;
    }
    if (options.children) {
      options.children.forEach(function (child) {
        _this.element.appendChild(child);
      });
    }
    options.container.appendChild(this.element);
  }
  UIElement.create = function (options) {
    return new this(options);
  };
  UIElement.prototype.$ = function (selector) {
    return this.element.querySelector(selector);
  };
  UIElement.prototype.close = function () {
    if (!this.onClose) {
      return;
    }
    this.onClose();
  };
  UIElement.prototype.getStyleConfig = function () {
    return "";
  };
  return UIElement;
})();
exports.default = UIElement;
