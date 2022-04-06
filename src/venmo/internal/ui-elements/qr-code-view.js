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
var card_container_1 = __importDefault(require("./card-container"));
var VENMO_LOGO_SVG =
  '\n<svg width="108" height="21" viewBox="0 0 108 21" fill="none" xmlns="http://www.w3.org/2000/svg">\n  <path d="M11.7401 1.19083C12.1371 2.11703 12.4017 3.04323 12.4017 4.49869C12.4017 7.14498 10.5493 11.1144 8.96153 13.6284L7.24144 0.396943L0.493408 1.05852L3.66895 19.7148H11.4755C14.7834 15.2162 19.0174 8.86507 19.0174 3.96943C19.0174 2.38166 18.7528 1.19083 17.9589 0L11.7401 1.19083ZM36.6152 5.29258C36.6152 2.24935 34.3659 0 30.5288 0C23.3838 0 19.9436 6.21878 19.9436 12.0406C19.9436 16.5393 22.0607 20.1118 28.0148 20.1118C30.3965 20.1118 32.7781 19.5825 34.3659 18.921L35.1598 13.3638C32.9104 14.4223 31.3227 14.9515 29.4703 14.9515C27.8825 14.9515 26.6917 14.1576 26.6917 11.9083C30.3965 11.776 36.6152 10.1882 36.6152 5.29258ZM26.824 8.20349C26.9563 6.08646 28.6764 4.49869 29.8672 4.49869C30.5288 4.49869 31.1904 4.89563 31.1904 5.82183C31.1904 7.67424 28.0148 8.20349 26.824 8.20349ZM51.8314 0.132314C49.3174 0.132314 47.465 1.05852 46.1419 1.98472L46.0096 0.396943H40.1877L37.1445 19.7148H43.8925L46.0096 6.21878C46.5388 5.95415 47.465 5.5572 48.2589 5.5572C48.9205 5.42489 49.4497 5.68952 49.4497 6.61572C49.4497 7.01266 49.3174 7.67424 49.3174 7.93886L47.465 19.7148H54.0807L56.1978 6.74803C56.3301 6.08646 56.4624 5.02795 56.4624 4.36638C56.3301 1.8524 55.1393 0.132314 51.8314 0.132314ZM82.396 0.132314C79.8821 0.132314 78.162 0.926201 76.1772 2.24935C75.5157 1.05852 74.0602 0.132314 72.0755 0.132314C69.6938 0.132314 67.8414 1.05852 66.5183 2.11703L66.386 0.529258H60.6965L57.6532 19.8472H64.4013L66.5183 6.35109C67.0476 6.08646 67.9738 5.68952 68.7676 5.68952C69.4292 5.68952 69.9585 5.95415 69.9585 6.88035C69.9585 7.14498 69.8262 7.54192 69.8262 7.80655L67.9738 19.8472H74.5895L76.7065 6.35109C77.3681 6.08646 78.162 5.68952 78.9559 5.68952C79.6174 5.68952 80.1467 5.95415 80.1467 6.88035C80.1467 7.14498 80.0144 7.54192 80.0144 7.80655L78.162 19.8472H84.7777L86.7624 6.88035C86.8947 6.21878 87.027 5.16026 87.027 4.49869C86.8947 1.8524 85.7039 0.132314 82.396 0.132314ZM99.3323 0.132314C91.9227 0.132314 88.6148 5.82183 88.6148 11.9083C88.6148 16.5393 90.4672 20.2441 96.1567 20.2441C103.831 20.2441 107.007 14.0253 107.007 7.93886C107.007 3.30786 105.022 0.132314 99.3323 0.132314ZM97.0829 15.0838C95.8921 15.0838 95.3628 14.0253 95.3628 12.1729C95.3628 9.79127 95.8921 5.16026 98.5384 5.16026C99.7292 5.16026 100.126 6.21878 100.126 7.80655C100.126 10.1882 99.5969 15.0838 97.0829 15.0838Z" fill="#008CFF"/>\n</svg>\n';
