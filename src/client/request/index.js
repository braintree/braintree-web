import once from "../../lib/once";
import driver from "./fetch";

export default function (options, cb) {
  cb = once(cb || Function.prototype);
  options.method = (options.method || "GET").toUpperCase();
  options.timeout = options.timeout == null ? 60000 : options.timeout;
  options.data = options.data || {};

  driver.request(options, cb);
}
