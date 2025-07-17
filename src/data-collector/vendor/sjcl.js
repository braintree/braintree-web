/* eslint-disable */
// prettier-ignore-file
"use strict";
var sjcl = {
  cipher: {},
  hash: {},
  keyexchange: {},
  mode: {},
  misc: {},
  codec: {},
  exception: {
    corrupt: function (a) {
      this.toString = function () {
        return "CORRUPT: " + this.message;
      };
      this.message = a;
    },
    invalid: function (a) {
      this.toString = function () {
        return "INVALID: " + this.message;
      };
      this.message = a;
    },
    bug: function (a) {
      this.toString = function () {
        return "BUG: " + this.message;
      };
      this.message = a;
    },
    notReady: function (a) {
      this.toString = function () {
        return "NOT READY: " + this.message;
      };
      this.message = a;
    },
  },
};
sjcl.cipher.aes = function (a) {
  this.l[0][0][0] || this.G();
  var b,
    c,
    d,
    e,
    f = this.l[0][4],
    g = this.l[1];
  b = a.length;
  var k = 1;
  if (4 !== b && 6 !== b && 8 !== b)
    throw new sjcl.exception.invalid("invalid aes key size");
  this.b = [(d = a.slice(0)), (e = [])];
  for (a = b; a < 4 * b + 28; a++) {
    c = d[a - 1];
    if (0 === a % b || (8 === b && 4 === a % b))
      ((c =
        (f[c >>> 24] << 24) ^
        (f[(c >> 16) & 255] << 16) ^
        (f[(c >> 8) & 255] << 8) ^
        f[c & 255]),
        0 === a % b &&
          ((c = (c << 8) ^ (c >>> 24) ^ (k << 24)),
          (k = (k << 1) ^ (283 * (k >> 7)))));
    d[a] = d[a - b] ^ c;
  }
  for (b = 0; a; b++, a--)
    ((c = d[b & 3 ? a : a - 4]),
      (e[b] =
        4 >= a || 4 > b
          ? c
          : g[0][f[c >>> 24]] ^
            g[1][f[(c >> 16) & 255]] ^
            g[2][f[(c >> 8) & 255]] ^
            g[3][f[c & 255]]));
};
sjcl.cipher.aes.prototype = {
  encrypt: function (a) {
    return t(this, a, 0);
  },
  decrypt: function (a) {
    return t(this, a, 1);
  },
  l: [
    [[], [], [], [], []],
    [[], [], [], [], []],
  ],
  G: function () {
    var a = this.l[0],
      b = this.l[1],
      c = a[4],
      d = b[4],
      e,
      f,
      g,
      k = [],
      l = [],
      p,
      n,
      h,
      m;
    for (e = 0; 0x100 > e; e++) l[(k[e] = (e << 1) ^ (283 * (e >> 7))) ^ e] = e;
    for (f = g = 0; !c[f]; f ^= p || 1, g = l[g] || 1)
      for (
        h = g ^ (g << 1) ^ (g << 2) ^ (g << 3) ^ (g << 4),
          h = (h >> 8) ^ (h & 255) ^ 99,
          c[f] = h,
          d[h] = f,
          n = k[(e = k[(p = k[f])])],
          m = (0x1010101 * n) ^ (0x10001 * e) ^ (0x101 * p) ^ (0x1010100 * f),
          n = (0x101 * k[h]) ^ (0x1010100 * h),
          e = 0;
        4 > e;
        e++
      )
        ((a[e][f] = n = (n << 24) ^ (n >>> 8)),
          (b[e][h] = m = (m << 24) ^ (m >>> 8)));
    for (e = 0; 5 > e; e++) ((a[e] = a[e].slice(0)), (b[e] = b[e].slice(0)));
  },
};
function t(a, b, c) {
  if (4 !== b.length)
    throw new sjcl.exception.invalid("invalid aes block size");
  var d = a.b[c],
    e = b[0] ^ d[0],
    f = b[c ? 3 : 1] ^ d[1],
    g = b[2] ^ d[2];
  b = b[c ? 1 : 3] ^ d[3];
  var k,
    l,
    p,
    n = d.length / 4 - 2,
    h,
    m = 4,
    q = [0, 0, 0, 0];
  k = a.l[c];
  a = k[0];
  var r = k[1],
    v = k[2],
    w = k[3],
    x = k[4];
  for (h = 0; h < n; h++)
    ((k =
      a[e >>> 24] ^ r[(f >> 16) & 255] ^ v[(g >> 8) & 255] ^ w[b & 255] ^ d[m]),
      (l =
        a[f >>> 24] ^
        r[(g >> 16) & 255] ^
        v[(b >> 8) & 255] ^
        w[e & 255] ^
        d[m + 1]),
      (p =
        a[g >>> 24] ^
        r[(b >> 16) & 255] ^
        v[(e >> 8) & 255] ^
        w[f & 255] ^
        d[m + 2]),
      (b =
        a[b >>> 24] ^
        r[(e >> 16) & 255] ^
        v[(f >> 8) & 255] ^
        w[g & 255] ^
        d[m + 3]),
      (m += 4),
      (e = k),
      (f = l),
      (g = p));
  for (h = 0; 4 > h; h++)
    ((q[c ? 3 & -h : h] =
      (x[e >>> 24] << 24) ^
      (x[(f >> 16) & 255] << 16) ^
      (x[(g >> 8) & 255] << 8) ^
      x[b & 255] ^
      d[m++]),
      (k = e),
      (e = f),
      (f = g),
      (g = b),
      (b = k));
  return q;
}
sjcl.bitArray = {
  bitSlice: function (a, b, c) {
    a = sjcl.bitArray.M(a.slice(b / 32), 32 - (b & 31)).slice(1);
    return void 0 === c ? a : sjcl.bitArray.clamp(a, c - b);
  },
  extract: function (a, b, c) {
    var d = Math.floor((-b - c) & 31);
    return (
      (((b + c - 1) ^ b) & -32
        ? (a[(b / 32) | 0] << (32 - d)) ^ (a[(b / 32 + 1) | 0] >>> d)
        : a[(b / 32) | 0] >>> d) &
      ((1 << c) - 1)
    );
  },
  concat: function (a, b) {
    if (0 === a.length || 0 === b.length) return a.concat(b);
    var c = a[a.length - 1],
      d = sjcl.bitArray.getPartial(c);
    return 32 === d
      ? a.concat(b)
      : sjcl.bitArray.M(b, d, c | 0, a.slice(0, a.length - 1));
  },
  bitLength: function (a) {
    var b = a.length;
    return 0 === b ? 0 : 32 * (b - 1) + sjcl.bitArray.getPartial(a[b - 1]);
  },
  clamp: function (a, b) {
    if (32 * a.length < b) return a;
    a = a.slice(0, Math.ceil(b / 32));
    var c = a.length;
    b = b & 31;
    0 < c &&
      b &&
      (a[c - 1] = sjcl.bitArray.partial(
        b,
        a[c - 1] & (2147483648 >> (b - 1)),
        1
      ));
    return a;
  },
  partial: function (a, b, c) {
    return 32 === a ? b : (c ? b | 0 : b << (32 - a)) + 0x10000000000 * a;
  },
  getPartial: function (a) {
    return Math.round(a / 0x10000000000) || 32;
  },
  equal: function (a, b) {
    if (sjcl.bitArray.bitLength(a) !== sjcl.bitArray.bitLength(b)) return !1;
    var c = 0,
      d;
    for (d = 0; d < a.length; d++) c |= a[d] ^ b[d];
    return 0 === c;
  },
  M: function (a, b, c, d) {
    var e;
    e = 0;
    for (void 0 === d && (d = []); 32 <= b; b -= 32) (d.push(c), (c = 0));
    if (0 === b) return d.concat(a);
    for (e = 0; e < a.length; e++)
      (d.push(c | (a[e] >>> b)), (c = a[e] << (32 - b)));
    e = a.length ? a[a.length - 1] : 0;
    a = sjcl.bitArray.getPartial(e);
    d.push(sjcl.bitArray.partial((b + a) & 31, 32 < b + a ? c : d.pop(), 1));
    return d;
  },
  Y: function (a, b) {
    return [a[0] ^ b[0], a[1] ^ b[1], a[2] ^ b[2], a[3] ^ b[3]];
  },
  byteswapM: function (a) {
    var b, c;
    for (b = 0; b < a.length; ++b)
      ((c = a[b]),
        (a[b] =
          (c >>> 24) | ((c >>> 8) & 0xff00) | ((c & 0xff00) << 8) | (c << 24)));
    return a;
  },
};
sjcl.codec.utf8String = {
  fromBits: function (a) {
    var b = "",
      c = sjcl.bitArray.bitLength(a),
      d,
      e;
    for (d = 0; d < c / 8; d++)
      (0 === (d & 3) && (e = a[d / 4]),
        (b += String.fromCharCode(((e >>> 8) >>> 8) >>> 8)),
        (e <<= 8));
    return decodeURIComponent(escape(b));
  },
  toBits: function (a) {
    a = unescape(encodeURIComponent(a));
    var b = [],
      c,
      d = 0;
    for (c = 0; c < a.length; c++)
      ((d = (d << 8) | a.charCodeAt(c)), 3 === (c & 3) && (b.push(d), (d = 0)));
    c & 3 && b.push(sjcl.bitArray.partial(8 * (c & 3), d));
    return b;
  },
};
sjcl.codec.hex = {
  fromBits: function (a) {
    var b = "",
      c;
    for (c = 0; c < a.length; c++)
      b += ((a[c] | 0) + 0xf00000000000).toString(16).substr(4);
    return b.substr(0, sjcl.bitArray.bitLength(a) / 4);
  },
  toBits: function (a) {
    var b,
      c = [],
      d;
    a = a.replace(/\s|0x/g, "");
    d = a.length;
    a = a + "00000000";
    for (b = 0; b < a.length; b += 8) c.push(parseInt(a.substr(b, 8), 16) ^ 0);
    return sjcl.bitArray.clamp(c, 4 * d);
  },
};
sjcl.hash.sha256 = function (a) {
  this.b[0] || this.G();
  a
    ? ((this.u = a.u.slice(0)), (this.o = a.o.slice(0)), (this.h = a.h))
    : this.reset();
};
sjcl.hash.sha256.hash = function (a) {
  return new sjcl.hash.sha256().update(a).finalize();
};
sjcl.hash.sha256.prototype = {
  blockSize: 512,
  reset: function () {
    this.u = this.K.slice(0);
    this.o = [];
    this.h = 0;
    return this;
  },
  update: function (a) {
    "string" === typeof a && (a = sjcl.codec.utf8String.toBits(a));
    var b,
      c = (this.o = sjcl.bitArray.concat(this.o, a));
    b = this.h;
    a = this.h = b + sjcl.bitArray.bitLength(a);
    if (0x1fffffffffffff < a)
      throw new sjcl.exception.invalid("Cannot hash more than 2^53 - 1 bits");
    if ("undefined" !== typeof Uint32Array) {
      var d = new Uint32Array(c),
        e = 0;
      for (b = 512 + b - ((512 + b) & 0x1ff); b <= a; b += 512)
        (u(this, d.subarray(16 * e, 16 * (e + 1))), (e += 1));
      c.splice(0, 16 * e);
    } else
      for (b = 512 + b - ((512 + b) & 0x1ff); b <= a; b += 512)
        u(this, c.splice(0, 16));
    return this;
  },
  finalize: function () {
    var a,
      b = this.o,
      c = this.u,
      b = sjcl.bitArray.concat(b, [sjcl.bitArray.partial(1, 1)]);
    for (a = b.length + 2; a & 15; a++) b.push(0);
    b.push(Math.floor(this.h / 0x100000000));
    for (b.push(this.h | 0); b.length; ) u(this, b.splice(0, 16));
    this.reset();
    return c;
  },
  K: [],
  b: [],
  G: function () {
    function a(a) {
      return (0x100000000 * (a - Math.floor(a))) | 0;
    }
    for (var b = 0, c = 2, d, e; 64 > b; c++) {
      e = !0;
      for (d = 2; d * d <= c; d++)
        if (0 === c % d) {
          e = !1;
          break;
        }
      e &&
        (8 > b && (this.K[b] = a(Math.pow(c, 0.5))),
        (this.b[b] = a(Math.pow(c, 1 / 3))),
        b++);
    }
  },
};
function u(a, b) {
  var c,
    d,
    e,
    f = a.u,
    g = a.b,
    k = f[0],
    l = f[1],
    p = f[2],
    n = f[3],
    h = f[4],
    m = f[5],
    q = f[6],
    r = f[7];
  for (c = 0; 64 > c; c++)
    (16 > c
      ? (d = b[c])
      : ((d = b[(c + 1) & 15]),
        (e = b[(c + 14) & 15]),
        (d = b[c & 15] =
          (((d >>> 7) ^ (d >>> 18) ^ (d >>> 3) ^ (d << 25) ^ (d << 14)) +
            ((e >>> 17) ^ (e >>> 19) ^ (e >>> 10) ^ (e << 15) ^ (e << 13)) +
            b[c & 15] +
            b[(c + 9) & 15]) |
          0)),
      (d =
        d +
        r +
        ((h >>> 6) ^
          (h >>> 11) ^
          (h >>> 25) ^
          (h << 26) ^
          (h << 21) ^
          (h << 7)) +
        (q ^ (h & (m ^ q))) +
        g[c]),
      (r = q),
      (q = m),
      (m = h),
      (h = (n + d) | 0),
      (n = p),
      (p = l),
      (l = k),
      (k =
        (d +
          ((l & p) ^ (n & (l ^ p))) +
          ((l >>> 2) ^
            (l >>> 13) ^
            (l >>> 22) ^
            (l << 30) ^
            (l << 19) ^
            (l << 10))) |
        0));
  f[0] = (f[0] + k) | 0;
  f[1] = (f[1] + l) | 0;
  f[2] = (f[2] + p) | 0;
  f[3] = (f[3] + n) | 0;
  f[4] = (f[4] + h) | 0;
  f[5] = (f[5] + m) | 0;
  f[6] = (f[6] + q) | 0;
  f[7] = (f[7] + r) | 0;
}
sjcl.prng = function (a) {
  this.c = [new sjcl.hash.sha256()];
  this.i = [0];
  this.H = 0;
  this.v = {};
  this.F = 0;
  this.J = {};
  this.L = this.f = this.j = this.T = 0;
  this.b = [0, 0, 0, 0, 0, 0, 0, 0];
  this.g = [0, 0, 0, 0];
  this.C = void 0;
  this.D = a;
  this.s = !1;
  this.B = { progress: {}, seeded: {} };
  this.m = this.S = 0;
  this.w = 1;
  this.A = 2;
  this.O = 0x10000;
  this.I = [0, 48, 64, 96, 128, 192, 0x100, 384, 512, 768, 1024];
  this.P = 3e4;
  this.N = 80;
};
sjcl.prng.prototype = {
  randomWords: function (a, b) {
    var c = [],
      d;
    d = this.isReady(b);
    var e;
    if (d === this.m)
      throw new sjcl.exception.notReady("generator isn't seeded");
    if (d & this.A) {
      d = !(d & this.w);
      e = [];
      var f = 0,
        g;
      this.L = e[0] = new Date().valueOf() + this.P;
      for (g = 0; 16 > g; g++) e.push((0x100000000 * Math.random()) | 0);
      for (
        g = 0;
        g < this.c.length &&
        ((e = e.concat(this.c[g].finalize())),
        (f += this.i[g]),
        (this.i[g] = 0),
        d || !(this.H & (1 << g)));
        g++
      );
      this.H >= 1 << this.c.length &&
        (this.c.push(new sjcl.hash.sha256()), this.i.push(0));
      this.f -= f;
      f > this.j && (this.j = f);
      this.H++;
      this.b = sjcl.hash.sha256.hash(this.b.concat(e));
      this.C = new sjcl.cipher.aes(this.b);
      for (
        d = 0;
        4 > d && ((this.g[d] = (this.g[d] + 1) | 0), !this.g[d]);
        d++
      );
    }
    for (d = 0; d < a; d += 4)
      (0 === (d + 1) % this.O && y(this),
        (e = z(this)),
        c.push(e[0], e[1], e[2], e[3]));
    y(this);
    return c.slice(0, a);
  },
  setDefaultParanoia: function (a, b) {
    if (
      0 === a &&
      "Setting paranoia=0 will ruin your security; use it only for testing" !==
        b
    )
      throw new sjcl.exception.invalid(
        "Setting paranoia=0 will ruin your security; use it only for testing"
      );
    this.D = a;
  },
  addEntropy: function (a, b, c) {
    c = c || "user";
    var d,
      e,
      f = new Date().valueOf(),
      g = this.v[c],
      k = this.isReady(),
      l = 0;
    d = this.J[c];
    void 0 === d && (d = this.J[c] = this.T++);
    void 0 === g && (g = this.v[c] = 0);
    this.v[c] = (this.v[c] + 1) % this.c.length;
    switch (typeof a) {
      case "number":
        void 0 === b && (b = 1);
        this.c[g].update([d, this.F++, 1, b, f, 1, a | 0]);
        break;
      case "object":
        c = Object.prototype.toString.call(a);
        if ("[object Uint32Array]" === c) {
          e = [];
          for (c = 0; c < a.length; c++) e.push(a[c]);
          a = e;
        } else
          for (
            "[object Array]" !== c && (l = 1), c = 0;
            c < a.length && !l;
            c++
          )
            "number" !== typeof a[c] && (l = 1);
        if (!l) {
          if (void 0 === b)
            for (c = b = 0; c < a.length; c++)
              for (e = a[c]; 0 < e; ) (b++, (e = e >>> 1));
          this.c[g].update([d, this.F++, 2, b, f, a.length].concat(a));
        }
        break;
      case "string":
        void 0 === b && (b = a.length);
        this.c[g].update([d, this.F++, 3, b, f, a.length]);
        this.c[g].update(a);
        break;
      default:
        l = 1;
    }
    if (l)
      throw new sjcl.exception.bug(
        "random: addEntropy only supports number, array of numbers or string"
      );
    this.i[g] += b;
    this.f += b;
    k === this.m &&
      (this.isReady() !== this.m && A("seeded", Math.max(this.j, this.f)),
      A("progress", this.getProgress()));
  },
  isReady: function (a) {
    a = this.I[void 0 !== a ? a : this.D];
    return this.j && this.j >= a
      ? this.i[0] > this.N && new Date().valueOf() > this.L
        ? this.A | this.w
        : this.w
      : this.f >= a
        ? this.A | this.m
        : this.m;
  },
  getProgress: function (a) {
    a = this.I[a ? a : this.D];
    return this.j >= a ? 1 : this.f > a ? 1 : this.f / a;
  },
  startCollectors: function () {
    if (!this.s) {
      this.a = {
        loadTimeCollector: B(this, this.V),
        mouseCollector: B(this, this.W),
        keyboardCollector: B(this, this.U),
        accelerometerCollector: B(this, this.R),
        touchCollector: B(this, this.X),
      };
      if (window.addEventListener)
        (window.addEventListener("load", this.a.loadTimeCollector, !1),
          window.addEventListener("mousemove", this.a.mouseCollector, !1),
          window.addEventListener("keypress", this.a.keyboardCollector, !1),
          window.addEventListener(
            "devicemotion",
            this.a.accelerometerCollector,
            !1
          ),
          window.addEventListener("touchmove", this.a.touchCollector, !1));
      else if (document.attachEvent)
        (document.attachEvent("onload", this.a.loadTimeCollector),
          document.attachEvent("onmousemove", this.a.mouseCollector),
          document.attachEvent("keypress", this.a.keyboardCollector));
      else throw new sjcl.exception.bug("can't attach event");
      this.s = !0;
    }
  },
  stopCollectors: function () {
    this.s &&
      (window.removeEventListener
        ? (window.removeEventListener("load", this.a.loadTimeCollector, !1),
          window.removeEventListener("mousemove", this.a.mouseCollector, !1),
          window.removeEventListener("keypress", this.a.keyboardCollector, !1),
          window.removeEventListener(
            "devicemotion",
            this.a.accelerometerCollector,
            !1
          ),
          window.removeEventListener("touchmove", this.a.touchCollector, !1))
        : document.detachEvent &&
          (document.detachEvent("onload", this.a.loadTimeCollector),
          document.detachEvent("onmousemove", this.a.mouseCollector),
          document.detachEvent("keypress", this.a.keyboardCollector)),
      (this.s = !1));
  },
  addEventListener: function (a, b) {
    this.B[a][this.S++] = b;
  },
  removeEventListener: function (a, b) {
    var c,
      d,
      e = this.B[a],
      f = [];
    for (d in e) e.hasOwnProperty(d) && e[d] === b && f.push(d);
    for (c = 0; c < f.length; c++) ((d = f[c]), delete e[d]);
  },
  U: function () {
    C(this, 1);
  },
  W: function (a) {
    var b, c;
    try {
      ((b = a.x || a.clientX || a.offsetX || 0),
        (c = a.y || a.clientY || a.offsetY || 0));
    } catch (d) {
      c = b = 0;
    }
    0 != b && 0 != c && this.addEntropy([b, c], 2, "mouse");
    C(this, 0);
  },
  X: function (a) {
    a = a.touches[0] || a.changedTouches[0];
    this.addEntropy([a.pageX || a.clientX, a.pageY || a.clientY], 1, "touch");
    C(this, 0);
  },
  V: function () {
    C(this, 2);
  },
  R: function (a) {
    a =
      a.accelerationIncludingGravity.x ||
      a.accelerationIncludingGravity.y ||
      a.accelerationIncludingGravity.z;
    if (window.orientation) {
      var b = window.orientation;
      "number" === typeof b && this.addEntropy(b, 1, "accelerometer");
    }
    a && this.addEntropy(a, 2, "accelerometer");
    C(this, 0);
  },
};
function A(a, b) {
  var c,
    d = sjcl.random.B[a],
    e = [];
  for (c in d) d.hasOwnProperty(c) && e.push(d[c]);
  for (c = 0; c < e.length; c++) e[c](b);
}
function C(a, b) {
  "undefined" !== typeof window &&
  window.performance &&
  "function" === typeof window.performance.now
    ? a.addEntropy(window.performance.now(), b, "loadtime")
    : a.addEntropy(new Date().valueOf(), b, "loadtime");
}
function y(a) {
  a.b = z(a).concat(z(a));
  a.C = new sjcl.cipher.aes(a.b);
}
function z(a) {
  for (var b = 0; 4 > b && ((a.g[b] = (a.g[b] + 1) | 0), !a.g[b]); b++);
  return a.C.encrypt(a.g);
}
function B(a, b) {
  return function () {
    b.apply(a, arguments);
  };
}
sjcl.random = new sjcl.prng(6);
a: try {
  var D, E, F, G;
  if ((G = "undefined" !== typeof module && module.exports)) {
    var H;
    try {
      H = require("crypto");
    } catch (a) {
      H = null;
    }
    G = E = H;
  }
  if (G && E.randomBytes)
    ((D = E.randomBytes(128)),
      (D = new Uint32Array(new Uint8Array(D).buffer)),
      sjcl.random.addEntropy(D, 1024, "crypto['randomBytes']"));
  else if (
    "undefined" !== typeof window &&
    "undefined" !== typeof Uint32Array
  ) {
    F = new Uint32Array(32);
    if (window.crypto && window.crypto.getRandomValues)
      window.crypto.getRandomValues(F);
    else if (window.msCrypto && window.msCrypto.getRandomValues)
      window.msCrypto.getRandomValues(F);
    else break a;
    sjcl.random.addEntropy(F, 1024, "crypto['getRandomValues']");
  }
} catch (a) {
  "undefined" !== typeof window &&
    window.console &&
    (console.log("There was an error collecting entropy from the browser:"),
    console.log(a));
}
"undefined" !== typeof module && module.exports && (module.exports = sjcl);
"function" === typeof define &&
  define([], function () {
    return sjcl;
  });
