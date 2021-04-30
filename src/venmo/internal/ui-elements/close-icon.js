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
        container.id = "close-icon";
        container.setAttribute("aria-label", "Close Venmo QR code modal");
        container.innerHTML = "\n      <svg width=\"20\" height=\"20\" viewBox=\"0 0 20 20\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n        <path d=\"M0.949007 16.2225C0.167958 17.0036 0.167958 18.2699 0.949007 19.051C1.73006 19.832 2.99639 19.832 3.77744 19.051L9.99997 12.8284L16.2225 19.051C17.0036 19.832 18.2699 19.832 19.051 19.051C19.832 18.2699 19.832 17.0036 19.051 16.2225L12.8284 10L19.051 3.7775C19.832 2.99645 19.832 1.73012 19.051 0.949067C18.2699 0.168018 17.0036 0.16802 16.2225 0.949068L9.99997 7.17161L3.77743 0.949068C2.99639 0.16802 1.73006 0.16802 0.949007 0.949068C0.167958 1.73012 0.167959 2.99645 0.949008 3.7775L7.17155 10L0.949007 16.2225Z\" fill=\"#2F3033\"/>\n        <mask id=\"mask0\" mask-type=\"alpha\" maskUnits=\"userSpaceOnUse\" x=\"0\" y=\"0\" width=\"20\" height=\"20\">\n        <path d=\"M0.949007 16.2225C0.167958 17.0036 0.167958 18.2699 0.949007 19.051C1.73006 19.832 2.99639 19.832 3.77744 19.051L9.99997 12.8284L16.2225 19.051C17.0036 19.832 18.2699 19.832 19.051 19.051C19.832 18.2699 19.832 17.0036 19.051 16.2225L12.8284 10L19.051 3.7775C19.832 2.99645 19.832 1.73012 19.051 0.949067C18.2699 0.168018 17.0036 0.16802 16.2225 0.949068L9.99997 7.17161L3.77743 0.949068C2.99639 0.16802 1.73006 0.16802 0.949007 0.949068C0.167958 1.73012 0.167959 2.99645 0.949008 3.7775L7.17155 10L0.949007 16.2225Z\" fill=\"white\"/>\n        </mask>\n        <g mask=\"url(#mask0)\">\n        <rect width=\"20\" height=\"20\" fill=\"white\"/>\n        </g>\n      </svg>\n    ";
        return container;
    };
    CloseIcon.prototype.getStyleConfig = function () {
        return "\n      #close-icon {\n        cursor: pointer;\n        position: absolute;\n        top: 20px;\n        right: 20px;\n        z-index: 9999;\n      }\n    ";
    };
    return CloseIcon;
}(base_1.default));
exports.default = CloseIcon;
