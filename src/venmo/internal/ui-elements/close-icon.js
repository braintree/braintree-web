"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var base_1 = __importDefault(require("./base"));
var CloseIcon = /** @class */ (function (_super) {
    __extends(CloseIcon, _super);
    function CloseIcon() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    CloseIcon.prototype.constructElement = function () {
        var container = document.createElement("button");
        container.className = "close-icon";
        container.setAttribute("aria-label", "Close Venmo QR code modal");
        container.innerHTML = "\n      <svg width=\"20\" height=\"20\" viewBox=\"0 0 20 20\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n        <path d=\"M0.949068 16.2226C0.168019 17.0036 0.168019 18.27 0.949068 19.051C1.73012 19.8321 2.99645 19.832 3.7775 19.051L10 12.8285L16.2226 19.051C17.0036 19.8321 18.27 19.8321 19.051 19.051C19.8321 18.27 19.832 17.0036 19.051 16.2226L12.8285 10L19.051 3.77749C19.8321 2.99645 19.8321 1.73012 19.051 0.949067C18.27 0.168019 17.0036 0.16802 16.2226 0.949068L10 7.17161L3.77749 0.949068C2.99645 0.16802 1.73012 0.16802 0.949067 0.949068C0.168019 1.73012 0.16802 2.99645 0.949068 3.7775L7.17161 10L0.949068 16.2226Z\" fill=\"#6B6E76\"/>\n      </svg>\n\n    ";
        return container;
    };
    CloseIcon.prototype.getStyleConfig = function () {
        return "\n      .close-icon {\n        cursor: pointer;\n        position: absolute;\n        top: 15px;\n        right: 15px;\n        z-index: 9999;\n      }\n\n      .close-icon svg {\n        top: 1px;\n        position: relative;\n      }\n    ";
    };
    return CloseIcon;
}(base_1.default));
exports.default = CloseIcon;
