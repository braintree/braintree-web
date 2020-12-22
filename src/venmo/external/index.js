"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var venmo_desktop_1 = __importDefault(require("./venmo-desktop"));
module.exports = function createVenmoDesktop(options) {
    var instance = new venmo_desktop_1.default(options);
    return instance.initialize();
};
