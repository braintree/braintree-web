"use strict";

var FrameService = require("./frame-service");

/**
 * @ignore
 * @function create
 * Initializing FrameService should be done at the point when the component is created, so it is ready whenever a component needs to open a popup window.
 * Browsers have varying rules around what constitutes and async action worth blocking a popup for, but the likes of Safari
 * will block the popup if `frameService#create` is invoked during any asynchronous process (such as an API request to tokenize payment details).
 *
 * The process of setting up the dispatch frame and subsequent framebus communications via event listeners are considered async by Safari's standards.
 *
 * @param {object} options The options provided to frameservice
 * @param {string} options.name The name to use for identifying the various pieces associated with frameservice.
 * @param {string} options.dispatchFrameUrl The static asset to load for use as the dispatch frame. This allows for secure communication between the iframe and the popup, since they are on the same asset domain (usually checkout.paypal.com or assets.braintreegateway.com)
 * @param {string} options.openFrameUrl The url to load in the popup. Sometimes it is the case that you'll need info that comes _after_ the popup loads in which case we load the `landing-frame` that's a loading spinner then redirect to the proper/final destination. See the PayPal component for an example.
 * Otherwise if all the info needed is ready up-front, then you can forego a landing frame and go straight to the final destination.
 * @param {string} [options.height] The desired popup height.
 * @param {string} [options.width] The desired popup width.
 * @param {string} [options.top] The desired top value of the popup for positioning.
 * @param {string} [options.left] The desired left value of the popup for positioning.
 * @param {object} [options.state] Seems to be dead code, but allows for injecting data in to popup. NEXT_MAJOR_VERSION remove this param if no usage exists.
 * @param {function} callback The function to invoke once the frameservice is created and ready to use. FrameService instance is returned.
 */
module.exports = {
  create: function createFrameService(options, callback) {
    var frameService = new FrameService(options);

    frameService.initialize(function () {
      callback(frameService);
    });
  },
};
