var QRCode = (function (t) {
  "use strict";
  var r,
    e = function () {
      return (
        "function" == typeof Promise &&
        Promise.prototype &&
        Promise.prototype.then
      );
    },
    n = [
      0, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346, 404, 466, 532, 581, 655,
      733, 815, 901, 991, 1085, 1156, 1258, 1364, 1474, 1588, 1706, 1828, 1921,
      2051, 2185, 2323, 2465, 2611, 2761, 2876, 3034, 3196, 3362, 3532, 3706,
    ],
    o = function (t) {
      if (!t) throw new Error('"version" cannot be null or undefined');
      if (t < 1 || t > 40)
        throw new Error('"version" should be in range from 1 to 40');
      return 4 * t + 17;
    },
    i = function (t) {
      return n[t];
    },
    a = function (t) {
      for (var r = 0; 0 !== t; ) (r++, (t >>>= 1));
      return r;
    },
    u = function (t) {
      if ("function" != typeof t)
        throw new Error('"toSJISFunc" is not a valid function.');
      r = t;
    },
    s = function () {
      return void 0 !== r;
    },
    f = function (t) {
      return r(t);
    };
  function h(t) {
    var r = { exports: {} };
    return (t(r, r.exports), r.exports);
  }
  var c = h(function (t, r) {
    ((r.L = { bit: 1 }),
      (r.M = { bit: 0 }),
      (r.Q = { bit: 3 }),
      (r.H = { bit: 2 }),
      (r.isValid = function (t) {
        return t && void 0 !== t.bit && t.bit >= 0 && t.bit < 4;
      }),
      (r.from = function (t, e) {
        if (r.isValid(t)) return t;
        try {
          return (function (t) {
            if ("string" != typeof t) throw new Error("Param is not a string");
            switch (t.toLowerCase()) {
              case "l":
              case "low":
                return r.L;
              case "m":
              case "medium":
                return r.M;
              case "q":
              case "quartile":
                return r.Q;
              case "h":
              case "high":
                return r.H;
              default:
                throw new Error("Unknown EC Level: " + t);
            }
          })(t);
        } catch (t) {
          return e;
        }
      }));
  });
  function g() {
    ((this.buffer = []), (this.length = 0));
  }
  g.prototype = {
    get: function (t) {
      var r = Math.floor(t / 8);
      return 1 == ((this.buffer[r] >>> (7 - (t % 8))) & 1);
    },
    put: function (t, r) {
      for (var e = 0; e < r; e++) this.putBit(1 == ((t >>> (r - e - 1)) & 1));
    },
    getLengthInBits: function () {
      return this.length;
    },
    putBit: function (t) {
      var r = Math.floor(this.length / 8);
      (this.buffer.length <= r && this.buffer.push(0),
        t && (this.buffer[r] |= 128 >>> this.length % 8),
        this.length++);
    },
  };
  var d = g;
  function l(t) {
    if (!t || t < 1)
      throw new Error("BitMatrix size must be defined and greater than 0");
    ((this.size = t),
      (this.data = new Uint8Array(t * t)),
      (this.reservedBit = new Uint8Array(t * t)));
  }
  ((l.prototype.set = function (t, r, e, n) {
    var o = t * this.size + r;
    ((this.data[o] = e), n && (this.reservedBit[o] = !0));
  }),
    (l.prototype.get = function (t, r) {
      return this.data[t * this.size + r];
    }),
    (l.prototype.xor = function (t, r, e) {
      this.data[t * this.size + r] ^= e;
    }),
    (l.prototype.isReserved = function (t, r) {
      return this.reservedBit[t * this.size + r];
    }));
  var v = l,
    p = h(function (t, r) {
      var e = o;
      ((r.getRowColCoords = function (t) {
        if (1 === t) return [];
        for (
          var r = Math.floor(t / 7) + 2,
            n = e(t),
            o = 145 === n ? 26 : 2 * Math.ceil((n - 13) / (2 * r - 2)),
            i = [n - 7],
            a = 1;
          a < r - 1;
          a++
        )
          i[a] = i[a - 1] - o;
        return (i.push(6), i.reverse());
      }),
        (r.getPositions = function (t) {
          for (
            var e = [], n = r.getRowColCoords(t), o = n.length, i = 0;
            i < o;
            i++
          )
            for (var a = 0; a < o; a++)
              (0 === i && 0 === a) ||
                (0 === i && a === o - 1) ||
                (i === o - 1 && 0 === a) ||
                e.push([n[i], n[a]]);
          return e;
        }));
    }),
    w = o,
    m = function (t) {
      var r = w(t);
      return [
        [0, 0],
        [r - 7, 0],
        [0, r - 7],
      ];
    },
    E = h(function (t, r) {
      r.Patterns = {
        PATTERN000: 0,
        PATTERN001: 1,
        PATTERN010: 2,
        PATTERN011: 3,
        PATTERN100: 4,
        PATTERN101: 5,
        PATTERN110: 6,
        PATTERN111: 7,
      };
      var e = 3,
        n = 3,
        o = 40,
        i = 10;
      function a(t, e, n) {
        switch (t) {
          case r.Patterns.PATTERN000:
            return (e + n) % 2 == 0;
          case r.Patterns.PATTERN001:
            return e % 2 == 0;
          case r.Patterns.PATTERN010:
            return n % 3 == 0;
          case r.Patterns.PATTERN011:
            return (e + n) % 3 == 0;
          case r.Patterns.PATTERN100:
            return (Math.floor(e / 2) + Math.floor(n / 3)) % 2 == 0;
          case r.Patterns.PATTERN101:
            return ((e * n) % 2) + ((e * n) % 3) == 0;
          case r.Patterns.PATTERN110:
            return (((e * n) % 2) + ((e * n) % 3)) % 2 == 0;
          case r.Patterns.PATTERN111:
            return (((e * n) % 3) + ((e + n) % 2)) % 2 == 0;
          default:
            throw new Error("bad maskPattern:" + t);
        }
      }
      ((r.isValid = function (t) {
        return null != t && "" !== t && !isNaN(t) && t >= 0 && t <= 7;
      }),
        (r.from = function (t) {
          return r.isValid(t) ? parseInt(t, 10) : void 0;
        }),
        (r.getPenaltyN1 = function (t) {
          for (
            var r = t.size, n = 0, o = 0, i = 0, a = null, u = null, s = 0;
            s < r;
            s++
          ) {
            ((o = i = 0), (a = u = null));
            for (var f = 0; f < r; f++) {
              var h = t.get(s, f);
              (h === a ? o++ : (o >= 5 && (n += e + (o - 5)), (a = h), (o = 1)),
                (h = t.get(f, s)) === u
                  ? i++
                  : (i >= 5 && (n += e + (i - 5)), (u = h), (i = 1)));
            }
            (o >= 5 && (n += e + (o - 5)), i >= 5 && (n += e + (i - 5)));
          }
          return n;
        }),
        (r.getPenaltyN2 = function (t) {
          for (var r = t.size, e = 0, o = 0; o < r - 1; o++)
            for (var i = 0; i < r - 1; i++) {
              var a =
                t.get(o, i) +
                t.get(o, i + 1) +
                t.get(o + 1, i) +
                t.get(o + 1, i + 1);
              (4 !== a && 0 !== a) || e++;
            }
          return e * n;
        }),
        (r.getPenaltyN3 = function (t) {
          for (var r = t.size, e = 0, n = 0, i = 0, a = 0; a < r; a++) {
            n = i = 0;
            for (var u = 0; u < r; u++)
              ((n = ((n << 1) & 2047) | t.get(a, u)),
                u >= 10 && (1488 === n || 93 === n) && e++,
                (i = ((i << 1) & 2047) | t.get(u, a)),
                u >= 10 && (1488 === i || 93 === i) && e++);
          }
          return e * o;
        }),
        (r.getPenaltyN4 = function (t) {
          for (var r = 0, e = t.data.length, n = 0; n < e; n++) r += t.data[n];
          return Math.abs(Math.ceil((100 * r) / e / 5) - 10) * i;
        }),
        (r.applyMask = function (t, r) {
          for (var e = r.size, n = 0; n < e; n++)
            for (var o = 0; o < e; o++)
              r.isReserved(o, n) || r.xor(o, n, a(t, o, n));
        }),
        (r.getBestMask = function (t, e) {
          for (
            var n = Object.keys(r.Patterns).length, o = 0, i = 1 / 0, a = 0;
            a < n;
            a++
          ) {
            (e(a), r.applyMask(a, t));
            var u =
              r.getPenaltyN1(t) +
              r.getPenaltyN2(t) +
              r.getPenaltyN3(t) +
              r.getPenaltyN4(t);
            (r.applyMask(a, t), u < i && ((i = u), (o = a)));
          }
          return o;
        }));
    }),
    y = [
      1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 1, 2, 2, 4, 1, 2, 4, 4, 2, 4, 4, 4, 2,
      4, 6, 5, 2, 4, 6, 6, 2, 5, 8, 8, 4, 5, 8, 8, 4, 5, 8, 11, 4, 8, 10, 11, 4,
      9, 12, 16, 4, 9, 16, 16, 6, 10, 12, 18, 6, 10, 17, 16, 6, 11, 16, 19, 6,
      13, 18, 21, 7, 14, 21, 25, 8, 16, 20, 25, 8, 17, 23, 25, 9, 17, 23, 34, 9,
      18, 25, 30, 10, 20, 27, 32, 12, 21, 29, 35, 12, 23, 34, 37, 12, 25, 34,
      40, 13, 26, 35, 42, 14, 28, 38, 45, 15, 29, 40, 48, 16, 31, 43, 51, 17,
      33, 45, 54, 18, 35, 48, 57, 19, 37, 51, 60, 19, 38, 53, 63, 20, 40, 56,
      66, 21, 43, 59, 70, 22, 45, 62, 74, 24, 47, 65, 77, 25, 49, 68, 81,
    ],
    A = [
      7, 10, 13, 17, 10, 16, 22, 28, 15, 26, 36, 44, 20, 36, 52, 64, 26, 48, 72,
      88, 36, 64, 96, 112, 40, 72, 108, 130, 48, 88, 132, 156, 60, 110, 160,
      192, 72, 130, 192, 224, 80, 150, 224, 264, 96, 176, 260, 308, 104, 198,
      288, 352, 120, 216, 320, 384, 132, 240, 360, 432, 144, 280, 408, 480, 168,
      308, 448, 532, 180, 338, 504, 588, 196, 364, 546, 650, 224, 416, 600, 700,
      224, 442, 644, 750, 252, 476, 690, 816, 270, 504, 750, 900, 300, 560, 810,
      960, 312, 588, 870, 1050, 336, 644, 952, 1110, 360, 700, 1020, 1200, 390,
      728, 1050, 1260, 420, 784, 1140, 1350, 450, 812, 1200, 1440, 480, 868,
      1290, 1530, 510, 924, 1350, 1620, 540, 980, 1440, 1710, 570, 1036, 1530,
      1800, 570, 1064, 1590, 1890, 600, 1120, 1680, 1980, 630, 1204, 1770, 2100,
      660, 1260, 1860, 2220, 720, 1316, 1950, 2310, 750, 1372, 2040, 2430,
    ],
    B = function (t, r) {
      switch (r) {
        case c.L:
          return y[4 * (t - 1) + 0];
        case c.M:
          return y[4 * (t - 1) + 1];
        case c.Q:
          return y[4 * (t - 1) + 2];
        case c.H:
          return y[4 * (t - 1) + 3];
        default:
          return;
      }
    },
    I = function (t, r) {
      switch (r) {
        case c.L:
          return A[4 * (t - 1) + 0];
        case c.M:
          return A[4 * (t - 1) + 1];
        case c.Q:
          return A[4 * (t - 1) + 2];
        case c.H:
          return A[4 * (t - 1) + 3];
        default:
          return;
      }
    },
    M = new Uint8Array(512),
    N = new Uint8Array(256);
  !(function () {
    for (var t = 1, r = 0; r < 255; r++)
      ((M[r] = t), (N[t] = r), 256 & (t <<= 1) && (t ^= 285));
    for (var e = 255; e < 512; e++) M[e] = M[e - 255];
  })();
  var C = function (t) {
      return M[t];
    },
    P = function (t, r) {
      return 0 === t || 0 === r ? 0 : M[N[t] + N[r]];
    },
    R = h(function (t, r) {
      ((r.mul = function (t, r) {
        for (
          var e = new Uint8Array(t.length + r.length - 1), n = 0;
          n < t.length;
          n++
        )
          for (var o = 0; o < r.length; o++) e[n + o] ^= P(t[n], r[o]);
        return e;
      }),
        (r.mod = function (t, r) {
          for (var e = new Uint8Array(t); e.length - r.length >= 0; ) {
            for (var n = e[0], o = 0; o < r.length; o++) e[o] ^= P(r[o], n);
            for (var i = 0; i < e.length && 0 === e[i]; ) i++;
            e = e.slice(i);
          }
          return e;
        }),
        (r.generateECPolynomial = function (t) {
          for (var e = new Uint8Array([1]), n = 0; n < t; n++)
            e = r.mul(e, new Uint8Array([1, C(n)]));
          return e;
        }));
    });
  function T(t) {
    ((this.genPoly = void 0),
      (this.degree = t),
      this.degree && this.initialize(this.degree));
  }
  ((T.prototype.initialize = function (t) {
    ((this.degree = t), (this.genPoly = R.generateECPolynomial(this.degree)));
  }),
    (T.prototype.encode = function (t) {
      if (!this.genPoly) throw new Error("Encoder not initialized");
      var r = new Uint8Array(t.length + this.degree);
      r.set(t);
      var e = R.mod(r, this.genPoly),
        n = this.degree - e.length;
      if (n > 0) {
        var o = new Uint8Array(this.degree);
        return (o.set(e, n), o);
      }
      return e;
    }));
  var L = T,
    b = function (t) {
      return !isNaN(t) && t >= 1 && t <= 40;
    },
    U = "[0-9]+",
    x =
      "(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+",
    k =
      "(?:(?![A-Z0-9 $%*+\\-./:]|" +
      (x = x.replace(/u/g, "\\u")) +
      ")(?:.|[\r\n]))+",
    F = new RegExp(x, "g"),
    S = new RegExp(k, "g"),
    _ = new RegExp(U, "g"),
    Y = new RegExp("[A-Z $%*+\\-./:]+", "g"),
    z = new RegExp("^" + x + "$"),
    D = new RegExp("^[0-9]+$"),
    J = /^[A-Z0-9 $%*+\-./:]+$/,
    H = {
      KANJI: F,
      BYTE_KANJI: /[^A-Z0-9 $%*+\-./:]+/g,
      BYTE: S,
      NUMERIC: _,
      ALPHANUMERIC: Y,
      testKanji: function (t) {
        return z.test(t);
      },
      testNumeric: function (t) {
        return D.test(t);
      },
      testAlphanumeric: function (t) {
        return J.test(t);
      },
    },
    K = h(function (t, r) {
      ((r.NUMERIC = { id: "Numeric", bit: 1, ccBits: [10, 12, 14] }),
        (r.ALPHANUMERIC = { id: "Alphanumeric", bit: 2, ccBits: [9, 11, 13] }),
        (r.BYTE = { id: "Byte", bit: 4, ccBits: [8, 16, 16] }),
        (r.KANJI = { id: "Kanji", bit: 8, ccBits: [8, 10, 12] }),
        (r.MIXED = { bit: -1 }),
        (r.getCharCountIndicator = function (t, r) {
          if (!t.ccBits) throw new Error("Invalid mode: " + t);
          if (!b(r)) throw new Error("Invalid version: " + r);
          return r >= 1 && r < 10
            ? t.ccBits[0]
            : r < 27
              ? t.ccBits[1]
              : t.ccBits[2];
        }),
        (r.getBestModeForData = function (t) {
          return H.testNumeric(t)
            ? r.NUMERIC
            : H.testAlphanumeric(t)
              ? r.ALPHANUMERIC
              : H.testKanji(t)
                ? r.KANJI
                : r.BYTE;
        }),
        (r.toString = function (t) {
          if (t && t.id) return t.id;
          throw new Error("Invalid mode");
        }),
        (r.isValid = function (t) {
          return t && t.bit && t.ccBits;
        }),
        (r.from = function (t, e) {
          if (r.isValid(t)) return t;
          try {
            return (function (t) {
              if ("string" != typeof t)
                throw new Error("Param is not a string");
              switch (t.toLowerCase()) {
                case "numeric":
                  return r.NUMERIC;
                case "alphanumeric":
                  return r.ALPHANUMERIC;
                case "kanji":
                  return r.KANJI;
                case "byte":
                  return r.BYTE;
                default:
                  throw new Error("Unknown mode: " + t);
              }
            })(t);
          } catch (t) {
            return e;
          }
        }));
    }),
    O = h(function (t, r) {
      var e = a(7973);
      function n(t, r) {
        return K.getCharCountIndicator(t, r) + 4;
      }
      function o(t, r) {
        var e = 0;
        return (
          t.forEach(function (t) {
            var o = n(t.mode, r);
            e += o + t.getBitsLength();
          }),
          e
        );
      }
      ((r.from = function (t, r) {
        return b(t) ? parseInt(t, 10) : r;
      }),
        (r.getCapacity = function (t, r, e) {
          if (!b(t)) throw new Error("Invalid QR Code version");
          void 0 === e && (e = K.BYTE);
          var o = 8 * (i(t) - I(t, r));
          if (e === K.MIXED) return o;
          var a = o - n(e, t);
          switch (e) {
            case K.NUMERIC:
              return Math.floor((a / 10) * 3);
            case K.ALPHANUMERIC:
              return Math.floor((a / 11) * 2);
            case K.KANJI:
              return Math.floor(a / 13);
            case K.BYTE:
            default:
              return Math.floor(a / 8);
          }
        }),
        (r.getBestVersionForData = function (t, e) {
          var n,
            i = c.from(e, c.M);
          if (Array.isArray(t)) {
            if (t.length > 1)
              return (function (t, e) {
                for (var n = 1; n <= 40; n++)
                  if (o(t, n) <= r.getCapacity(n, e, K.MIXED)) return n;
              })(t, i);
            if (0 === t.length) return 1;
            n = t[0];
          } else n = t;
          return (function (t, e, n) {
            for (var o = 1; o <= 40; o++)
              if (e <= r.getCapacity(o, n, t)) return o;
          })(n.mode, n.getLength(), i);
        }),
        (r.getEncodedBits = function (t) {
          if (!b(t) || t < 7) throw new Error("Invalid QR Code version");
          for (var r = t << 12; a(r) - e >= 0; ) r ^= 7973 << (a(r) - e);
          return (t << 12) | r;
        }));
    }),
    Q = a(1335),
    q = function (t, r) {
      for (var e = (t.bit << 3) | r, n = e << 10; a(n) - Q >= 0; )
        n ^= 1335 << (a(n) - Q);
      return 21522 ^ ((e << 10) | n);
    };
  function V(t) {
    ((this.mode = K.NUMERIC), (this.data = t.toString()));
  }
  ((V.getBitsLength = function (t) {
    return 10 * Math.floor(t / 3) + (t % 3 ? (t % 3) * 3 + 1 : 0);
  }),
    (V.prototype.getLength = function () {
      return this.data.length;
    }),
    (V.prototype.getBitsLength = function () {
      return V.getBitsLength(this.data.length);
    }),
    (V.prototype.write = function (t) {
      var r, e, n;
      for (r = 0; r + 3 <= this.data.length; r += 3)
        ((e = this.data.substr(r, 3)), (n = parseInt(e, 10)), t.put(n, 10));
      var o = this.data.length - r;
      o > 0 &&
        ((e = this.data.substr(r)), (n = parseInt(e, 10)), t.put(n, 3 * o + 1));
    }));
  var j = V,
    $ = [
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "I",
      "J",
      "K",
      "L",
      "M",
      "N",
      "O",
      "P",
      "Q",
      "R",
      "S",
      "T",
      "U",
      "V",
      "W",
      "X",
      "Y",
      "Z",
      " ",
      "$",
      "%",
      "*",
      "+",
      "-",
      ".",
      "/",
      ":",
    ];
  function Z(t) {
    ((this.mode = K.ALPHANUMERIC), (this.data = t));
  }
  ((Z.getBitsLength = function (t) {
    return 11 * Math.floor(t / 2) + (t % 2) * 6;
  }),
    (Z.prototype.getLength = function () {
      return this.data.length;
    }),
    (Z.prototype.getBitsLength = function () {
      return Z.getBitsLength(this.data.length);
    }),
    (Z.prototype.write = function (t) {
      var r;
      for (r = 0; r + 2 <= this.data.length; r += 2) {
        var e = 45 * $.indexOf(this.data[r]);
        ((e += $.indexOf(this.data[r + 1])), t.put(e, 11));
      }
      this.data.length % 2 && t.put($.indexOf(this.data[r]), 6);
    }));
  var X = Z;
  function W(t) {
    ((this.mode = K.BYTE),
      (this.data = new Uint8Array(
        (function (t) {
          for (var r = [], e = t.length, n = 0; n < e; n++) {
            var o = t.charCodeAt(n);
            if (o >= 55296 && o <= 56319 && e > n + 1) {
              var i = t.charCodeAt(n + 1);
              i >= 56320 &&
                i <= 57343 &&
                ((o = 1024 * (o - 55296) + i - 56320 + 65536), (n += 1));
            }
            o < 128
              ? r.push(o)
              : o < 2048
                ? (r.push((o >> 6) | 192), r.push((63 & o) | 128))
                : o < 55296 || (o >= 57344 && o < 65536)
                  ? (r.push((o >> 12) | 224),
                    r.push(((o >> 6) & 63) | 128),
                    r.push((63 & o) | 128))
                  : o >= 65536 && o <= 1114111
                    ? (r.push((o >> 18) | 240),
                      r.push(((o >> 12) & 63) | 128),
                      r.push(((o >> 6) & 63) | 128),
                      r.push((63 & o) | 128))
                    : r.push(239, 191, 189);
          }
          return new Uint8Array(r).buffer;
        })(t)
      )));
  }
  ((W.getBitsLength = function (t) {
    return 8 * t;
  }),
    (W.prototype.getLength = function () {
      return this.data.length;
    }),
    (W.prototype.getBitsLength = function () {
      return W.getBitsLength(this.data.length);
    }),
    (W.prototype.write = function (t) {
      for (var r = 0, e = this.data.length; r < e; r++) t.put(this.data[r], 8);
    }));
  var G = W;
  function tt(t) {
    ((this.mode = K.KANJI), (this.data = t));
  }
  ((tt.getBitsLength = function (t) {
    return 13 * t;
  }),
    (tt.prototype.getLength = function () {
      return this.data.length;
    }),
    (tt.prototype.getBitsLength = function () {
      return tt.getBitsLength(this.data.length);
    }),
    (tt.prototype.write = function (t) {
      var r;
      for (r = 0; r < this.data.length; r++) {
        var e = f(this.data[r]);
        if (e >= 33088 && e <= 40956) e -= 33088;
        else {
          if (!(e >= 57408 && e <= 60351))
            throw new Error(
              "Invalid SJIS character: " +
                this.data[r] +
                "\nMake sure your charset is UTF-8"
            );
          e -= 49472;
        }
        ((e = 192 * ((e >>> 8) & 255) + (255 & e)), t.put(e, 13));
      }
    }));
  var rt = tt,
    et = h(function (t) {
      var r = {
        single_source_shortest_paths: function (t, e, n) {
          var o = {},
            i = {};
          i[e] = 0;
          var a,
            u,
            s,
            f,
            h,
            c,
            g,
            d = r.PriorityQueue.make();
          for (d.push(e, 0); !d.empty(); )
            for (s in ((u = (a = d.pop()).value),
            (f = a.cost),
            (h = t[u] || {})))
              h.hasOwnProperty(s) &&
                ((c = f + h[s]),
                (g = i[s]),
                (void 0 === i[s] || g > c) &&
                  ((i[s] = c), d.push(s, c), (o[s] = u)));
          if (void 0 !== n && void 0 === i[n]) {
            var l = ["Could not find a path from ", e, " to ", n, "."].join("");
            throw new Error(l);
          }
          return o;
        },
        extract_shortest_path_from_predecessor_list: function (t, r) {
          for (var e = [], n = r; n; ) (e.push(n), t[n], (n = t[n]));
          return (e.reverse(), e);
        },
        find_path: function (t, e, n) {
          var o = r.single_source_shortest_paths(t, e, n);
          return r.extract_shortest_path_from_predecessor_list(o, n);
        },
        PriorityQueue: {
          make: function (t) {
            var e,
              n = r.PriorityQueue,
              o = {};
            for (e in ((t = t || {}), n)) n.hasOwnProperty(e) && (o[e] = n[e]);
            return (
              (o.queue = []),
              (o.sorter = t.sorter || n.default_sorter),
              o
            );
          },
          default_sorter: function (t, r) {
            return t.cost - r.cost;
          },
          push: function (t, r) {
            var e = { value: t, cost: r };
            (this.queue.push(e), this.queue.sort(this.sorter));
          },
          pop: function () {
            return this.queue.shift();
          },
          empty: function () {
            return 0 === this.queue.length;
          },
        },
      };
      t.exports = r;
    }),
    nt = h(function (t, r) {
      function e(t) {
        return unescape(encodeURIComponent(t)).length;
      }
      function n(t, r, e) {
        for (var n, o = []; null !== (n = t.exec(e)); )
          o.push({ data: n[0], index: n.index, mode: r, length: n[0].length });
        return o;
      }
      function o(t) {
        var r,
          e,
          o = n(H.NUMERIC, K.NUMERIC, t),
          i = n(H.ALPHANUMERIC, K.ALPHANUMERIC, t);
        return (
          s()
            ? ((r = n(H.BYTE, K.BYTE, t)), (e = n(H.KANJI, K.KANJI, t)))
            : ((r = n(H.BYTE_KANJI, K.BYTE, t)), (e = [])),
          o
            .concat(i, r, e)
            .sort(function (t, r) {
              return t.index - r.index;
            })
            .map(function (t) {
              return { data: t.data, mode: t.mode, length: t.length };
            })
        );
      }
      function i(t, r) {
        switch (r) {
          case K.NUMERIC:
            return j.getBitsLength(t);
          case K.ALPHANUMERIC:
            return X.getBitsLength(t);
          case K.KANJI:
            return rt.getBitsLength(t);
          case K.BYTE:
            return G.getBitsLength(t);
        }
      }
      function a(t, r) {
        var e,
          n = K.getBestModeForData(t);
        if ((e = K.from(r, n)) !== K.BYTE && e.bit < n.bit)
          throw new Error(
            '"' +
              t +
              '" cannot be encoded with mode ' +
              K.toString(e) +
              ".\n Suggested mode is: " +
              K.toString(n)
          );
        switch ((e !== K.KANJI || s() || (e = K.BYTE), e)) {
          case K.NUMERIC:
            return new j(t);
          case K.ALPHANUMERIC:
            return new X(t);
          case K.KANJI:
            return new rt(t);
          case K.BYTE:
            return new G(t);
        }
      }
      ((r.fromArray = function (t) {
        return t.reduce(function (t, r) {
          return (
            "string" == typeof r
              ? t.push(a(r, null))
              : r.data && t.push(a(r.data, r.mode)),
            t
          );
        }, []);
      }),
        (r.fromString = function (t, n) {
          for (
            var a = (function (t, r) {
                for (
                  var e = {}, n = { start: {} }, o = ["start"], a = 0;
                  a < t.length;
                  a++
                ) {
                  for (var u = t[a], s = [], f = 0; f < u.length; f++) {
                    var h = u[f],
                      c = "" + a + f;
                    (s.push(c),
                      (e[c] = { node: h, lastCount: 0 }),
                      (n[c] = {}));
                    for (var g = 0; g < o.length; g++) {
                      var d = o[g];
                      e[d] && e[d].node.mode === h.mode
                        ? ((n[d][c] =
                            i(e[d].lastCount + h.length, h.mode) -
                            i(e[d].lastCount, h.mode)),
                          (e[d].lastCount += h.length))
                        : (e[d] && (e[d].lastCount = h.length),
                          (n[d][c] =
                            i(h.length, h.mode) +
                            4 +
                            K.getCharCountIndicator(h.mode, r)));
                    }
                  }
                  o = s;
                }
                for (var l = 0; l < o.length; l++) n[o[l]].end = 0;
                return { map: n, table: e };
              })(
                (function (t) {
                  for (var r = [], n = 0; n < t.length; n++) {
                    var o = t[n];
                    switch (o.mode) {
                      case K.NUMERIC:
                        r.push([
                          o,
                          {
                            data: o.data,
                            mode: K.ALPHANUMERIC,
                            length: o.length,
                          },
                          { data: o.data, mode: K.BYTE, length: o.length },
                        ]);
                        break;
                      case K.ALPHANUMERIC:
                        r.push([
                          o,
                          { data: o.data, mode: K.BYTE, length: o.length },
                        ]);
                        break;
                      case K.KANJI:
                        r.push([
                          o,
                          { data: o.data, mode: K.BYTE, length: e(o.data) },
                        ]);
                        break;
                      case K.BYTE:
                        r.push([
                          { data: o.data, mode: K.BYTE, length: e(o.data) },
                        ]);
                    }
                  }
                  return r;
                })(o(t, s())),
                n
              ),
              u = et.find_path(a.map, "start", "end"),
              f = [],
              h = 1;
            h < u.length - 1;
            h++
          )
            f.push(a.table[u[h]].node);
          return r.fromArray(
            (function (t) {
              return t.reduce(function (t, r) {
                var e = t.length - 1 >= 0 ? t[t.length - 1] : null;
                return e && e.mode === r.mode
                  ? ((t[t.length - 1].data += r.data), t)
                  : (t.push(r), t);
              }, []);
            })(f)
          );
        }),
        (r.rawSplit = function (t) {
          return r.fromArray(o(t, s()));
        }));
    });
  function ot(t, r, e) {
    var n,
      o,
      i = t.size,
      a = q(r, e);
    for (n = 0; n < 15; n++)
      ((o = 1 == ((a >> n) & 1)),
        n < 6
          ? t.set(n, 8, o, !0)
          : n < 8
            ? t.set(n + 1, 8, o, !0)
            : t.set(i - 15 + n, 8, o, !0),
        n < 8
          ? t.set(8, i - n - 1, o, !0)
          : n < 9
            ? t.set(8, 15 - n - 1 + 1, o, !0)
            : t.set(8, 15 - n - 1, o, !0));
    t.set(i - 8, 8, 1, !0);
  }
  function it(t, r, e) {
    var n = new d();
    e.forEach(function (r) {
      (n.put(r.mode.bit, 4),
        n.put(r.getLength(), K.getCharCountIndicator(r.mode, t)),
        r.write(n));
    });
    var o = 8 * (i(t) - I(t, r));
    for (
      n.getLengthInBits() + 4 <= o && n.put(0, 4);
      n.getLengthInBits() % 8 != 0;

    )
      n.putBit(0);
    for (var a = (o - n.getLengthInBits()) / 8, u = 0; u < a; u++)
      n.put(u % 2 ? 17 : 236, 8);
    return (function (t, r, e) {
      for (
        var n = i(r),
          o = I(r, e),
          a = n - o,
          u = B(r, e),
          s = u - (n % u),
          f = Math.floor(n / u),
          h = Math.floor(a / u),
          c = h + 1,
          g = f - h,
          d = new L(g),
          l = 0,
          v = new Array(u),
          p = new Array(u),
          w = 0,
          m = new Uint8Array(t.buffer),
          E = 0;
        E < u;
        E++
      ) {
        var y = E < s ? h : c;
        ((v[E] = m.slice(l, l + y)),
          (p[E] = d.encode(v[E])),
          (l += y),
          (w = Math.max(w, y)));
      }
      var A,
        M,
        N = new Uint8Array(n),
        C = 0;
      for (A = 0; A < w; A++)
        for (M = 0; M < u; M++) A < v[M].length && (N[C++] = v[M][A]);
      for (A = 0; A < g; A++) for (M = 0; M < u; M++) N[C++] = p[M][A];
      return N;
    })(n, t, r);
  }
  function at(t, r, e, n) {
    var i;
    if (Array.isArray(t)) i = nt.fromArray(t);
    else {
      if ("string" != typeof t) throw new Error("Invalid data");
      var a = r;
      if (!a) {
        var u = nt.rawSplit(t);
        a = O.getBestVersionForData(u, e);
      }
      i = nt.fromString(t, a || 40);
    }
    var s = O.getBestVersionForData(i, e);
    if (!s)
      throw new Error(
        "The amount of data is too big to be stored in a QR Code"
      );
    if (r) {
      if (r < s)
        throw new Error(
          "\nThe chosen QR Code version cannot contain this amount of data.\nMinimum version required to store current data is: " +
            s +
            ".\n"
        );
    } else r = s;
    var f = it(r, e, i),
      h = o(r),
      c = new v(h);
    return (
      (function (t, r) {
        for (var e = t.size, n = m(r), o = 0; o < n.length; o++)
          for (var i = n[o][0], a = n[o][1], u = -1; u <= 7; u++)
            if (!(i + u <= -1 || e <= i + u))
              for (var s = -1; s <= 7; s++)
                a + s <= -1 ||
                  e <= a + s ||
                  ((u >= 0 && u <= 6 && (0 === s || 6 === s)) ||
                  (s >= 0 && s <= 6 && (0 === u || 6 === u)) ||
                  (u >= 2 && u <= 4 && s >= 2 && s <= 4)
                    ? t.set(i + u, a + s, !0, !0)
                    : t.set(i + u, a + s, !1, !0));
      })(c, r),
      (function (t) {
        for (var r = t.size, e = 8; e < r - 8; e++) {
          var n = e % 2 == 0;
          (t.set(e, 6, n, !0), t.set(6, e, n, !0));
        }
      })(c),
      (function (t, r) {
        for (var e = p.getPositions(r), n = 0; n < e.length; n++)
          for (var o = e[n][0], i = e[n][1], a = -2; a <= 2; a++)
            for (var u = -2; u <= 2; u++)
              -2 === a || 2 === a || -2 === u || 2 === u || (0 === a && 0 === u)
                ? t.set(o + a, i + u, !0, !0)
                : t.set(o + a, i + u, !1, !0);
      })(c, r),
      ot(c, e, 0),
      r >= 7 &&
        (function (t, r) {
          for (
            var e, n, o, i = t.size, a = O.getEncodedBits(r), u = 0;
            u < 18;
            u++
          )
            ((e = Math.floor(u / 3)),
              (n = (u % 3) + i - 8 - 3),
              (o = 1 == ((a >> u) & 1)),
              t.set(e, n, o, !0),
              t.set(n, e, o, !0));
        })(c, r),
      (function (t, r) {
        for (
          var e = t.size, n = -1, o = e - 1, i = 7, a = 0, u = e - 1;
          u > 0;
          u -= 2
        )
          for (6 === u && u--; ; ) {
            for (var s = 0; s < 2; s++)
              if (!t.isReserved(o, u - s)) {
                var f = !1;
                (a < r.length && (f = 1 == ((r[a] >>> i) & 1)),
                  t.set(o, u - s, f),
                  -1 == --i && (a++, (i = 7)));
              }
            if ((o += n) < 0 || e <= o) {
              ((o -= n), (n = -n));
              break;
            }
          }
      })(c, f),
      isNaN(n) && (n = E.getBestMask(c, ot.bind(null, c, e))),
      E.applyMask(n, c),
      ot(c, e, n),
      {
        modules: c,
        version: r,
        errorCorrectionLevel: e,
        maskPattern: n,
        segments: i,
      }
    );
  }
  var ut = function (t, r) {
      if (void 0 === t || "" === t) throw new Error("No input text");
      var e,
        n,
        o = c.M;
      return (
        void 0 !== r &&
          ((o = c.from(r.errorCorrectionLevel, c.M)),
          (e = O.from(r.version)),
          (n = E.from(r.maskPattern)),
          r.toSJISFunc && u(r.toSJISFunc)),
        at(t, e, o, n)
      );
    },
    st = h(function (t, r) {
      function e(t) {
        if (("number" == typeof t && (t = t.toString()), "string" != typeof t))
          throw new Error("Color should be defined as hex string");
        var r = t.slice().replace("#", "").split("");
        if (r.length < 3 || 5 === r.length || r.length > 8)
          throw new Error("Invalid hex color: " + t);
        ((3 !== r.length && 4 !== r.length) ||
          (r = Array.prototype.concat.apply(
            [],
            r.map(function (t) {
              return [t, t];
            })
          )),
          6 === r.length && r.push("F", "F"));
        var e = parseInt(r.join(""), 16);
        return {
          r: (e >> 24) & 255,
          g: (e >> 16) & 255,
          b: (e >> 8) & 255,
          a: 255 & e,
          hex: "#" + r.slice(0, 6).join(""),
        };
      }
      ((r.getOptions = function (t) {
        (t || (t = {}), t.color || (t.color = {}));
        var r =
            void 0 === t.margin || null === t.margin || t.margin < 0
              ? 4
              : t.margin,
          n = t.width && t.width >= 21 ? t.width : void 0,
          o = t.scale || 4;
        return {
          width: n,
          scale: n ? 4 : o,
          margin: r,
          color: {
            dark: e(t.color.dark || "#000000ff"),
            light: e(t.color.light || "#ffffffff"),
          },
          type: t.type,
          rendererOpts: t.rendererOpts || {},
        };
      }),
        (r.getScale = function (t, r) {
          return r.width && r.width >= t + 2 * r.margin
            ? r.width / (t + 2 * r.margin)
            : r.scale;
        }),
        (r.getImageWidth = function (t, e) {
          var n = r.getScale(t, e);
          return Math.floor((t + 2 * e.margin) * n);
        }),
        (r.qrToImageData = function (t, e, n) {
          for (
            var o = e.modules.size,
              i = e.modules.data,
              a = r.getScale(o, n),
              u = Math.floor((o + 2 * n.margin) * a),
              s = n.margin * a,
              f = [n.color.light, n.color.dark],
              h = 0;
            h < u;
            h++
          )
            for (var c = 0; c < u; c++) {
              var g = 4 * (h * u + c),
                d = n.color.light;
              if (h >= s && c >= s && h < u - s && c < u - s)
                d =
                  f[
                    i[Math.floor((h - s) / a) * o + Math.floor((c - s) / a)]
                      ? 1
                      : 0
                  ];
              ((t[g++] = d.r), (t[g++] = d.g), (t[g++] = d.b), (t[g] = d.a));
            }
        }));
    }),
    ft = h(function (t, r) {
      ((r.render = function (t, r, e) {
        var n = e,
          o = r;
        (void 0 !== n || (r && r.getContext) || ((n = r), (r = void 0)),
          r ||
            (o = (function () {
              try {
                return document.createElement("canvas");
              } catch (t) {
                throw new Error("You need to specify a canvas element");
              }
            })()),
          (n = st.getOptions(n)));
        var i = st.getImageWidth(t.modules.size, n),
          a = o.getContext("2d"),
          u = a.createImageData(i, i);
        return (
          st.qrToImageData(u.data, t, n),
          (function (t, r, e) {
            (t.clearRect(0, 0, r.width, r.height),
              r.style || (r.style = {}),
              (r.height = e),
              (r.width = e),
              (r.style.height = e + "px"),
              (r.style.width = e + "px"));
          })(a, o, i),
          a.putImageData(u, 0, 0),
          o
        );
      }),
        (r.renderToDataURL = function (t, e, n) {
          var o = n;
          (void 0 !== o || (e && e.getContext) || ((o = e), (e = void 0)),
            o || (o = {}));
          var i = r.render(t, e, o),
            a = o.type || "image/png",
            u = o.rendererOpts || {};
          return i.toDataURL(a, u.quality);
        }));
    });
  function ht(t, r) {
    var e = t.a / 255,
      n = r + '="' + t.hex + '"';
    return e < 1 ? n + " " + r + '-opacity="' + e.toFixed(2).slice(1) + '"' : n;
  }
  function ct(t, r, e) {
    var n = t + r;
    return (void 0 !== e && (n += " " + e), n);
  }
  var gt = function (t, r, e) {
    var n = st.getOptions(r),
      o = t.modules.size,
      i = t.modules.data,
      a = o + 2 * n.margin,
      u = n.color.light.a
        ? "<path " +
          ht(n.color.light, "fill") +
          ' d="M0 0h' +
          a +
          "v" +
          a +
          'H0z"/>'
        : "",
      s =
        "<path " +
        ht(n.color.dark, "stroke") +
        ' d="' +
        (function (t, r, e) {
          for (var n = "", o = 0, i = !1, a = 0, u = 0; u < t.length; u++) {
            var s = Math.floor(u % r),
              f = Math.floor(u / r);
            (s || i || (i = !0),
              t[u]
                ? (a++,
                  (u > 0 && s > 0 && t[u - 1]) ||
                    ((n += i ? ct("M", s + e, 0.5 + f + e) : ct("m", o, 0)),
                    (o = 0),
                    (i = !1)),
                  (s + 1 < r && t[u + 1]) || ((n += ct("h", a)), (a = 0)))
                : o++);
          }
          return n;
        })(i, o, n.margin) +
        '"/>',
      f = 'viewBox="0 0 ' + a + " " + a + '"',
      h =
        '<svg xmlns="http://www.w3.org/2000/svg" ' +
        (n.width ? 'width="' + n.width + '" height="' + n.width + '" ' : "") +
        f +
        ' shape-rendering="crispEdges">' +
        u +
        s +
        "</svg>\n";
    return ("function" == typeof e && e(null, h), h);
  };
  function dt(t, r, n, o, i) {
    var a = [].slice.call(arguments, 1),
      u = a.length,
      s = "function" == typeof a[u - 1];
    if (!s && !e()) throw new Error("Callback required as last argument");
    if (!s) {
      if (u < 1) throw new Error("Too few arguments provided");
      return (
        1 === u
          ? ((n = r), (r = o = void 0))
          : 2 !== u || r.getContext || ((o = n), (n = r), (r = void 0)),
        new Promise(function (e, i) {
          try {
            var a = ut(n, o);
            e(t(a, r, o));
          } catch (t) {
            i(t);
          }
        })
      );
    }
    if (u < 2) throw new Error("Too few arguments provided");
    2 === u
      ? ((i = n), (n = r), (r = o = void 0))
      : 3 === u &&
        (r.getContext && void 0 === i
          ? ((i = o), (o = void 0))
          : ((i = o), (o = n), (n = r), (r = void 0)));
    try {
      var f = ut(n, o);
      i(null, t(f, r, o));
    } catch (t) {
      i(t);
    }
  }
  var lt = ut,
    vt = dt.bind(null, ft.render),
    pt = dt.bind(null, ft.renderToDataURL),
    wt = dt.bind(null, function (t, r, e) {
      return gt(t, e);
    }),
    mt = { create: lt, toCanvas: vt, toDataURL: pt, toString: wt };
  return (
    (t.create = lt),
    (t.default = mt),
    (t.toCanvas = vt),
    (t.toDataURL = pt),
    (t.toString = wt),
    Object.defineProperty(t, "__esModule", { value: !0 }),
    t
  );
})({});
