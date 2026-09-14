// @ts-nocheck
import Bus from "framebus";
import events from "../shared/events";

function start() {
  var serviceChannel = window.name.split("_")[1].split("?")[0];

  window.bus = new Bus({
    channel: serviceChannel,
    targetFrames: [window.parent],
  });

  window.bus.emit(events.DISPATCH_FRAME_READY);
}

export default {
  start,
};
