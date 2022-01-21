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
        this.resetViews();
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
        this.backView.reset();
    };
    Modal.prototype.constructElement = function () {
        var _this = this;
        var modal = document.createElement("div");
        modal.id = "venmo-desktop-modal";
        modal.innerHTML = "\n    <div id=\"close-icon-container\"></div>\n    <div id=\"outer-container\">\n      <div id=\"view-boxes\">\n        <div id=\"view-boxes-container\">\n        </div>\n      </div>\n    </div>\n    ";
        modal_backdrop_1.default.create({
            container: document.body,
            onClick: function () {
                _this.close();
            },
        });
        modal.addEventListener("click", function () {
            _this.close();
        });
        window.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                _this.close();
            }
        });
        return modal;
    };
    Modal.prototype.getStyleConfig = function () {
        return "\n      #venmo-desktop-modal {\n        display: flex;\n        align-items: center;\n        justify-content: center;\n        height: 100vh;\n      }\n\n      #close-icon-container.hidden {\n        display: none;\n      }\n\n      #outer-container {\n        position: absolute;\n        top: 0;\n        bottom: 0;\n        width: 100%;\n        perspective: 840px;\n        animation: 1s drop;\n      }\n\n      #outer-container.hidden {\n        display: none;\n      }\n\n      #view-boxes {\n        display: flex;\n        align-items: center;\n        justify-content: center;\n        height: 100%;\n        width: 100%;\n        perspective: 1000;\n        transition: transform 1s;\n        transform-style: preserve-3d;\n      }\n\n      #view-boxes-container {\n        display: flex;\n        align-items: center;\n        justify-content: center;\n        height: 100%;\n        width: 100%;\n        font-family: sans-serif;\n        font-style: normal;\n        font-weight: 100;\n        perspective: 1000;\n      }\n\n      .view-box {\n        display: flex;\n        max-width: 95%;\n        width: 280px;\n        height: 321px;\n        -webkit-backface-visibility: hidden; /* Safari */\n        backface-visibility: hidden;\n        transition: transform 1s;\n        transform-style: preserve-3d;\n      }\n    ";
    };
    return Modal;
}(base_1.default));
exports.default = Modal;
