var assignNormalized =
  typeof Object.assign === "function" ? Object.assign : assignPolyfill;

function assignPolyfill(destination) {
  var i, source, key;

  for (i = 1; i < arguments.length; i++) {
    source = arguments[i];
    for (key in source) {
      if (source.hasOwnProperty(key)) {
        destination[key] = source[key];
      }
    }
  }

  return destination;
}

export const assign = assignNormalized;
export const _assign = assignPolyfill;

export default { assign: assignNormalized, _assign: assignPolyfill };
