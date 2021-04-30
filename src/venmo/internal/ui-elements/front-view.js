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
var qr_code_view_1 = __importDefault(require("./qr-code-view"));
var error_view_1 = __importDefault(require("./error-view"));
var FrontView = /** @class */ (function (_super) {
    __extends(FrontView, _super);
    function FrontView(options) {
        var _this = _super.call(this, options) || this;
        _this.errorView = error_view_1.default.create({
            container: _this.element,
            onClick: function () {
                _this.displayQRCodeView();
                if (options.onRequestNewQrCode) {
                    options.onRequestNewQrCode();
                }
            },
        });
        _this.qrCodeView = qr_code_view_1.default.create({
            container: _this.element,
        });
        return _this;
    }
    FrontView.prototype.generateQRCode = function (url, cb) {
        return this.qrCodeView.generateQRCode(url, cb);
    };
    FrontView.prototype.displayError = function (message) {
        this.errorView.setErrorMessage(message);
        this.qrCodeView.makeActive(false);
        this.errorView.makeActive(true);
    };
    FrontView.prototype.displayQRCodeView = function () {
        this.qrCodeView.makeActive(true);
        this.errorView.makeActive(false);
    };
    FrontView.prototype.reset = function () {
        this.qrCodeView.reset();
        this.errorView.reset();
        this.displayQRCodeView();
    };
    FrontView.prototype.constructElement = function () {
        var container = document.createElement("div");
        container.id = "front-view";
        container.className = "view-box";
        return container;
    };
    FrontView.prototype.getStyleConfig = function () {
        return "\n      #front-view {\n        z-index: 2;\n        transform: rotateY(0deg);\n      }\n\n      #view-boxes.is-flipped #front-view {\n        transform: rotateY(180deg);\n        position: absolute;\n      }\n    ";
    };
    return FrontView;
}(base_1.default));
exports.default = FrontView;