var VENMO_FOOTER_SVG =
  '\n<svg width="68" height="46" viewBox="0 0 68 46" fill="none" xmlns="http://www.w3.org/2000/svg">\n  <circle cx="49" cy="25" r="18" fill="white" stroke="#888C94" stroke-width="2"/>\n  <path fill-rule="evenodd" clip-rule="evenodd" d="M56.7188 15.5H51.9688C50.985 15.5 50.1875 16.2975 50.1875 17.2812V22.0312C50.1875 23.015 50.985 23.8125 51.9688 23.8125H56.7188C57.7025 23.8125 58.5 23.015 58.5 22.0312V17.2812C58.5 16.2975 57.7025 15.5 56.7188 15.5ZM51.375 17.2812C51.375 16.9533 51.6408 16.6875 51.9688 16.6875H56.7188C57.0467 16.6875 57.3125 16.9533 57.3125 17.2812V22.0312C57.3125 22.3592 57.0467 22.625 56.7188 22.625H51.9688C51.6408 22.625 51.375 22.3592 51.375 22.0312V17.2812ZM41.875 18.5083C41.875 18.1585 42.1585 17.875 42.5083 17.875H44.8042C45.154 17.875 45.4375 18.1585 45.4375 18.5083V20.8042C45.4375 21.154 45.154 21.4375 44.8042 21.4375H42.5083C42.1585 21.4375 41.875 21.154 41.875 20.8042V18.5083ZM52.5625 18.5083C52.5625 18.1585 52.846 17.875 53.1958 17.875H55.4917C55.8415 17.875 56.125 18.1585 56.125 18.5083V20.8042C56.125 21.154 55.8415 21.4375 55.4917 21.4375H53.1958C52.846 21.4375 52.5625 21.154 52.5625 20.8042V18.5083ZM50.8208 26.1875C50.471 26.1875 50.1875 26.471 50.1875 26.8208V27.9292C50.1875 28.279 50.471 28.5625 50.8208 28.5625H51.9292C52.279 28.5625 52.5625 28.279 52.5625 27.9292V26.8208C52.5625 26.471 52.279 26.1875 51.9292 26.1875H50.8208ZM50.1875 32.7583C50.1875 32.4085 50.471 32.125 50.8208 32.125H51.9292C52.279 32.125 52.5625 32.4085 52.5625 32.7583V33.8667C52.5625 34.2165 52.279 34.5 51.9292 34.5H50.8208C50.471 34.5 50.1875 34.2165 50.1875 33.8667V32.7583ZM56.7583 26.1875C56.4085 26.1875 56.125 26.471 56.125 26.8208V27.9292C56.125 28.279 56.4085 28.5625 56.7583 28.5625H57.8667C58.2165 28.5625 58.5 28.279 58.5 27.9292V26.8208C58.5 26.471 58.2165 26.1875 57.8667 26.1875H56.7583ZM56.125 32.7583C56.125 32.4085 56.4085 32.125 56.7583 32.125H57.8667C58.2165 32.125 58.5 32.4085 58.5 32.7583V33.8667C58.5 34.2165 58.2165 34.5 57.8667 34.5H56.7583C56.4085 34.5 56.125 34.2165 56.125 33.8667V32.7583ZM53.7895 29.1562C53.4398 29.1562 53.1562 29.4398 53.1562 29.7895V30.898C53.1562 31.2477 53.4398 31.5312 53.7895 31.5312H54.898C55.2477 31.5312 55.5312 31.2477 55.5312 30.898V29.7895C55.5312 29.4398 55.2477 29.1562 54.898 29.1562H53.7895ZM41.875 29.1958C41.875 28.846 42.1585 28.5625 42.5083 28.5625H44.8042C45.154 28.5625 45.4375 28.846 45.4375 29.1958V31.4917C45.4375 31.8415 45.154 32.125 44.8042 32.125H42.5083C42.1585 32.125 41.875 31.8415 41.875 31.4917V29.1958ZM41.2812 26.1875H46.0312C47.015 26.1875 47.8125 26.985 47.8125 27.9688V32.7188C47.8125 33.7025 47.015 34.5 46.0312 34.5H41.2812C40.2975 34.5 39.5 33.7025 39.5 32.7188V27.9688C39.5 26.985 40.2975 26.1875 41.2812 26.1875ZM41.2812 27.375C40.9533 27.375 40.6875 27.6408 40.6875 27.9688V32.7188C40.6875 33.0467 40.9533 33.3125 41.2812 33.3125H46.0312C46.3592 33.3125 46.625 33.0467 46.625 32.7188V27.9688C46.625 27.6408 46.3592 27.375 46.0312 27.375H41.2812ZM41.2812 15.5H46.0312C47.015 15.5 47.8125 16.2975 47.8125 17.2812V22.0312C47.8125 23.015 47.015 23.8125 46.0312 23.8125H41.2812C40.2975 23.8125 39.5 23.015 39.5 22.0312V17.2812C39.5 16.2975 40.2975 15.5 41.2812 15.5ZM41.2812 16.6875C40.9533 16.6875 40.6875 16.9533 40.6875 17.2812V22.0312C40.6875 22.3592 40.9533 22.625 41.2812 22.625H46.0312C46.3592 22.625 46.625 22.3592 46.625 22.0312V17.2812C46.625 16.9533 46.3592 16.6875 46.0312 16.6875H41.2812Z" fill="#2F3033"/>\n  <rect x="11.5" y="6.8999" width="20.7" height="29.9" fill="white"/>\n  <path fill-rule="evenodd" clip-rule="evenodd" d="M30.82 2.2998H12.88C10.8475 2.2998 9.19995 3.98283 9.19995 6.05894V42.2407C9.19995 44.3168 10.8475 45.9998 12.88 45.9998H30.82C32.8524 45.9998 34.5 44.3168 34.5 42.2407V6.05894C34.5 3.98283 32.8524 2.2998 30.82 2.2998ZM21.8499 42.6635C20.8337 42.6635 20.0099 41.822 20.0099 40.784C20.0099 39.7459 20.8337 38.9044 21.8499 38.9044C22.8661 38.9044 23.6899 39.7459 23.6899 40.784C23.6899 41.822 22.8661 42.6635 21.8499 42.6635ZM11.9599 36.414H31.7399V7.32767H11.9599V36.414Z" fill="#888C94"/>\n</svg>\n';
