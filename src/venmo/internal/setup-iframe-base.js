"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
var add_styles_1 = __importDefault(require("./ui-elements/add-styles"));
var BODY_STYLES =
  "\n* {\n  margin: 0;\n  padding: 0;\n  -webkit-box-sizing: border-box;\n  -moz-box-sizing: border-box;\n  box-sizing: border-box;\n  border: none;\n  background-color: transparent;\n}\n\nbody {\n  position: absolute;\n  top: 0;\n  left: 0;\n  bottom: 0;\n  width: 100%;\n  animation: 0.5s appear;\n}\n\n/* Global Animations */\n@keyframes appear {\n  from {\n    opacity: 0;\n  }\n}\n\n@keyframes drop {\n  from {\n    top: -5%;\n  }\n}\n";
function setupIframeBase() {
  add_styles_1.default(BODY_STYLES);
}
exports.default = setupIframeBase;
