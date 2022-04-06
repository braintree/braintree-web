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
var ui_element_1 = __importDefault(require("./ui-element"));
var ModalBackdrop = /** @class */ (function (_super) {
  __extends(ModalBackdrop, _super);
  function ModalBackdrop() {
    return (_super !== null && _super.apply(this, arguments)) || this;
  }
  ModalBackdrop.prototype.constructElement = function () {
    var backdrop = document.createElement("div");
    backdrop.id = "modal-backdrop";
    return backdrop;
  };
  ModalBackdrop.prototype.getStyleConfig = function () {
    return "\n  #modal-backdrop {\n    cursor: pointer;\n    position: absolute;\n    top: 0;\n    left: 0;\n    bottom: 0;\n    width: 100%;\n    background: rgba(0, 0, 0, 0.4);\n  }";
  };
  return ModalBackdrop;
})(ui_element_1.default);
exports.default = ModalBackdrop;
