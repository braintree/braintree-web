// @ts-nocheck
import SongbirdFramework from "./songbird";
import BraintreeError from "../../../lib/braintree-error";
import errors from "../../shared/errors";
import enumerate from "../../../lib/enumerate";

function InlineIframeFramework(options) {
  SongbirdFramework.call(this, options);
}

InlineIframeFramework.prototype = Object.create(SongbirdFramework.prototype, {
  constructor: SongbirdFramework,
});

InlineIframeFramework.events = enumerate(
  ["AUTHENTICATION_IFRAME_AVAILABLE"],
  "inline-iframe-framework:"
);

InlineIframeFramework.prototype.setUpEventListeners = function (reply) {
  SongbirdFramework.prototype.setUpEventListeners.call(this, reply);

  this.on(
    InlineIframeFramework.events.AUTHENTICATION_IFRAME_AVAILABLE,
    function (payload) {
      reply("authentication-iframe-available", payload);
    }
  );
};

InlineIframeFramework.prototype._createCardinalConfigurationOptions = function (
  setupOptions
) {
  var options =
    SongbirdFramework.prototype._createCardinalConfigurationOptions.call(
      this,
      setupOptions
    );

  options.payment.framework = "inline";

  return options;
};

InlineIframeFramework.prototype._setupFrameworkSpecificListeners = function () {
  this.setCardinalListener("ui.inline.setup", this._onInlineSetup.bind(this));
};

InlineIframeFramework.prototype._onInlineSetup = function (
  htmlTemplate,
  details,
  resolve,
  reject
) {
  var container, hasError;

  if (!htmlTemplate || !details) {
    hasError = true;
  } else if (details.paymentType !== "CCA") {
    hasError = true;
  } else if (
    !(details.data.mode === "suppress" || details.data.mode === "static")
  ) {
    hasError = true;
  }

  if (hasError) {
    reject(new BraintreeError(errors.THREEDS_INLINE_IFRAME_DETAILS_INCORRECT));

    return;
  }

  container = document.createElement("div");
  container.innerHTML = htmlTemplate;

  if (details.data.mode === "suppress") {
    container.style.display = "none";
    document.body.appendChild(container);
    resolve();
  } else if (details.data.mode === "static") {
    this.emit(InlineIframeFramework.events.AUTHENTICATION_IFRAME_AVAILABLE, {
      element: container,
      next: function () {
        resolve();
      },
    });
  }
};

export default InlineIframeFramework;
