export default vi.fn().mockImplementation(function (options) {
  var iframe = document.createElement("iframe");
  var opts = options || {};

  Object.keys(opts).forEach(function (key) {
    if (key === "style") {
      return;
    }
    if (opts[key] != null) {
      iframe.setAttribute(key, opts[key]);
    }
  });

  if (!iframe.getAttribute("id") && iframe.getAttribute("name")) {
    iframe.id = iframe.getAttribute("name");
  }

  return iframe;
});
