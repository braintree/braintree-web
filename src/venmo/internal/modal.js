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
var modal_backdrop_1 = __importDefault(require("./modal-backdrop"));
var Modal = /** @class */ (function (_super) {
  __extends(Modal, _super);
  function Modal() {
    return (_super !== null && _super.apply(this, arguments)) || this;
  }
  Modal.prototype.constructElement = function () {
    var _this = this;
    console.log("did call modal construct element");
    var modal = document.createElement("div");
    modal.id = "venmo-desktop-modal";
    console.log(modal);
    console.log("making modal backdrop");
    var backdrop = new modal_backdrop_1.default({
      container: document.body,
      onClick: function () {
        console.log("calling close");
        _this.close();
        console.log("called close");
      },
    });
    console.log("returning modal");
    return modal;
  };
  Modal.prototype.getStyleConfig = function () {
    return "";
  };
  Modal.prototype.close = function () {
    console.log("close");
  };
  return Modal;
})(ui_element_1.default);
exports.default = Modal;
