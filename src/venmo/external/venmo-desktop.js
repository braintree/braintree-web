"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var framebus_1 = __importDefault(require("framebus"));
var iframer_1 = __importDefault(require("@braintree/iframer"));
var uuid_1 = __importDefault(require("@braintree/uuid"));
var events_1 = require("../shared/events");
var queries_1 = require("./queries");
var VENMO_DESKTOP_POLLING_INTERVAL = 1000; // 1 second
var VISUAL_DELAY_BEFORE_SIGNALLING_COMPLETION = 2000; // 2 seconds
var VenmoDesktop = /** @class */ (function () {
    function VenmoDesktop(options) {
        this.isHidden = true;
        this.env = options.environment;
        this.id = uuid_1.default();
        this.profileId = options.profileId;
        this.displayName = options.displayName;
        this.paymentMethodUsage = options.paymentMethodUsage;
        this.shouldUseLegacyQRCodeMutation = !this.paymentMethodUsage;
        var frameUrl = options.url + "#" + this.env + "_" + this.id;
        this.bus = new framebus_1.default({
            channel: this.id,
            verifyDomain: options.verifyDomain,
        });
        this.apiRequest = options.apiRequest;
        this.sendEvent = options.sendEvent;
        this.Promise = options.Promise;
        this.alertBox = document.createElement("div");
        this.alertBox.setAttribute("data-venmo-desktop-id", this.id);
        this.alertBox.setAttribute("role", "alert");
        this.alertBox.style.position = "fixed";
        this.alertBox.style.display = "none";
        this.alertBox.style.height = "1px";
        this.alertBox.style.width = "1px";
        this.alertBox.style.overflow = "hidden";
        this.alertBox.style.zIndex = "0";
        this.iframe = iframer_1.default({
            src: frameUrl,
            name: "venmo-desktop-iframe",
            style: {
                display: "none",
                position: "fixed",
                top: "0",
                bottom: "0",
                right: "0",
                left: "0",
                height: "100%",
                width: "100%",
                zIndex: "9999999",
            },
            title: "Venmo Desktop",
        });
    }
    VenmoDesktop.prototype.initialize = function () {
        var _this = this;
        return new this.Promise(function (resolve) {
            _this.bus.on(events_1.VENMO_DESKTOP_IFRAME_READY, function () {
                resolve(_this);
            });
            _this.bus.on(events_1.VENMO_DESKTOP_REQUEST_NEW_QR_CODE, function () {
                _this.sendEvent("venmo.tokenize.desktop.restarted-from-error-view");
                _this.startPolling();
            });
            document.body.appendChild(_this.iframe);
            document.body.appendChild(_this.alertBox);
        });
    };
    VenmoDesktop.prototype.launchDesktopFlow = function () {
        var _this = this;
        this.isHidden = false;
        var promise = new this.Promise(function (resolve, reject) {
            _this.launchDesktopPromiseRejectFunction = reject;
            var removeListeners = function () {
                /* eslint-disable @typescript-eslint/no-use-before-define */
                _this.bus.off(events_1.VENMO_DESKTOP_CUSTOMER_CANCELED, customerCancelledHandler);
                _this.bus.off(events_1.VENMO_DESKTOP_AUTHORIZATION_COMPLETED, completedHandler);
                _this.bus.off(events_1.VENMO_DESKTOP_UNKNOWN_ERROR, unknownErrorHandler);
                /* eslint-enable @typescript-eslint/no-use-before-define */
            };
            var unknownErrorHandler = function (err) {
                removeListeners();
                _this.sendEvent("venmo.tokenize.desktop.unknown-error");
                reject({
                    allowUIToHandleError: false,
                    reason: "UNKNOWN_ERROR",
                    err: err,
                });
            };
            var customerCancelledHandler = function () {
                removeListeners();
                _this.updateVenmoDesktopPaymentContext("CANCELED");
                _this.sendEvent("venmo.tokenize.desktop.status-change.canceled-from-modal");
                reject({
                    allowUIToHandleError: false,
                    reason: "CUSTOMER_CANCELED",
                });
            };
            var completedHandler = function (payload) {
                removeListeners();
                resolve(payload);
            };
            _this.bus.on(events_1.VENMO_DESKTOP_CUSTOMER_CANCELED, customerCancelledHandler);
            _this.bus.on(events_1.VENMO_DESKTOP_AUTHORIZATION_COMPLETED, completedHandler);
            _this.bus.on(events_1.VENMO_DESKTOP_UNKNOWN_ERROR, unknownErrorHandler);
        });
        this.iframe.style.display = "block";
        this.setAlert("Generating a QR code, get your Venmo app ready");
        this.iframe.focus();
        this.startPolling();
        return promise
            .then(function (result) {
            delete _this.venmoContextId;
            delete _this.launchDesktopPromiseRejectFunction;
            return result;
        })
            .catch(function (err) {
            delete _this.venmoContextId;
            delete _this.launchDesktopPromiseRejectFunction;
            return _this.Promise.reject(err);
        });
    };
    VenmoDesktop.prototype.triggerCompleted = function (result) {
        var _this = this;
        if (this.isHidden) {
            return;
        }
        setTimeout(function () {
            _this.bus.emit(events_1.VENMO_DESKTOP_AUTHORIZATION_COMPLETED, result);
        }, VISUAL_DELAY_BEFORE_SIGNALLING_COMPLETION);
    };
    VenmoDesktop.prototype.triggerRejected = function (err) {
        if (this.launchDesktopPromiseRejectFunction) {
            this.launchDesktopPromiseRejectFunction(err);
        }
    };
    VenmoDesktop.prototype.hideDesktopFlow = function () {
        this.setAlert("");
        this.iframe.style.display = "none";
        this.bus.emit(events_1.VENMO_DESKTOP_CLOSED_FROM_PARENT);
        this.isHidden = true;
    };
    VenmoDesktop.prototype.displayError = function (message) {
        if (this.isHidden) {
            return;
        }
        this.bus.emit(events_1.VENMO_DESKTOP_DISPLAY_ERROR, {
            message: message,
        });
        this.setAlert(message);
    };
    VenmoDesktop.prototype.displayQRCode = function (id, merchantId) {
        if (this.isHidden) {
            return;
        }
        this.bus.emit(events_1.VENMO_DESKTOP_DISPLAY_QR_CODE, {
            id: id,
            merchantId: merchantId,
        });
        this.setAlert("To scan the QR code, open your Venmo app");
    };
    VenmoDesktop.prototype.authorize = function () {
        if (this.isHidden) {
            return;
        }
        this.bus.emit(events_1.VENMO_DESKTOP_AUTHORIZE);
        this.setAlert("Venmo account authorized");
    };
    VenmoDesktop.prototype.authorizing = function () {
        if (this.isHidden) {
            return;
        }
        this.bus.emit(events_1.VENMO_DESKTOP_AUTHORIZING);
        this.setAlert("Authorize on your Venmo app");
    };
    VenmoDesktop.prototype.startPolling = function () {
        var _this = this;
        return this.createVenmoDesktopPaymentContext()
            .then(function (result) {
            var expiresIn = new Date(result.expiresAt).getTime() -
                new Date(result.createdAt).getTime();
            var expiredTime = Date.now() + expiresIn;
            _this.displayQRCode(result.id, result.merchantId);
            return _this.pollForStatusChange(result.status, expiredTime);
        })
            .then(function (result) {
            if (!result) {
                return;
            }
            // since we are manually adding a prepended @ sign
            // we want to make sure that the username does not
            // start giving us the @ sign up front in the future
            var username = result.userName || "";
            username = "@" + username.replace("@", "");
            _this.triggerCompleted({
                paymentMethodNonce: result.paymentMethodId,
                username: username,
            });
        })
            .catch(function (err) {
            if (err.allowUIToHandleError) {
                // noop here and let the UI handle the customer error
                return;
            }
            _this.sendEvent("venmo.tokenize.desktop.unhandled-error");
            _this.triggerRejected(err);
        });
    };
    VenmoDesktop.prototype.pollForStatusChange = function (status, expiredTime) {
        var _this = this;
        if (!this.venmoContextId) {
            return this.Promise.resolve();
        }
        if (Date.now() > expiredTime) {
            return this.updateVenmoDesktopPaymentContext("EXPIRED").then(function () {
                _this.displayError("Something went wrong");
                _this.sendEvent("venmo.tokenize.desktop.status-change.sdk-timeout");
                return _this.Promise.reject({
                    allowUIToHandleError: true,
                    reason: "TIMEOUT",
                });
            });
        }
        return this.lookupVenmoDesktopPaymentContext().then(function (response) {
            if (!_this.venmoContextId || !response) {
                return _this.Promise.resolve();
            }
            var newStatus = response.status;
            if (newStatus !== status) {
                status = newStatus;
                _this.sendEvent("venmo.tokenize.desktop.status-change." + status.toLowerCase());
                switch (status) {
                    case "CREATED":
                        // noop, no need to do anything here
                        // should never be able to get to this point
                        // but we'll keep it in to enumerate the statuses
                        break;
                    case "EXPIRED":
                    case "FAILED":
                    case "CANCELED":
                        var message = status === "CANCELED"
                            ? "The authorization was canceled"
                            : "Something went wrong";
                        _this.displayError(message);
                        // these are all terminal states, so we end it here
                        return _this.Promise.reject({
                            allowUIToHandleError: true,
                            reason: status,
                        });
                    case "SCANNED":
                        _this.authorizing();
                        break;
                    case "APPROVED":
                        _this.authorize();
                        return _this.Promise.resolve(response);
                    default:
                    // any other statuses are irrelevant to the polling
                    // and can just be ignored
                }
            }
            return new _this.Promise(function (resolve, reject) {
                setTimeout(function () {
                    _this.pollForStatusChange(status, expiredTime)
                        .then(resolve)
                        .catch(reject);
                }, VENMO_DESKTOP_POLLING_INTERVAL);
            });
        });
    };
    VenmoDesktop.prototype.teardown = function () {
        this.bus.teardown();
        if (this.iframe.parentNode) {
            this.iframe.parentNode.removeChild(this.iframe);
        }
        if (this.alertBox.parentNode) {
            this.alertBox.parentNode.removeChild(this.alertBox);
        }
    };
    VenmoDesktop.prototype.setAlert = function (message) {
        this.alertBox.style.display = message ? "block" : "none";
        this.alertBox.textContent = message;
    };
    VenmoDesktop.prototype.createPaymentContextFromGraphqlLegacyQRCodeMutation = function (intent) {
        return this.apiRequest(queries_1.LEGACY_CREATE_PAYMENT_CONTEXT_QUERY, {
            input: {
                environment: this.env,
                intent: intent,
            },
        }).then(function (response) {
            return response.createVenmoQRCodePaymentContext
                .venmoQRCodePaymentContext;
        });
    };
    VenmoDesktop.prototype.createPaymentContextFromGraphQL = function (intent) {
        var input = {
            intent: intent,
            paymentMethodUsage: this.paymentMethodUsage,
            customerClient: "DESKTOP",
        };
        if (this.profileId) {
            input.merchantProfileId = this.profileId;
        }
        if (this.displayName) {
            input.displayName = this.displayName;
        }
        return this.apiRequest(queries_1.CREATE_PAYMENT_CONTEXT_QUERY, {
            input: input,
        }).then(function (response) {
            return response.createVenmoPaymentContext
                .venmoPaymentContext;
        });
    };
    VenmoDesktop.prototype.createVenmoDesktopPaymentContext = function () {
        var _this = this;
        var contextPromise = this.shouldUseLegacyQRCodeMutation
            ? this.createPaymentContextFromGraphqlLegacyQRCodeMutation("PAY_FROM_APP")
            : this.createPaymentContextFromGraphQL("PAY_FROM_APP");
        return contextPromise.then(function (context) {
            _this.venmoContextId = context.id;
            var merchantId = _this.profileId || context.merchantId;
            return {
                id: context.id,
                status: context.status,
                merchantId: merchantId,
                createdAt: context.createdAt,
                expiresAt: context.expiresAt,
            };
        });
    };
    VenmoDesktop.prototype.updateVenmoDesktopPaymentContext = function (status, additionalOptions) {
        if (additionalOptions === void 0) { additionalOptions = {}; }
        if (!this.venmoContextId) {
            return this.Promise.resolve();
        }
        var data = {
            input: __assign({ id: this.venmoContextId, status: status }, additionalOptions),
        };
        var query = this.shouldUseLegacyQRCodeMutation
            ? queries_1.LEGACY_UPDATE_PAYMENT_CONTEXT_QUERY
            : queries_1.UPDATE_PAYMENT_CONTEXT_QUERY;
        return this.apiRequest(query, data).then(function () {
            // noop so we can resolve without any data to match the type
        });
    };
    VenmoDesktop.prototype.lookupVenmoDesktopPaymentContext = function () {
        if (!this.venmoContextId) {
            return this.Promise.resolve();
        }
        var query = this.shouldUseLegacyQRCodeMutation
            ? queries_1.LEGACY_VENMO_PAYMENT_CONTEXT_STATUS_QUERY
            : queries_1.VENMO_PAYMENT_CONTEXT_STATUS_QUERY;
        return this.apiRequest(query, {
            id: this.venmoContextId,
        }).then(function (response) {
            return response.node;
        });
    };
    return VenmoDesktop;
}());
exports.default = VenmoDesktop;
