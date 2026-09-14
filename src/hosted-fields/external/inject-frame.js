import focusIntercept from "../shared/focus-intercept";
import { navigationDirections as directions } from "../shared/constants";

export default function injectFrame(id, frame, container, focusHandler) {
  var frameType = frame.getAttribute("type");
  var clearboth = document.createElement("div");
  var fragment = document.createDocumentFragment();
  var focusInterceptBefore = focusIntercept.generate(
    id,
    frameType,
    directions.BACK,
    focusHandler
  );
  var focusInterceptAfter = focusIntercept.generate(
    id,
    frameType,
    directions.FORWARD,
    focusHandler
  );

  clearboth.style.clear = "both";

  fragment.appendChild(focusInterceptBefore);
  fragment.appendChild(frame);
  fragment.appendChild(focusInterceptAfter);
  fragment.appendChild(clearboth);

  container.appendChild(fragment);

  return [frame, clearboth];
}
