function isHTTPS(protocol) {
  protocol = protocol || window.location.protocol;

  return protocol === "https:";
}

export { isHTTPS };

export default {
  isHTTPS,
};
