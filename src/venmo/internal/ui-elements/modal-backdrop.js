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
var close_icon_1 = __importDefault(require("./close-icon"));
var ModalBackdrop = /** @class */ (function (_super) {
  __extends(ModalBackdrop, _super);
  function ModalBackdrop(options) {
    var _this = _super.call(this, options) || this;
    close_icon_1.default.create({
      container: _this.$(".close-icon-container"),
      onClick: function () {
        _this.close();
      },
    });
    return _this;
  }
  ModalBackdrop.prototype.constructElement = function () {
    var backdrop = document.createElement("div");
    backdrop.id = "modal-backdrop";
    backdrop.innerHTML = '<div class="close-icon-container"></div>';
    return backdrop;
  };
  ModalBackdrop.prototype.getStyleConfig = function () {
    return [
      "#modal-backdrop {",
      "  position: absolute;",
      "  top: 0;",
      "  left: 0;",
      "  bottom: 0;",
      "  width: 100%;",
      "  background: rgba(0, 0, 0, 0.4);",
      "}",
      ".close-icon-container {",
      "  display: flex;",
      "  justify-content: flex-end;",
      "  padding: 24px;",
      "}",
    ].join("\n");
  };
  return ModalBackdrop;
})(base_1.default);
exports.default = ModalBackdrop;
