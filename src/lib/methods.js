export default function (obj) {
  return Object.keys(obj).filter(function (key) {
    return typeof obj[key] === "function";
  });
}
