import constants from "./constants";
import useMin from "./use-min";

export default function composeUrl(frameName, assetsUrl, componentId, isDebug) {
  return (
    assetsUrl +
    "/web/" +
    constants.VERSION +
    "/html/" +
    frameName +
    useMin(isDebug) +
    ".html#" +
    componentId
  );
}
