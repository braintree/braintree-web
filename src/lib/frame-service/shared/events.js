import enumerate from "../../enumerate";

const events = enumerate(
  ["DISPATCH_FRAME_READY", "DISPATCH_FRAME_REPORT"],
  "frameService:"
);

export const { DISPATCH_FRAME_READY, DISPATCH_FRAME_REPORT } = events;

export default events;
