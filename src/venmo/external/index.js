// @ts-nocheck
import VenmoDesktop from "./venmo-desktop";

export default function createVenmoDesktop(options) {
  var instance = new VenmoDesktop(options);

  return instance.initialize();
}
