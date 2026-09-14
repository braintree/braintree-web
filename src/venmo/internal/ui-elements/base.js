// @ts-nocheck
import addStyles from "./add-styles";
var UIElement = /** @class */ (function () {
  function UIElement(options) {
    var _this = this;
    addStyles(this.getStyleConfig());
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
export default UIElement;