var QRCodeView = /** @class */ (function (_super) {
  __extends(QRCodeView, _super);
  function QRCodeView(options) {
    var _this = _super.call(this, options) || this;
    _this.qrCodePlaceholder = _this.$(
      "#venmo-qr-code-view__code-container-placeholder"
    );
    _this.qrCodeContainer = _this.$(
      "#venmo-qr-code-view__code-container-qr-code"
    );
    return _this;
  }
  QRCodeView.prototype.makeActive = function (isActive) {
    if (isActive) {
      this.element.classList.add("active");
    } else {
      this.element.classList.remove("active");
    }
  };
  QRCodeView.prototype.reset = function () {
    this.qrCodePlaceholder.classList.remove("hidden");
    this.qrCodeContainer.innerHTML = "";
    this.qrCodeContainer.classList.add("hidden");
  };
  QRCodeView.prototype.generateQRCode = function (url, cb) {
    var _this = this;
    if (this.isNotValidDomain(url)) {
      cb(new Error("Invalid domain"));
      return;
    }
    this.qrCodeContainer.innerHTML = "";
    var canvas = document.createElement("canvas");
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    window.QRCode.toCanvas(
      canvas,
      url,
      {
        width: 164,
        color: {
          dark: "#008CFF",
        },
      },
      function (error) {
        if (error) {
          cb(error);
          return;
        }
        _this.qrCodePlaceholder.classList.add("hidden");
        _this.qrCodeContainer.appendChild(canvas);
        _this.qrCodeContainer.classList.remove("hidden");
        cb();
      }
    );
  };
  QRCodeView.prototype.isNotValidDomain = function (url) {
    return url.indexOf("https://venmo.com") !== 0;
  };
  QRCodeView.prototype.constructElement = function () {
    var container = document.createElement("div");
    container.id = "venmo-qr-code-view";
    var footer = document.createElement("div");
    var header = document.createElement("div");
    header.id = "venmo-qr-code-view__header";
    header.innerHTML =
      '\n        <div id="close-icon-container"></div>\n        <div id="venmo-qr-code-view__code-container" width="164" height="164">\n          <div id="venmo-qr-code-view__code-container-placeholder">\n            <div id="venmo-qr-code-view__code-container-placeholder-shimmer"></div>\n          </div>\n          <div id="venmo-qr-code-view__code-container-qr-code" class="hidden"></div>\n        </div>\n        <div id="venmo-qr-code-view__name-logo">\n          ' +
      VENMO_LOGO_SVG +
      "\n        </div>\n      </div>\n    ";
    footer.id = "venmo-qr-code-view__footer";
    footer.innerHTML =
      '\n          <div id="venmo-qr-code-view__footer__icon">\n            ' +
      VENMO_FOOTER_SVG +
      '\n          </div>\n          <div id="venmo-qr-code-view__footer__text">To scan the QR code, open your Venmo app</div>\n    ';
    container.classList.add("active");
    card_container_1.default.create({
      container: container,
      children: [header, footer],
    });
    return container;
  };
  QRCodeView.prototype.getStyleConfig = function () {
    return "\n      #venmo-qr-code-view {\n        display: none;\n      }\n\n      #venmo-qr-code-view.active {\n        display: flex;\n      }\n\n      #venmo-qr-code-view__header {\n        flex-grow: 1;\n        display: flex;\n        justify-content: center;\n        align-items: center;\n        flex-direction: column;\n        margin: 25px 0 10px;\n      }\n\n      #venmo-qr-code-view__code-container {\n        width: 164px;\n        height: 164px;\n        display: flex;\n        align-items: center;\n        justify-content: center;\n      }\n\n      #venmo-qr-code-view__code-container-placeholder {\n        background: rgb(213, 211, 213);\n        height: 132px;\n        width: 132px;\n        overflow: hidden;\n      }\n\n      #venmo-qr-code-view__code-container-placeholder.hidden {\n        display: none;\n      }\n\n      #venmo-qr-code-view__code-container-qr-code {\n        animation: 1s appear;\n      }\n\n      #venmo-qr-code-view__code-container-qr-code.hidden {\n        display: none;\n      }\n\n      #venmo-qr-code-view__code-container-placeholder-shimmer {\n        background: rgb(216, 215, 216);\n        width: 300px;\n        height: 50px;\n        transform: rotate(-45deg);\n        position: relative;\n        animation: 1.5s shimmer infinite;\n        top: 1000px;\n        left: 50px;\n      }\n\n      #venmo-qr-code-view__name-logo {\n        display: flex;\n        height: 30px;\n        align-items: center;\n      }\n\n      #venmo-qr-code-view__footer {\n        background: rgba(136, 140, 148, 0.11);\n        display: flex;\n        align-items: center;\n      }\n\n      #venmo-qr-code-view__footer__icon {\n        padding: 14px;\n        padding-right: 0;\n      }\n\n      #venmo-qr-code-view__footer__text {\n        padding: 14px;\n        font-size: 12px;\n        line-height: 16px;\n        color: #2F3033;\n      }\n\n      @keyframes shimmer {\n        from {\n          top: -80px;\n          left: -60px;\n        }\n      }\n    ";
  };
  return QRCodeView;
})(base_1.default);
exports.default = QRCodeView;
