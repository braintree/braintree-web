/*!
 * Braintree End-to-End Encryption Library
 * https://www.braintreepayments.com
 * Copyright (c) 2009-2014 Braintree, a division of PayPal, Inc.
 *
 * JSBN
 * Copyright (c) 2005  Tom Wu
 *
 * Both Licensed under the MIT License.
 * http://opensource.org/licenses/MIT
 *
 * ASN.1 JavaScript decoder
 * Copyright (c) 2008-2009 Lapo Luchini <lapo@lapo.it>
 * Licensed under the ISC License.
 * http://opensource.org/licenses/ISC
 */

(function () {
// ASN.1 JavaScript decoder
// Copyright (c) 2008-2009 Lapo Luchini <lapo@lapo.it>

// Permission to use, copy, modify, and/or distribute this software for any
// purpose with or without fee is hereby granted, provided that the above
// copyright notice and this permission notice appear in all copies.
// 
// THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
// WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
// ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
// WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
// ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
// OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

function Stream(enc, pos) {
    if (enc instanceof Stream) {
        this.enc = enc.enc;
        this.pos = enc.pos;
    } else {
        this.enc = enc;
        this.pos = pos;
    }
}
Stream.prototype.get = function(pos) {
    if (pos == undefined)
        pos = this.pos++;
    if (pos >= this.enc.length)
        throw 'Requesting byte offset ' + pos + ' on a stream of length ' + this.enc.length;
    return this.enc[pos];
}
Stream.prototype.hexDigits = "0123456789ABCDEF";
Stream.prototype.hexByte = function(b) {
    return this.hexDigits.charAt((b >> 4) & 0xF) + this.hexDigits.charAt(b & 0xF);
}
Stream.prototype.hexDump = function(start, end) {
    var s = "";
    for (var i = start; i < end; ++i) {
        s += this.hexByte(this.get(i));
        switch (i & 0xF) {
        case 0x7: s += "  "; break;
        case 0xF: s += "\n"; break;
        default:  s += " ";
        }
    }
    return s;
}
Stream.prototype.parseStringISO = function(start, end) {
    var s = "";
    for (var i = start; i < end; ++i)
        s += String.fromCharCode(this.get(i));
    return s;
}
Stream.prototype.parseStringUTF = function(start, end) {
    var s = "", c = 0;
    for (var i = start; i < end; ) {
        var c = this.get(i++);
        if (c < 128)
            s += String.fromCharCode(c);
        else if ((c > 191) && (c < 224))
            s += String.fromCharCode(((c & 0x1F) << 6) | (this.get(i++) & 0x3F));
        else
            s += String.fromCharCode(((c & 0x0F) << 12) | ((this.get(i++) & 0x3F) << 6) | (this.get(i++) & 0x3F));
        //TODO: this doesn't check properly 'end', some char could begin before and end after
    }
    return s;
}
Stream.prototype.reTime = /^((?:1[89]|2\d)?\d\d)(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])([01]\d|2[0-3])(?:([0-5]\d)(?:([0-5]\d)(?:[.,](\d{1,3}))?)?)?(Z|[-+](?:[0]\d|1[0-2])([0-5]\d)?)?$/;
Stream.prototype.parseTime = function(start, end) {
    var s = this.parseStringISO(start, end);
    var m = this.reTime.exec(s);
    if (!m)
        return "Unrecognized time: " + s;
    s = m[1] + "-" + m[2] + "-" + m[3] + " " + m[4];
    if (m[5]) {
        s += ":" + m[5];
        if (m[6]) {
            s += ":" + m[6];
            if (m[7])
                s += "." + m[7];
        }
    }
    if (m[8]) {
        s += " UTC";
        if (m[8] != 'Z') {
            s += m[8];
            if (m[9])
                s += ":" + m[9];
        }
    }
    return s;
}
Stream.prototype.parseInteger = function(start, end) {
    //TODO support negative numbers
    var len = end - start;
    if (len > 4) {
        len <<= 3;
        var s = this.get(start);
        if (s == 0)
            len -= 8;
        else
            while (s < 128) {
                s <<= 1;
                --len;
            }
        return "(" + len + " bit)";
    }
    var n = 0;
    for (var i = start; i < end; ++i)
        n = (n << 8) | this.get(i);
    return n;
}
Stream.prototype.parseBitString = function(start, end) {
    var unusedBit = this.get(start);
    var lenBit = ((end - start - 1) << 3) - unusedBit;
    var s  = "(" + lenBit + " bit)";
    if (lenBit <= 20) {
        var skip = unusedBit;
        s += " ";
        for (var i = end - 1; i > start; --i) {
            var b = this.get(i);
            for (var j = skip; j < 8; ++j)
                s += (b >> j) & 1 ? "1" : "0";
            skip = 0;
        }
    }
    return s;
}
Stream.prototype.parseOctetString = function(start, end) {
    var len = end - start;
    var s = "(" + len + " byte) ";
    if (len > 20)
        end = start + 20;
    for (var i = start; i < end; ++i)
        s += this.hexByte(this.get(i));
    if (len > 20)
        s += String.fromCharCode(8230); // ellipsis
    return s;
}
Stream.prototype.parseOID = function(start, end) {
    var s, n = 0, bits = 0;
    for (var i = start; i < end; ++i) {
        var v = this.get(i);
        n = (n << 7) | (v & 0x7F);
        bits += 7;
        if (!(v & 0x80)) { // finished
            if (s == undefined)
                s = parseInt(n / 40) + "." + (n % 40);
            else
                s += "." + ((bits >= 31) ? "bigint" : n);
            n = bits = 0;
        }
        s += String.fromCharCode();
    }
    return s;
}

function ASN1(stream, header, length, tag, sub) {
    this.stream = stream;
    this.header = header;
    this.length = length;
    this.tag = tag;
    this.sub = sub;
}
ASN1.prototype.typeName = function() {
    if (this.tag == undefined)
        return "unknown";
    var tagClass = this.tag >> 6;
    var tagConstructed = (this.tag >> 5) & 1;
    var tagNumber = this.tag & 0x1F;
    switch (tagClass) {
    case 0: // universal
        switch (tagNumber) {
        case 0x00: return "EOC";
        case 0x01: return "BOOLEAN";
        case 0x02: return "INTEGER";
        case 0x03: return "BIT_STRING";
        case 0x04: return "OCTET_STRING";
        case 0x05: return "NULL";
        case 0x06: return "OBJECT_IDENTIFIER";
        case 0x07: return "ObjectDescriptor";
        case 0x08: return "EXTERNAL";
        case 0x09: return "REAL";
        case 0x0A: return "ENUMERATED";
        case 0x0B: return "EMBEDDED_PDV";
        case 0x0C: return "UTF8String";
        case 0x10: return "SEQUENCE";
        case 0x11: return "SET";
        case 0x12: return "NumericString";
        case 0x13: return "PrintableString"; // ASCII subset
        case 0x14: return "TeletexString"; // aka T61String
        case 0x15: return "VideotexString";
        case 0x16: return "IA5String"; // ASCII
        case 0x17: return "UTCTime";
        case 0x18: return "GeneralizedTime";
        case 0x19: return "GraphicString";
        case 0x1A: return "VisibleString"; // ASCII subset
        case 0x1B: return "GeneralString";
        case 0x1C: return "UniversalString";
        case 0x1E: return "BMPString";
        default: return "Universal_" + tagNumber.toString(16);
        }
    case 1: return "Application_" + tagNumber.toString(16);
    case 2: return "[" + tagNumber + "]"; // Context
    case 3: return "Private_" + tagNumber.toString(16);
    }
}
ASN1.prototype.content = function() {
    if (this.tag == undefined)
        return null;
    var tagClass = this.tag >> 6;
    if (tagClass != 0) // universal
        return (this.sub == null) ? null : "(" + this.sub.length + ")";
    var tagNumber = this.tag & 0x1F;
    var content = this.posContent();
    var len = Math.abs(this.length);
    switch (tagNumber) {
    case 0x01: // BOOLEAN
        return (this.stream.get(content) == 0) ? "false" : "true";
    case 0x02: // INTEGER
        return this.stream.parseInteger(content, content + len);
    case 0x03: // BIT_STRING
        return this.sub ? "(" + this.sub.length + " elem)" :
            this.stream.parseBitString(content, content + len)
    case 0x04: // OCTET_STRING
        return this.sub ? "(" + this.sub.length + " elem)" :
            this.stream.parseOctetString(content, content + len)
    //case 0x05: // NULL
    case 0x06: // OBJECT_IDENTIFIER
        return this.stream.parseOID(content, content + len);
    //case 0x07: // ObjectDescriptor
    //case 0x08: // EXTERNAL
    //case 0x09: // REAL
    //case 0x0A: // ENUMERATED
    //case 0x0B: // EMBEDDED_PDV
    case 0x10: // SEQUENCE
    case 0x11: // SET
        return "(" + this.sub.length + " elem)";
    case 0x0C: // UTF8String
        return this.stream.parseStringUTF(content, content + len);
    case 0x12: // NumericString
    case 0x13: // PrintableString
    case 0x14: // TeletexString
    case 0x15: // VideotexString
    case 0x16: // IA5String
    //case 0x19: // GraphicString
    case 0x1A: // VisibleString
    //case 0x1B: // GeneralString
    //case 0x1C: // UniversalString
    //case 0x1E: // BMPString
        return this.stream.parseStringISO(content, content + len);
    case 0x17: // UTCTime
    case 0x18: // GeneralizedTime
        return this.stream.parseTime(content, content + len);
    }
    return null;
}
ASN1.prototype.toString = function() {
    return this.typeName() + "@" + this.stream.pos + "[header:" + this.header + ",length:" + this.length + ",sub:" + ((this.sub == null) ? 'null' : this.sub.length) + "]";
}
ASN1.prototype.print = function(indent) {
    if (indent == undefined) indent = '';
    document.writeln(indent + this);
    if (this.sub != null) {
        indent += '  ';
        for (var i = 0, max = this.sub.length; i < max; ++i)
            this.sub[i].print(indent);
    }
}
ASN1.prototype.toPrettyString = function(indent) {
    if (indent == undefined) indent = '';
    var s = indent + this.typeName() + " @" + this.stream.pos;
    if (this.length >= 0)
        s += "+";
    s += this.length;
    if (this.tag & 0x20)
        s += " (constructed)";
    else if (((this.tag == 0x03) || (this.tag == 0x04)) && (this.sub != null))
        s += " (encapsulates)";
    s += "\n";
    if (this.sub != null) {
        indent += '  ';
        for (var i = 0, max = this.sub.length; i < max; ++i)
            s += this.sub[i].toPrettyString(indent);
    }
    return s;
}
ASN1.prototype.posStart = function() {
    return this.stream.pos;
}
ASN1.prototype.posContent = function() {
    return this.stream.pos + this.header;
}
ASN1.prototype.posEnd = function() {
    return this.stream.pos + this.header + Math.abs(this.length);
}
ASN1.decodeLength = function(stream) {
    var buf = stream.get();
    var len = buf & 0x7F;
    if (len == buf)
        return len;
    if (len > 3)
        throw "Length over 24 bits not supported at position " + (stream.pos - 1);
    if (len == 0)
        return -1; // undefined
    buf = 0;
    for (var i = 0; i < len; ++i)
        buf = (buf << 8) | stream.get();
    return buf;
}
ASN1.hasContent = function(tag, len, stream) {
    if (tag & 0x20) // constructed
        return true;
    if ((tag < 0x03) || (tag > 0x04))
        return false;
    var p = new Stream(stream);
    if (tag == 0x03) p.get(); // BitString unused bits, must be in [0, 7]
    var subTag = p.get();
    if ((subTag >> 6) & 0x01) // not (universal or context)
        return false;
    try {
        var subLength = ASN1.decodeLength(p);
        return ((p.pos - stream.pos) + subLength == len);
    } catch (exception) {
        return false;
    }
}
ASN1.decode = function(stream) {
    if (!(stream instanceof Stream))
        stream = new Stream(stream, 0);
    var streamStart = new Stream(stream);
    var tag = stream.get();
    var len = ASN1.decodeLength(stream);
    var header = stream.pos - streamStart.pos;
    var sub = null;
    if (ASN1.hasContent(tag, len, stream)) {
        // it has content, so we decode it
        var start = stream.pos;
        if (tag == 0x03) stream.get(); // skip BitString unused bits, must be in [0, 7]
        sub = [];
        if (len >= 0) {
            // definite length
            var end = start + len;
            while (stream.pos < end)
                sub[sub.length] = ASN1.decode(stream);
            if (stream.pos != end)
                throw "Content size is not correct for container starting at offset " + start;
        } else {
            // undefined length
            try {
                for (;;) {
                    var s = ASN1.decode(stream);
                    if (s.tag == 0)
                        break;
                    sub[sub.length] = s;
                }
                len = start - stream.pos;
            } catch (e) {
                throw "Exception while decoding undefined length content: " + e;
            }
        }
    } else
        stream.pos += len; // skip content
    return new ASN1(streamStart, header, len, tag, sub);
}
var b64map="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var b64padchar="=";

function hex2b64(h) {
  var i;
  var c;
  var ret = "";
  for(i = 0; i+3 <= h.length; i+=3) {
    c = parseInt(h.substring(i,i+3),16);
    ret += b64map.charAt(c >> 6) + b64map.charAt(c & 63);
  }
  if(i+1 == h.length) {
    c = parseInt(h.substring(i,i+1),16);
    ret += b64map.charAt(c << 2);
  }
  else if(i+2 == h.length) {
    c = parseInt(h.substring(i,i+2),16);
    ret += b64map.charAt(c >> 2) + b64map.charAt((c & 3) << 4);
  }
  while((ret.length & 3) > 0) ret += b64padchar;
  return ret;
}

// convert a base64 string to hex
function b64tohex(s) {
  var ret = "";
  var i;
  var k = 0; // b64 state, 0-3
  var slop;
  var v;
  for(i = 0; i < s.length; ++i) {
    if(s.charAt(i) == b64padchar) break;
    v = b64map.indexOf(s.charAt(i));
    if(v < 0) continue;
    if(k == 0) {
      ret += int2char(v >> 2);
      slop = v & 3;
      k = 1;
    }
    else if(k == 1) {
      ret += int2char((slop << 2) | (v >> 4));
      slop = v & 0xf;
      k = 2;
    }
    else if(k == 2) {
      ret += int2char(slop);
      ret += int2char(v >> 2);
      slop = v & 3;
      k = 3;
    }
    else {
      ret += int2char((slop << 2) | (v >> 4));
      ret += int2char(v & 0xf);
      k = 0;
    }
  }
  if(k == 1)
    ret += int2char(slop << 2);
  return ret;
}

// convert a base64 string to a byte/number array
function b64toBA(s) {
  //piggyback on b64tohex for now, optimize later
  var h = b64tohex(s);
  var i;
  var a = new Array();
  for(i = 0; 2*i < h.length; ++i) {
    a[i] = parseInt(h.substring(2*i,2*i+2),16);
  }
  return a;
}
// Copyright (c) 2005  Tom Wu
// All Rights Reserved.
// See "LICENSE" for details.

// Basic JavaScript BN library - subset useful for RSA encryption.

// Bits per digit
var dbits;

// JavaScript engine analysis
var canary = 0xdeadbeefcafe;
var j_lm = ((canary&0xffffff)==0xefcafe);

// (public) Constructor
function BigInteger(a,b,c) {
  if(a != null)
    if("number" == typeof a) this.fromNumber(a,b,c);
    else if(b == null && "string" != typeof a) this.fromString(a,256);
    else this.fromString(a,b);
}

// return new, unset BigInteger
function nbi() { return new BigInteger(null); }

// am: Compute w_j += (x*this_i), propagate carries,
// c is initial carry, returns final carry.
// c < 3*dvalue, x < 2*dvalue, this_i < dvalue
// We need to select the fastest one that works in this environment.

// am1: use a single mult and divide to get the high bits,
// max digit bits should be 26 because
// max internal value = 2*dvalue^2-2*dvalue (< 2^53)
function am1(i,x,w,j,c,n) {
  while(--n >= 0) {
    var v = x*this[i++]+w[j]+c;
    c = Math.floor(v/0x4000000);
    w[j++] = v&0x3ffffff;
  }
  return c;
}
// am2 avoids a big mult-and-extract completely.
// Max digit bits should be <= 30 because we do bitwise ops
// on values up to 2*hdvalue^2-hdvalue-1 (< 2^31)
function am2(i,x,w,j,c,n) {
  var xl = x&0x7fff, xh = x>>15;
  while(--n >= 0) {
    var l = this[i]&0x7fff;
    var h = this[i++]>>15;
    var m = xh*l+h*xl;
    l = xl*l+((m&0x7fff)<<15)+w[j]+(c&0x3fffffff);
    c = (l>>>30)+(m>>>15)+xh*h+(c>>>30);
    w[j++] = l&0x3fffffff;
  }
  return c;
}
// Alternately, set max digit bits to 28 since some
// browsers slow down when dealing with 32-bit numbers.
function am3(i,x,w,j,c,n) {
  var xl = x&0x3fff, xh = x>>14;
  while(--n >= 0) {
    var l = this[i]&0x3fff;
    var h = this[i++]>>14;
    var m = xh*l+h*xl;
    l = xl*l+((m&0x3fff)<<14)+w[j]+c;
    c = (l>>28)+(m>>14)+xh*h;
    w[j++] = l&0xfffffff;
  }
  return c;
}
if(j_lm && (navigator.appName == "Microsoft Internet Explorer")) {
  BigInteger.prototype.am = am2;
  dbits = 30;
}
else if(j_lm && (navigator.appName != "Netscape")) {
  BigInteger.prototype.am = am1;
  dbits = 26;
}
else { // Mozilla/Netscape seems to prefer am3
  BigInteger.prototype.am = am3;
  dbits = 28;
}

BigInteger.prototype.DB = dbits;
BigInteger.prototype.DM = ((1<<dbits)-1);
BigInteger.prototype.DV = (1<<dbits);

var BI_FP = 52;
BigInteger.prototype.FV = Math.pow(2,BI_FP);
BigInteger.prototype.F1 = BI_FP-dbits;
BigInteger.prototype.F2 = 2*dbits-BI_FP;

// Digit conversions
var BI_RM = "0123456789abcdefghijklmnopqrstuvwxyz";
var BI_RC = new Array();
var rr,vv;
rr = "0".charCodeAt(0);
for(vv = 0; vv <= 9; ++vv) BI_RC[rr++] = vv;
rr = "a".charCodeAt(0);
for(vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;
rr = "A".charCodeAt(0);
for(vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;

function int2char(n) { return BI_RM.charAt(n); }
function intAt(s,i) {
  var c = BI_RC[s.charCodeAt(i)];
  return (c==null)?-1:c;
}

// (protected) copy this to r
function bnpCopyTo(r) {
  for(var i = this.t-1; i >= 0; --i) r[i] = this[i];
  r.t = this.t;
  r.s = this.s;
}

// (protected) set from integer value x, -DV <= x < DV
function bnpFromInt(x) {
  this.t = 1;
  this.s = (x<0)?-1:0;
  if(x > 0) this[0] = x;
  else if(x < -1) this[0] = x+this.DV;
  else this.t = 0;
}

// return bigint initialized to value
function nbv(i) { var r = nbi(); r.fromInt(i); return r; }

// (protected) set from string and radix
function bnpFromString(s,b) {
  var k;
  if(b == 16) k = 4;
  else if(b == 8) k = 3;
  else if(b == 256) k = 8; // byte array
  else if(b == 2) k = 1;
  else if(b == 32) k = 5;
  else if(b == 4) k = 2;
  else { this.fromRadix(s,b); return; }
  this.t = 0;
  this.s = 0;
  var i = s.length, mi = false, sh = 0;
  while(--i >= 0) {
    var x = (k==8)?s[i]&0xff:intAt(s,i);
    if(x < 0) {
      if(s.charAt(i) == "-") mi = true;
      continue;
    }
    mi = false;
    if(sh == 0)
      this[this.t++] = x;
    else if(sh+k > this.DB) {
      this[this.t-1] |= (x&((1<<(this.DB-sh))-1))<<sh;
      this[this.t++] = (x>>(this.DB-sh));
    }
    else
      this[this.t-1] |= x<<sh;
    sh += k;
    if(sh >= this.DB) sh -= this.DB;
  }
  if(k == 8 && (s[0]&0x80) != 0) {
    this.s = -1;
    if(sh > 0) this[this.t-1] |= ((1<<(this.DB-sh))-1)<<sh;
  }
  this.clamp();
  if(mi) BigInteger.ZERO.subTo(this,this);
}

// (protected) clamp off excess high words
function bnpClamp() {
  var c = this.s&this.DM;
  while(this.t > 0 && this[this.t-1] == c) --this.t;
}

// (public) return string representation in given radix
function bnToString(b) {
  if(this.s < 0) return "-"+this.negate().toString(b);
  var k;
  if(b == 16) k = 4;
  else if(b == 8) k = 3;
  else if(b == 2) k = 1;
  else if(b == 32) k = 5;
  else if(b == 4) k = 2;
  else return this.toRadix(b);
  var km = (1<<k)-1, d, m = false, r = "", i = this.t;
  var p = this.DB-(i*this.DB)%k;
  if(i-- > 0) {
    if(p < this.DB && (d = this[i]>>p) > 0) { m = true; r = int2char(d); }
    while(i >= 0) {
      if(p < k) {
        d = (this[i]&((1<<p)-1))<<(k-p);
        d |= this[--i]>>(p+=this.DB-k);
      }
      else {
        d = (this[i]>>(p-=k))&km;
        if(p <= 0) { p += this.DB; --i; }
      }
      if(d > 0) m = true;
      if(m) r += int2char(d);
    }
  }
  return m?r:"0";
}

// (public) -this
function bnNegate() { var r = nbi(); BigInteger.ZERO.subTo(this,r); return r; }

// (public) |this|
function bnAbs() { return (this.s<0)?this.negate():this; }

// (public) return + if this > a, - if this < a, 0 if equal
function bnCompareTo(a) {
  var r = this.s-a.s;
  if(r != 0) return r;
  var i = this.t;
  r = i-a.t;
  if(r != 0) return (this.s<0)?-r:r;
  while(--i >= 0) if((r=this[i]-a[i]) != 0) return r;
  return 0;
}

// returns bit length of the integer x
function nbits(x) {
  var r = 1, t;
  if((t=x>>>16) != 0) { x = t; r += 16; }
  if((t=x>>8) != 0) { x = t; r += 8; }
  if((t=x>>4) != 0) { x = t; r += 4; }
  if((t=x>>2) != 0) { x = t; r += 2; }
  if((t=x>>1) != 0) { x = t; r += 1; }
  return r;
}

// (public) return the number of bits in "this"
function bnBitLength() {
  if(this.t <= 0) return 0;
  return this.DB*(this.t-1)+nbits(this[this.t-1]^(this.s&this.DM));
}

// (protected) r = this << n*DB
function bnpDLShiftTo(n,r) {
  var i;
  for(i = this.t-1; i >= 0; --i) r[i+n] = this[i];
  for(i = n-1; i >= 0; --i) r[i] = 0;
  r.t = this.t+n;
  r.s = this.s;
}

// (protected) r = this >> n*DB
function bnpDRShiftTo(n,r) {
  for(var i = n; i < this.t; ++i) r[i-n] = this[i];
  r.t = Math.max(this.t-n,0);
  r.s = this.s;
}

// (protected) r = this << n
function bnpLShiftTo(n,r) {
  var bs = n%this.DB;
  var cbs = this.DB-bs;
  var bm = (1<<cbs)-1;
  var ds = Math.floor(n/this.DB), c = (this.s<<bs)&this.DM, i;
  for(i = this.t-1; i >= 0; --i) {
    r[i+ds+1] = (this[i]>>cbs)|c;
    c = (this[i]&bm)<<bs;
  }
  for(i = ds-1; i >= 0; --i) r[i] = 0;
  r[ds] = c;
  r.t = this.t+ds+1;
  r.s = this.s;
  r.clamp();
}

// (protected) r = this >> n
function bnpRShiftTo(n,r) {
  r.s = this.s;
  var ds = Math.floor(n/this.DB);
  if(ds >= this.t) { r.t = 0; return; }
  var bs = n%this.DB;
  var cbs = this.DB-bs;
  var bm = (1<<bs)-1;
  r[0] = this[ds]>>bs;
  for(var i = ds+1; i < this.t; ++i) {
    r[i-ds-1] |= (this[i]&bm)<<cbs;
    r[i-ds] = this[i]>>bs;
  }
  if(bs > 0) r[this.t-ds-1] |= (this.s&bm)<<cbs;
  r.t = this.t-ds;
  r.clamp();
}

// (protected) r = this - a
function bnpSubTo(a,r) {
  var i = 0, c = 0, m = Math.min(a.t,this.t);
  while(i < m) {
    c += this[i]-a[i];
    r[i++] = c&this.DM;
    c >>= this.DB;
  }
  if(a.t < this.t) {
    c -= a.s;
    while(i < this.t) {
      c += this[i];
      r[i++] = c&this.DM;
      c >>= this.DB;
    }
    c += this.s;
  }
  else {
    c += this.s;
    while(i < a.t) {
      c -= a[i];
      r[i++] = c&this.DM;
      c >>= this.DB;
    }
    c -= a.s;
  }
  r.s = (c<0)?-1:0;
  if(c < -1) r[i++] = this.DV+c;
  else if(c > 0) r[i++] = c;
  r.t = i;
  r.clamp();
}

// (protected) r = this * a, r != this,a (HAC 14.12)
// "this" should be the larger one if appropriate.
function bnpMultiplyTo(a,r) {
  var x = this.abs(), y = a.abs();
  var i = x.t;
  r.t = i+y.t;
  while(--i >= 0) r[i] = 0;
  for(i = 0; i < y.t; ++i) r[i+x.t] = x.am(0,y[i],r,i,0,x.t);
  r.s = 0;
  r.clamp();
  if(this.s != a.s) BigInteger.ZERO.subTo(r,r);
}

// (protected) r = this^2, r != this (HAC 14.16)
function bnpSquareTo(r) {
  var x = this.abs();
  var i = r.t = 2*x.t;
  while(--i >= 0) r[i] = 0;
  for(i = 0; i < x.t-1; ++i) {
    var c = x.am(i,x[i],r,2*i,0,1);
    if((r[i+x.t]+=x.am(i+1,2*x[i],r,2*i+1,c,x.t-i-1)) >= x.DV) {
      r[i+x.t] -= x.DV;
      r[i+x.t+1] = 1;
    }
  }
  if(r.t > 0) r[r.t-1] += x.am(i,x[i],r,2*i,0,1);
  r.s = 0;
  r.clamp();
}

// (protected) divide this by m, quotient and remainder to q, r (HAC 14.20)
// r != q, this != m.  q or r may be null.
function bnpDivRemTo(m,q,r) {
  var pm = m.abs();
  if(pm.t <= 0) return;
  var pt = this.abs();
  if(pt.t < pm.t) {
    if(q != null) q.fromInt(0);
    if(r != null) this.copyTo(r);
    return;
  }
  if(r == null) r = nbi();
  var y = nbi(), ts = this.s, ms = m.s;
  var nsh = this.DB-nbits(pm[pm.t-1]);	// normalize modulus
  if(nsh > 0) { pm.lShiftTo(nsh,y); pt.lShiftTo(nsh,r); }
  else { pm.copyTo(y); pt.copyTo(r); }
  var ys = y.t;
  var y0 = y[ys-1];
  if(y0 == 0) return;
  var yt = y0*(1<<this.F1)+((ys>1)?y[ys-2]>>this.F2:0);
  var d1 = this.FV/yt, d2 = (1<<this.F1)/yt, e = 1<<this.F2;
  var i = r.t, j = i-ys, t = (q==null)?nbi():q;
  y.dlShiftTo(j,t);
  if(r.compareTo(t) >= 0) {
    r[r.t++] = 1;
    r.subTo(t,r);
  }
  BigInteger.ONE.dlShiftTo(ys,t);
  t.subTo(y,y);	// "negative" y so we can replace sub with am later
  while(y.t < ys) y[y.t++] = 0;
  while(--j >= 0) {
    // Estimate quotient digit
    var qd = (r[--i]==y0)?this.DM:Math.floor(r[i]*d1+(r[i-1]+e)*d2);
    if((r[i]+=y.am(0,qd,r,j,0,ys)) < qd) {	// Try it out
      y.dlShiftTo(j,t);
      r.subTo(t,r);
      while(r[i] < --qd) r.subTo(t,r);
    }
  }
  if(q != null) {
    r.drShiftTo(ys,q);
    if(ts != ms) BigInteger.ZERO.subTo(q,q);
  }
  r.t = ys;
  r.clamp();
  if(nsh > 0) r.rShiftTo(nsh,r);	// Denormalize remainder
  if(ts < 0) BigInteger.ZERO.subTo(r,r);
}

// (public) this mod a
function bnMod(a) {
  var r = nbi();
  this.abs().divRemTo(a,null,r);
  if(this.s < 0 && r.compareTo(BigInteger.ZERO) > 0) a.subTo(r,r);
  return r;
}

// Modular reduction using "classic" algorithm
function Classic(m) { this.m = m; }
function cConvert(x) {
  if(x.s < 0 || x.compareTo(this.m) >= 0) return x.mod(this.m);
  else return x;
}
function cRevert(x) { return x; }
function cReduce(x) { x.divRemTo(this.m,null,x); }
function cMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }
function cSqrTo(x,r) { x.squareTo(r); this.reduce(r); }

Classic.prototype.convert = cConvert;
Classic.prototype.revert = cRevert;
Classic.prototype.reduce = cReduce;
Classic.prototype.mulTo = cMulTo;
Classic.prototype.sqrTo = cSqrTo;

// (protected) return "-1/this % 2^DB"; useful for Mont. reduction
// justification:
//         xy == 1 (mod m)
//         xy =  1+km
//   xy(2-xy) = (1+km)(1-km)
// x[y(2-xy)] = 1-k^2m^2
// x[y(2-xy)] == 1 (mod m^2)
// if y is 1/x mod m, then y(2-xy) is 1/x mod m^2
// should reduce x and y(2-xy) by m^2 at each step to keep size bounded.
// JS multiply "overflows" differently from C/C++, so care is needed here.
function bnpInvDigit() {
  if(this.t < 1) return 0;
  var x = this[0];
  if((x&1) == 0) return 0;
  var y = x&3;		// y == 1/x mod 2^2
  y = (y*(2-(x&0xf)*y))&0xf;	// y == 1/x mod 2^4
  y = (y*(2-(x&0xff)*y))&0xff;	// y == 1/x mod 2^8
  y = (y*(2-(((x&0xffff)*y)&0xffff)))&0xffff;	// y == 1/x mod 2^16
  // last step - calculate inverse mod DV directly;
  // assumes 16 < DB <= 32 and assumes ability to handle 48-bit ints
  y = (y*(2-x*y%this.DV))%this.DV;		// y == 1/x mod 2^dbits
  // we really want the negative inverse, and -DV < y < DV
  return (y>0)?this.DV-y:-y;
}

// Montgomery reduction
function Montgomery(m) {
  this.m = m;
  this.mp = m.invDigit();
  this.mpl = this.mp&0x7fff;
  this.mph = this.mp>>15;
  this.um = (1<<(m.DB-15))-1;
  this.mt2 = 2*m.t;
}

// xR mod m
function montConvert(x) {
  var r = nbi();
  x.abs().dlShiftTo(this.m.t,r);
  r.divRemTo(this.m,null,r);
  if(x.s < 0 && r.compareTo(BigInteger.ZERO) > 0) this.m.subTo(r,r);
  return r;
}

// x/R mod m
function montRevert(x) {
  var r = nbi();
  x.copyTo(r);
  this.reduce(r);
  return r;
}

// x = x/R mod m (HAC 14.32)
function montReduce(x) {
  while(x.t <= this.mt2)	// pad x so am has enough room later
    x[x.t++] = 0;
  for(var i = 0; i < this.m.t; ++i) {
    // faster way of calculating u0 = x[i]*mp mod DV
    var j = x[i]&0x7fff;
    var u0 = (j*this.mpl+(((j*this.mph+(x[i]>>15)*this.mpl)&this.um)<<15))&x.DM;
    // use am to combine the multiply-shift-add into one call
    j = i+this.m.t;
    x[j] += this.m.am(0,u0,x,i,0,this.m.t);
    // propagate carry
    while(x[j] >= x.DV) { x[j] -= x.DV; x[++j]++; }
  }
  x.clamp();
  x.drShiftTo(this.m.t,x);
  if(x.compareTo(this.m) >= 0) x.subTo(this.m,x);
}

// r = "x^2/R mod m"; x != r
function montSqrTo(x,r) { x.squareTo(r); this.reduce(r); }

// r = "xy/R mod m"; x,y != r
function montMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }

Montgomery.prototype.convert = montConvert;
Montgomery.prototype.revert = montRevert;
Montgomery.prototype.reduce = montReduce;
Montgomery.prototype.mulTo = montMulTo;
Montgomery.prototype.sqrTo = montSqrTo;

// (protected) true iff this is even
function bnpIsEven() { return ((this.t>0)?(this[0]&1):this.s) == 0; }

// (protected) this^e, e < 2^32, doing sqr and mul with "r" (HAC 14.79)
function bnpExp(e,z) {
  if(e > 0xffffffff || e < 1) return BigInteger.ONE;
  var r = nbi(), r2 = nbi(), g = z.convert(this), i = nbits(e)-1;
  g.copyTo(r);
  while(--i >= 0) {
    z.sqrTo(r,r2);
    if((e&(1<<i)) > 0) z.mulTo(r2,g,r);
    else { var t = r; r = r2; r2 = t; }
  }
  return z.revert(r);
}

// (public) this^e % m, 0 <= e < 2^32
function bnModPowInt(e,m) {
  var z;
  if(e < 256 || m.isEven()) z = new Classic(m); else z = new Montgomery(m);
  return this.exp(e,z);
}

// protected
BigInteger.prototype.copyTo = bnpCopyTo;
BigInteger.prototype.fromInt = bnpFromInt;
BigInteger.prototype.fromString = bnpFromString;
BigInteger.prototype.clamp = bnpClamp;
BigInteger.prototype.dlShiftTo = bnpDLShiftTo;
BigInteger.prototype.drShiftTo = bnpDRShiftTo;
BigInteger.prototype.lShiftTo = bnpLShiftTo;
BigInteger.prototype.rShiftTo = bnpRShiftTo;
BigInteger.prototype.subTo = bnpSubTo;
BigInteger.prototype.multiplyTo = bnpMultiplyTo;
BigInteger.prototype.squareTo = bnpSquareTo;
BigInteger.prototype.divRemTo = bnpDivRemTo;
BigInteger.prototype.invDigit = bnpInvDigit;
BigInteger.prototype.isEven = bnpIsEven;
BigInteger.prototype.exp = bnpExp;

// public
BigInteger.prototype.toString = bnToString;
BigInteger.prototype.negate = bnNegate;
BigInteger.prototype.abs = bnAbs;
BigInteger.prototype.compareTo = bnCompareTo;
BigInteger.prototype.bitLength = bnBitLength;
BigInteger.prototype.mod = bnMod;
BigInteger.prototype.modPowInt = bnModPowInt;

// "constants"
BigInteger.ZERO = nbv(0);
BigInteger.ONE = nbv(1);
// Depends on jsbn.js and rng.js

// Version 1.1: support utf-8 encoding in pkcs1pad2

// convert a (hex) string to a bignum object
function parseBigInt(str,r) {
  return new BigInteger(str,r);
}

function linebrk(s,n) {
  var ret = "";
  var i = 0;
  while(i + n < s.length) {
    ret += s.substring(i,i+n) + "\n";
    i += n;
  }
  return ret + s.substring(i,s.length);
}

function byte2Hex(b) {
  if(b < 0x10)
    return "0" + b.toString(16);
  else
    return b.toString(16);
}

// PKCS#1 (type 2, random) pad input string s to n bytes, and return a bigint
function pkcs1pad2(s,n) {
  if(n < s.length + 11) { // TODO: fix for utf-8
    throw new Error("Message too long for RSA");
  }
  var ba = new Array();
  var i = s.length - 1;
  while(i >= 0 && n > 0) {
    var c = s.charCodeAt(i--);
    if(c < 128) { // encode using utf-8
      ba[--n] = c;
    }
    else if((c > 127) && (c < 2048)) {
      ba[--n] = (c & 63) | 128;
      ba[--n] = (c >> 6) | 192;
    }
    else {
      ba[--n] = (c & 63) | 128;
      ba[--n] = ((c >> 6) & 63) | 128;
      ba[--n] = (c >> 12) | 224;
    }
  }
  ba[--n] = 0;
  var randomByte = 0;
  var random = 0;
  var shift = 0;
  while(n > 2) { // random non-zero pad
    if (shift == 0) {
      random = sjcl.random.randomWords(1, 0)[0];
    }

    randomByte = (random >> shift) & 0xff;
    shift = (shift + 8) % 32;
    if (randomByte != 0) {
      ba[--n] = randomByte;
    }
  }
  ba[--n] = 2;
  ba[--n] = 0;
  return new BigInteger(ba);
}

// "empty" RSA key constructor
function RSAKey() {
  this.n = null;
  this.e = 0;
  this.d = null;
  this.p = null;
  this.q = null;
  this.dmp1 = null;
  this.dmq1 = null;
  this.coeff = null;
}

// Set the public key fields N and e from hex strings
function RSASetPublic(N,E) {
  if(N != null && E != null && N.length > 0 && E.length > 0) {
    this.n = parseBigInt(N,16);
    this.e = parseInt(E,16);
  }
  else
    throw new Error("Invalid RSA public key");
}

// Perform raw public operation on "x": return x^e (mod n)
function RSADoPublic(x) {
  return x.modPowInt(this.e, this.n);
}

// Return the PKCS#1 RSA encryption of "text" as an even-length hex string
function RSAEncrypt(text) {
  var m = pkcs1pad2(text,(this.n.bitLength()+7)>>3);
  if(m == null) return null;
  var c = this.doPublic(m);
  if(c == null) return null;
  var h = c.toString(16);
  if((h.length & 1) == 0) return h; else return "0" + h;
}

// Return the PKCS#1 RSA encryption of "text" as a Base64-encoded string
//function RSAEncryptB64(text) {
//  var h = this.encrypt(text);
//  if(h) return hex2b64(h); else return null;
//}

// protected
RSAKey.prototype.doPublic = RSADoPublic;

// public
RSAKey.prototype.setPublic = RSASetPublic;
RSAKey.prototype.encrypt = RSAEncrypt;
//RSAKey.prototype.encrypt_b64 = RSAEncryptB64;
/** @fileOverview Javascript cryptography implementation.
 *
 * Crush to remove comments, shorten variable names and
 * generally reduce transmission size.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

"use strict";
/*jslint indent: 2, bitwise: false, nomen: false, plusplus: false, white: false, regexp: false */
/*global document, window, escape, unescape */

/** @namespace The Stanford Javascript Crypto Library, top-level namespace. */
var sjcl = {
  /** @namespace Symmetric ciphers. */
  cipher: {},

  /** @namespace Hash functions.  Right now only SHA256 is implemented. */
  hash: {},

  /** @namespace Key exchange functions.  Right now only SRP is implemented. */
  keyexchange: {},
  
  /** @namespace Block cipher modes of operation. */
  mode: {},

  /** @namespace Miscellaneous.  HMAC and PBKDF2. */
  misc: {},
  
  /**
   * @namespace Bit array encoders and decoders.
   *
   * @description
   * The members of this namespace are functions which translate between
   * SJCL's bitArrays and other objects (usually strings).  Because it
   * isn't always clear which direction is encoding and which is decoding,
   * the method names are "fromBits" and "toBits".
   */
  codec: {},
  
  /** @namespace Exceptions. */
  exception: {
    /** @class Ciphertext is corrupt. */
    corrupt: function(message) {
      this.toString = function() { return "CORRUPT: "+this.message; };
      this.message = message;
    },
    
    /** @class Invalid parameter. */
    invalid: function(message) {
      this.toString = function() { return "INVALID: "+this.message; };
      this.message = message;
    },
    
    /** @class Bug or missing feature in SJCL. */
    bug: function(message) {
      this.toString = function() { return "BUG: "+this.message; };
      this.message = message;
    },

    /** @class Something isn't ready. */
    notReady: function(message) {
      this.toString = function() { return "NOT READY: "+this.message; };
      this.message = message;
    }
  }
};

if(typeof module != 'undefined' && module.exports){
  module.exports = sjcl;
}
/** @fileOverview Low-level AES implementation.
 *
 * This file contains a low-level implementation of AES, optimized for
 * size and for efficiency on several browsers.  It is based on
 * OpenSSL's aes_core.c, a public-domain implementation by Vincent
 * Rijmen, Antoon Bosselaers and Paulo Barreto.
 *
 * An older version of this implementation is available in the public
 * domain, but this one is (c) Emily Stark, Mike Hamburg, Dan Boneh,
 * Stanford University 2008-2010 and BSD-licensed for liability
 * reasons.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

/**
 * Schedule out an AES key for both encryption and decryption.  This
 * is a low-level class.  Use a cipher mode to do bulk encryption.
 *
 * @constructor
 * @param {Array} key The key as an array of 4, 6 or 8 words.
 *
 * @class Advanced Encryption Standard (low-level interface)
 */
sjcl.cipher.aes = function (key) {
  if (!this._tables[0][0][0]) {
    this._precompute();
  }
  
  var i, j, tmp,
    encKey, decKey,
    sbox = this._tables[0][4], decTable = this._tables[1],
    keyLen = key.length, rcon = 1;
  
  if (keyLen !== 4 && keyLen !== 6 && keyLen !== 8) {
    throw new sjcl.exception.invalid("invalid aes key size");
  }
  
  this._key = [encKey = key.slice(0), decKey = []];
  
  // schedule encryption keys
  for (i = keyLen; i < 4 * keyLen + 28; i++) {
    tmp = encKey[i-1];
    
    // apply sbox
    if (i%keyLen === 0 || (keyLen === 8 && i%keyLen === 4)) {
      tmp = sbox[tmp>>>24]<<24 ^ sbox[tmp>>16&255]<<16 ^ sbox[tmp>>8&255]<<8 ^ sbox[tmp&255];
      
      // shift rows and add rcon
      if (i%keyLen === 0) {
        tmp = tmp<<8 ^ tmp>>>24 ^ rcon<<24;
        rcon = rcon<<1 ^ (rcon>>7)*283;
      }
    }
    
    encKey[i] = encKey[i-keyLen] ^ tmp;
  }
  
  // schedule decryption keys
  for (j = 0; i; j++, i--) {
    tmp = encKey[j&3 ? i : i - 4];
    if (i<=4 || j<4) {
      decKey[j] = tmp;
    } else {
      decKey[j] = decTable[0][sbox[tmp>>>24      ]] ^
                  decTable[1][sbox[tmp>>16  & 255]] ^
                  decTable[2][sbox[tmp>>8   & 255]] ^
                  decTable[3][sbox[tmp      & 255]];
    }
  }
};

sjcl.cipher.aes.prototype = {
  // public
  /* Something like this might appear here eventually
  name: "AES",
  blockSize: 4,
  keySizes: [4,6,8],
  */
  
  /**
   * Encrypt an array of 4 big-endian words.
   * @param {Array} data The plaintext.
   * @return {Array} The ciphertext.
   */
  encrypt:function (data) { return this._crypt(data,0); },
  
  /**
   * Decrypt an array of 4 big-endian words.
   * @param {Array} data The ciphertext.
   * @return {Array} The plaintext.
   */
  decrypt:function (data) { return this._crypt(data,1); },
  
  /**
   * The expanded S-box and inverse S-box tables.  These will be computed
   * on the client so that we don't have to send them down the wire.
   *
   * There are two tables, _tables[0] is for encryption and
   * _tables[1] is for decryption.
   *
   * The first 4 sub-tables are the expanded S-box with MixColumns.  The
   * last (_tables[01][4]) is the S-box itself.
   *
   * @private
   */
  _tables: [[[],[],[],[],[]],[[],[],[],[],[]]],

  /**
   * Expand the S-box tables.
   *
   * @private
   */
  _precompute: function () {
   var encTable = this._tables[0], decTable = this._tables[1],
       sbox = encTable[4], sboxInv = decTable[4],
       i, x, xInv, d=[], th=[], x2, x4, x8, s, tEnc, tDec;

    // Compute double and third tables
   for (i = 0; i < 256; i++) {
     th[( d[i] = i<<1 ^ (i>>7)*283 )^i]=i;
   }
   
   for (x = xInv = 0; !sbox[x]; x ^= x2 || 1, xInv = th[xInv] || 1) {
     // Compute sbox
     s = xInv ^ xInv<<1 ^ xInv<<2 ^ xInv<<3 ^ xInv<<4;
     s = s>>8 ^ s&255 ^ 99;
     sbox[x] = s;
     sboxInv[s] = x;
     
     // Compute MixColumns
     x8 = d[x4 = d[x2 = d[x]]];
     tDec = x8*0x1010101 ^ x4*0x10001 ^ x2*0x101 ^ x*0x1010100;
     tEnc = d[s]*0x101 ^ s*0x1010100;
     
     for (i = 0; i < 4; i++) {
       encTable[i][x] = tEnc = tEnc<<24 ^ tEnc>>>8;
       decTable[i][s] = tDec = tDec<<24 ^ tDec>>>8;
     }
   }
   
   // Compactify.  Considerable speedup on Firefox.
   for (i = 0; i < 5; i++) {
     encTable[i] = encTable[i].slice(0);
     decTable[i] = decTable[i].slice(0);
   }
  },
  
  /**
   * Encryption and decryption core.
   * @param {Array} input Four words to be encrypted or decrypted.
   * @param dir The direction, 0 for encrypt and 1 for decrypt.
   * @return {Array} The four encrypted or decrypted words.
   * @private
   */
  _crypt:function (input, dir) {
    if (input.length !== 4) {
      throw new sjcl.exception.invalid("invalid aes block size");
    }
    
    var key = this._key[dir],
        // state variables a,b,c,d are loaded with pre-whitened data
        a = input[0]           ^ key[0],
        b = input[dir ? 3 : 1] ^ key[1],
        c = input[2]           ^ key[2],
        d = input[dir ? 1 : 3] ^ key[3],
        a2, b2, c2,
        
        nInnerRounds = key.length/4 - 2,
        i,
        kIndex = 4,
        out = [0,0,0,0],
        table = this._tables[dir],
        
        // load up the tables
        t0    = table[0],
        t1    = table[1],
        t2    = table[2],
        t3    = table[3],
        sbox  = table[4];
 
    // Inner rounds.  Cribbed from OpenSSL.
    for (i = 0; i < nInnerRounds; i++) {
      a2 = t0[a>>>24] ^ t1[b>>16 & 255] ^ t2[c>>8 & 255] ^ t3[d & 255] ^ key[kIndex];
      b2 = t0[b>>>24] ^ t1[c>>16 & 255] ^ t2[d>>8 & 255] ^ t3[a & 255] ^ key[kIndex + 1];
      c2 = t0[c>>>24] ^ t1[d>>16 & 255] ^ t2[a>>8 & 255] ^ t3[b & 255] ^ key[kIndex + 2];
      d  = t0[d>>>24] ^ t1[a>>16 & 255] ^ t2[b>>8 & 255] ^ t3[c & 255] ^ key[kIndex + 3];
      kIndex += 4;
      a=a2; b=b2; c=c2;
    }
        
    // Last round.
    for (i = 0; i < 4; i++) {
      out[dir ? 3&-i : i] =
        sbox[a>>>24      ]<<24 ^ 
        sbox[b>>16  & 255]<<16 ^
        sbox[c>>8   & 255]<<8  ^
        sbox[d      & 255]     ^
        key[kIndex++];
      a2=a; a=b; b=c; c=d; d=a2;
    }
    
    return out;
  }
};

/** @fileOverview Arrays of bits, encoded as arrays of Numbers.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

/** @namespace Arrays of bits, encoded as arrays of Numbers.
 *
 * @description
 * <p>
 * These objects are the currency accepted by SJCL's crypto functions.
 * </p>
 *
 * <p>
 * Most of our crypto primitives operate on arrays of 4-byte words internally,
 * but many of them can take arguments that are not a multiple of 4 bytes.
 * This library encodes arrays of bits (whose size need not be a multiple of 8
 * bits) as arrays of 32-bit words.  The bits are packed, big-endian, into an
 * array of words, 32 bits at a time.  Since the words are double-precision
 * floating point numbers, they fit some extra data.  We use this (in a private,
 * possibly-changing manner) to encode the number of bits actually  present
 * in the last word of the array.
 * </p>
 *
 * <p>
 * Because bitwise ops clear this out-of-band data, these arrays can be passed
 * to ciphers like AES which want arrays of words.
 * </p>
 */
sjcl.bitArray = {
  /**
   * Array slices in units of bits.
   * @param {bitArray} a The array to slice.
   * @param {Number} bstart The offset to the start of the slice, in bits.
   * @param {Number} bend The offset to the end of the slice, in bits.  If this is undefined,
   * slice until the end of the array.
   * @return {bitArray} The requested slice.
   */
  bitSlice: function (a, bstart, bend) {
    a = sjcl.bitArray._shiftRight(a.slice(bstart/32), 32 - (bstart & 31)).slice(1);
    return (bend === undefined) ? a : sjcl.bitArray.clamp(a, bend-bstart);
  },

  /**
   * Extract a number packed into a bit array.
   * @param {bitArray} a The array to slice.
   * @param {Number} bstart The offset to the start of the slice, in bits.
   * @param {Number} length The length of the number to extract.
   * @return {Number} The requested slice.
   */
  extract: function(a, bstart, blength) {
    // FIXME: this Math.floor is not necessary at all, but for some reason
    // seems to suppress a bug in the Chromium JIT.
    var x, sh = Math.floor((-bstart-blength) & 31);
    if ((bstart + blength - 1 ^ bstart) & -32) {
      // it crosses a boundary
      x = (a[bstart/32|0] << (32 - sh)) ^ (a[bstart/32+1|0] >>> sh);
    } else {
      // within a single word
      x = a[bstart/32|0] >>> sh;
    }
    return x & ((1<<blength) - 1);
  },

  /**
   * Concatenate two bit arrays.
   * @param {bitArray} a1 The first array.
   * @param {bitArray} a2 The second array.
   * @return {bitArray} The concatenation of a1 and a2.
   */
  concat: function (a1, a2) {
    if (a1.length === 0 || a2.length === 0) {
      return a1.concat(a2);
    }
    
    var out, i, last = a1[a1.length-1], shift = sjcl.bitArray.getPartial(last);
    if (shift === 32) {
      return a1.concat(a2);
    } else {
      return sjcl.bitArray._shiftRight(a2, shift, last|0, a1.slice(0,a1.length-1));
    }
  },

  /**
   * Find the length of an array of bits.
   * @param {bitArray} a The array.
   * @return {Number} The length of a, in bits.
   */
  bitLength: function (a) {
    var l = a.length, x;
    if (l === 0) { return 0; }
    x = a[l - 1];
    return (l-1) * 32 + sjcl.bitArray.getPartial(x);
  },

  /**
   * Truncate an array.
   * @param {bitArray} a The array.
   * @param {Number} len The length to truncate to, in bits.
   * @return {bitArray} A new array, truncated to len bits.
   */
  clamp: function (a, len) {
    if (a.length * 32 < len) { return a; }
    a = a.slice(0, Math.ceil(len / 32));
    var l = a.length;
    len = len & 31;
    if (l > 0 && len) {
      a[l-1] = sjcl.bitArray.partial(len, a[l-1] & 0x80000000 >> (len-1), 1);
    }
    return a;
  },

  /**
   * Make a partial word for a bit array.
   * @param {Number} len The number of bits in the word.
   * @param {Number} x The bits.
   * @param {Number} [0] _end Pass 1 if x has already been shifted to the high side.
   * @return {Number} The partial word.
   */
  partial: function (len, x, _end) {
    if (len === 32) { return x; }
    return (_end ? x|0 : x << (32-len)) + len * 0x10000000000;
  },

  /**
   * Get the number of bits used by a partial word.
   * @param {Number} x The partial word.
   * @return {Number} The number of bits used by the partial word.
   */
  getPartial: function (x) {
    return Math.round(x/0x10000000000) || 32;
  },

  /**
   * Compare two arrays for equality in a predictable amount of time.
   * @param {bitArray} a The first array.
   * @param {bitArray} b The second array.
   * @return {boolean} true if a == b; false otherwise.
   */
  equal: function (a, b) {
    if (sjcl.bitArray.bitLength(a) !== sjcl.bitArray.bitLength(b)) {
      return false;
    }
    var x = 0, i;
    for (i=0; i<a.length; i++) {
      x |= a[i]^b[i];
    }
    return (x === 0);
  },

  /** Shift an array right.
   * @param {bitArray} a The array to shift.
   * @param {Number} shift The number of bits to shift.
   * @param {Number} [carry=0] A byte to carry in
   * @param {bitArray} [out=[]] An array to prepend to the output.
   * @private
   */
  _shiftRight: function (a, shift, carry, out) {
    var i, last2=0, shift2;
    if (out === undefined) { out = []; }
    
    for (; shift >= 32; shift -= 32) {
      out.push(carry);
      carry = 0;
    }
    if (shift === 0) {
      return out.concat(a);
    }
    
    for (i=0; i<a.length; i++) {
      out.push(carry | a[i]>>>shift);
      carry = a[i] << (32-shift);
    }
    last2 = a.length ? a[a.length-1] : 0;
    shift2 = sjcl.bitArray.getPartial(last2);
    out.push(sjcl.bitArray.partial(shift+shift2 & 31, (shift + shift2 > 32) ? carry : out.pop(),1));
    return out;
  },
  
  /** xor a block of 4 words together.
   * @private
   */
  _xor4: function(x,y) {
    return [x[0]^y[0],x[1]^y[1],x[2]^y[2],x[3]^y[3]];
  }
};
/** @fileOverview Bit array codec implementations.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

/** @namespace Hexadecimal */
sjcl.codec.hex = {
  /** Convert from a bitArray to a hex string. */
  fromBits: function (arr) {
    var out = "", i, x;
    for (i=0; i<arr.length; i++) {
      out += ((arr[i]|0)+0xF00000000000).toString(16).substr(4);
    }
    return out.substr(0, sjcl.bitArray.bitLength(arr)/4);//.replace(/(.{8})/g, "$1 ");
  },
  /** Convert from a hex string to a bitArray. */
  toBits: function (str) {
    var i, out=[], len;
    str = str.replace(/\s|0x/g, "");
    len = str.length;
    str = str + "00000000";
    for (i=0; i<str.length; i+=8) {
      out.push(parseInt(str.substr(i,8),16)^0);
    }
    return sjcl.bitArray.clamp(out, len*4);
  }
};

/** @fileOverview Bit array codec implementations.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */
 
/** @namespace UTF-8 strings */
sjcl.codec.utf8String = {
  /** Convert from a bitArray to a UTF-8 string. */
  fromBits: function (arr) {
    var out = "", bl = sjcl.bitArray.bitLength(arr), i, tmp;
    for (i=0; i<bl/8; i++) {
      if ((i&3) === 0) {
        tmp = arr[i/4];
      }
      out += String.fromCharCode(tmp >>> 24);
      tmp <<= 8;
    }
    return decodeURIComponent(escape(out));
  },
  
  /** Convert from a UTF-8 string to a bitArray. */
  toBits: function (str) {
    str = unescape(encodeURIComponent(str));
    var out = [], i, tmp=0;
    for (i=0; i<str.length; i++) {
      tmp = tmp << 8 | str.charCodeAt(i);
      if ((i&3) === 3) {
        out.push(tmp);
        tmp = 0;
      }
    }
    if (i&3) {
      out.push(sjcl.bitArray.partial(8*(i&3), tmp));
    }
    return out;
  }
};
/** @fileOverview Bit array codec implementations.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

/** @namespace Base64 encoding/decoding */
sjcl.codec.base64 = {
  /** The base64 alphabet.
   * @private
   */
  _chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
  
  /** Convert from a bitArray to a base64 string. */
  fromBits: function (arr, _noEquals, _url) {
    var out = "", i, bits=0, c = sjcl.codec.base64._chars, ta=0, bl = sjcl.bitArray.bitLength(arr);
    if (_url) c = c.substr(0,62) + '-_';
    for (i=0; out.length * 6 < bl; ) {
      out += c.charAt((ta ^ arr[i]>>>bits) >>> 26);
      if (bits < 6) {
        ta = arr[i] << (6-bits);
        bits += 26;
        i++;
      } else {
        ta <<= 6;
        bits -= 6;
      }
    }
    while ((out.length & 3) && !_noEquals) { out += "="; }
    return out;
  },
  
  /** Convert from a base64 string to a bitArray */
  toBits: function(str, _url) {
    str = str.replace(/\s|=/g,'');
    var out = [], i, bits=0, c = sjcl.codec.base64._chars, ta=0, x;
    if (_url) c = c.substr(0,62) + '-_';
    for (i=0; i<str.length; i++) {
      x = c.indexOf(str.charAt(i));
      if (x < 0) {
        throw new sjcl.exception.invalid("this isn't base64!");
      }
      if (bits > 26) {
        bits -= 26;
        out.push(ta ^ x>>>bits);
        ta  = x << (32-bits);
      } else {
        bits += 6;
        ta ^= x << (32-bits);
      }
    }
    if (bits&56) {
      out.push(sjcl.bitArray.partial(bits&56, ta, 1));
    }
    return out;
  }
};

sjcl.codec.base64url = {
  fromBits: function (arr) { return sjcl.codec.base64.fromBits(arr,1,1); },
  toBits: function (str) { return sjcl.codec.base64.toBits(str,1); }
};
/** @fileOverview CBC mode implementation
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

/** @namespace
 * Dangerous: CBC mode with PKCS#5 padding.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */
if (sjcl.beware === undefined) {
  sjcl.beware = {};
}
sjcl.beware["CBC mode is dangerous because it doesn't protect message integrity."
] = function() {
  sjcl.mode.cbc = {
    /** The name of the mode.
     * @constant
     */
    name: "cbc",
    
    /** Encrypt in CBC mode with PKCS#5 padding.
     * @param {Object} prp The block cipher.  It must have a block size of 16 bytes.
     * @param {bitArray} plaintext The plaintext data.
     * @param {bitArray} iv The initialization value.
     * @param {bitArray} [adata=[]] The authenticated data.  Must be empty.
     * @return The encrypted data, an array of bytes.
     * @throws {sjcl.exception.invalid} if the IV isn't exactly 128 bits, or if any adata is specified.
     */
    encrypt: function(prp, plaintext, iv, adata) {
      if (adata && adata.length) {
        throw new sjcl.exception.invalid("cbc can't authenticate data");
      }
      if (sjcl.bitArray.bitLength(iv) !== 128) {
        throw new sjcl.exception.invalid("cbc iv must be 128 bits");
      }
      var i,
          w = sjcl.bitArray,
          xor = w._xor4,
          bl = w.bitLength(plaintext),
          bp = 0,
          output = [];

      if (bl&7) {
        throw new sjcl.exception.invalid("pkcs#5 padding only works for multiples of a byte");
      }
    
      for (i=0; bp+128 <= bl; i+=4, bp+=128) {
        /* Encrypt a non-final block */
        iv = prp.encrypt(xor(iv, plaintext.slice(i,i+4)));
        output.splice(i,0,iv[0],iv[1],iv[2],iv[3]);
      }
      
      /* Construct the pad. */
      bl = (16 - ((bl >> 3) & 15)) * 0x1010101;

      /* Pad and encrypt. */
      iv = prp.encrypt(xor(iv,w.concat(plaintext,[bl,bl,bl,bl]).slice(i,i+4)));
      output.splice(i,0,iv[0],iv[1],iv[2],iv[3]);
      return output;
    },
    
    /** Decrypt in CBC mode.
     * @param {Object} prp The block cipher.  It must have a block size of 16 bytes.
     * @param {bitArray} ciphertext The ciphertext data.
     * @param {bitArray} iv The initialization value.
     * @param {bitArray} [adata=[]] The authenticated data.  It must be empty.
     * @return The decrypted data, an array of bytes.
     * @throws {sjcl.exception.invalid} if the IV isn't exactly 128 bits, or if any adata is specified.
     * @throws {sjcl.exception.corrupt} if if the message is corrupt.
     */
    decrypt: function(prp, ciphertext, iv, adata) {
      if (adata && adata.length) {
        throw new sjcl.exception.invalid("cbc can't authenticate data");
      }
      if (sjcl.bitArray.bitLength(iv) !== 128) {
        throw new sjcl.exception.invalid("cbc iv must be 128 bits");
      }
      if ((sjcl.bitArray.bitLength(ciphertext) & 127) || !ciphertext.length) {
        throw new sjcl.exception.corrupt("cbc ciphertext must be a positive multiple of the block size");
      }
      var i,
          w = sjcl.bitArray,
          xor = w._xor4,
          bi, bo,
          output = [];
          
      adata = adata || [];
    
      for (i=0; i<ciphertext.length; i+=4) {
        bi = ciphertext.slice(i,i+4);
        bo = xor(iv,prp.decrypt(bi));
        output.splice(i,0,bo[0],bo[1],bo[2],bo[3]);
        iv = bi;
      }

      /* check and remove the pad */
      bi = output[i-1] & 255;
      if (bi == 0 || bi > 16) {
        throw new sjcl.exception.corrupt("pkcs#5 padding corrupt");
      }
      bo = bi * 0x1010101;
      if (!w.equal(w.bitSlice([bo,bo,bo,bo], 0, bi*8),
                   w.bitSlice(output, output.length*32 - bi*8, output.length*32))) {
        throw new sjcl.exception.corrupt("pkcs#5 padding corrupt");
      }

      return w.bitSlice(output, 0, output.length*32 - bi*8);
    }
  };
};
/** @fileOverview HMAC implementation.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

/** HMAC with the specified hash function.
 * @constructor
 * @param {bitArray} key the key for HMAC.
 * @param {Object} [hash=sjcl.hash.sha256] The hash function to use.
 */
sjcl.misc.hmac = function (key, Hash) {
  this._hash = Hash = Hash || sjcl.hash.sha256;
  var exKey = [[],[]], i,
      bs = Hash.prototype.blockSize / 32;
  this._baseHash = [new Hash(), new Hash()];

  if (key.length > bs) {
    key = Hash.hash(key);
  }
  
  for (i=0; i<bs; i++) {
    exKey[0][i] = key[i]^0x36363636;
    exKey[1][i] = key[i]^0x5C5C5C5C;
  }
  
  this._baseHash[0].update(exKey[0]);
  this._baseHash[1].update(exKey[1]);
};

/** HMAC with the specified hash function.  Also called encrypt since it's a prf.
 * @param {bitArray|String} data The data to mac.
 * @param {Codec} [encoding] the encoding function to use.
 */
sjcl.misc.hmac.prototype.encrypt = sjcl.misc.hmac.prototype.mac = function (data, encoding) {
  var w = new (this._hash)(this._baseHash[0]).update(data, encoding).finalize();
  return new (this._hash)(this._baseHash[1]).update(w).finalize();
};

/** @fileOverview Javascript SHA-256 implementation.
 *
 * An older version of this implementation is available in the public
 * domain, but this one is (c) Emily Stark, Mike Hamburg, Dan Boneh,
 * Stanford University 2008-2010 and BSD-licensed for liability
 * reasons.
 *
 * Special thanks to Aldo Cortesi for pointing out several bugs in
 * this code.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

/**
 * Context for a SHA-256 operation in progress.
 * @constructor
 * @class Secure Hash Algorithm, 256 bits.
 */
sjcl.hash.sha256 = function (hash) {
  if (!this._key[0]) { this._precompute(); }
  if (hash) {
    this._h = hash._h.slice(0);
    this._buffer = hash._buffer.slice(0);
    this._length = hash._length;
  } else {
    this.reset();
  }
};

/**
 * Hash a string or an array of words.
 * @static
 * @param {bitArray|String} data the data to hash.
 * @return {bitArray} The hash value, an array of 16 big-endian words.
 */
sjcl.hash.sha256.hash = function (data) {
  return (new sjcl.hash.sha256()).update(data).finalize();
};

sjcl.hash.sha256.prototype = {
  /**
   * The hash's block size, in bits.
   * @constant
   */
  blockSize: 512,
   
  /**
   * Reset the hash state.
   * @return this
   */
  reset:function () {
    this._h = this._init.slice(0);
    this._buffer = [];
    this._length = 0;
    return this;
  },
  
  /**
   * Input several words to the hash.
   * @param {bitArray|String} data the data to hash.
   * @return this
   */
  update: function (data) {
    if (typeof data === "string") {
      data = sjcl.codec.utf8String.toBits(data);
    }
    var i, b = this._buffer = sjcl.bitArray.concat(this._buffer, data),
        ol = this._length,
        nl = this._length = ol + sjcl.bitArray.bitLength(data);
    for (i = 512+ol & -512; i <= nl; i+= 512) {
      this._block(b.splice(0,16));
    }
    return this;
  },
  
  /**
   * Complete hashing and output the hash value.
   * @return {bitArray} The hash value, an array of 16 big-endian words.
   */
  finalize:function () {
    var i, b = this._buffer, h = this._h;

    // Round out and push the buffer
    b = sjcl.bitArray.concat(b, [sjcl.bitArray.partial(1,1)]);
    
    // Round out the buffer to a multiple of 16 words, less the 2 length words.
    for (i = b.length + 2; i & 15; i++) {
      b.push(0);
    }
    
    // append the length
    b.push(Math.floor(this._length / 0x100000000));
    b.push(this._length | 0);

    while (b.length) {
      this._block(b.splice(0,16));
    }

    this.reset();
    return h;
  },

  /**
   * The SHA-256 initialization vector, to be precomputed.
   * @private
   */
  _init:[],
  /*
  _init:[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],
  */
  
  /**
   * The SHA-256 hash key, to be precomputed.
   * @private
   */
  _key:[],
  /*
  _key:
    [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
     0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
     0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
     0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
     0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
     0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
     0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
     0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2],
  */


  /**
   * Function to precompute _init and _key.
   * @private
   */
  _precompute: function () {
    var i = 0, prime = 2, factor;

    function frac(x) { return (x-Math.floor(x)) * 0x100000000 | 0; }

    outer: for (; i<64; prime++) {
      for (factor=2; factor*factor <= prime; factor++) {
        if (prime % factor === 0) {
          // not a prime
          continue outer;
        }
      }
      
      if (i<8) {
        this._init[i] = frac(Math.pow(prime, 1/2));
      }
      this._key[i] = frac(Math.pow(prime, 1/3));
      i++;
    }
  },
  
  /**
   * Perform one cycle of SHA-256.
   * @param {bitArray} words one block of words.
   * @private
   */
  _block:function (words) {  
    var i, tmp, a, b,
      w = words.slice(0),
      h = this._h,
      k = this._key,
      h0 = h[0], h1 = h[1], h2 = h[2], h3 = h[3],
      h4 = h[4], h5 = h[5], h6 = h[6], h7 = h[7];

    /* Rationale for placement of |0 :
     * If a value can overflow is original 32 bits by a factor of more than a few
     * million (2^23 ish), there is a possibility that it might overflow the
     * 53-bit mantissa and lose precision.
     *
     * To avoid this, we clamp back to 32 bits by |'ing with 0 on any value that
     * propagates around the loop, and on the hash state h[].  I don't believe
     * that the clamps on h4 and on h0 are strictly necessary, but it's close
     * (for h4 anyway), and better safe than sorry.
     *
     * The clamps on h[] are necessary for the output to be correct even in the
     * common case and for short inputs.
     */
    for (i=0; i<64; i++) {
      // load up the input word for this round
      if (i<16) {
        tmp = w[i];
      } else {
        a   = w[(i+1 ) & 15];
        b   = w[(i+14) & 15];
        tmp = w[i&15] = ((a>>>7  ^ a>>>18 ^ a>>>3  ^ a<<25 ^ a<<14) + 
                         (b>>>17 ^ b>>>19 ^ b>>>10 ^ b<<15 ^ b<<13) +
                         w[i&15] + w[(i+9) & 15]) | 0;
      }
      
      tmp = (tmp + h7 + (h4>>>6 ^ h4>>>11 ^ h4>>>25 ^ h4<<26 ^ h4<<21 ^ h4<<7) +  (h6 ^ h4&(h5^h6)) + k[i]); // | 0;
      
      // shift register
      h7 = h6; h6 = h5; h5 = h4;
      h4 = h3 + tmp | 0;
      h3 = h2; h2 = h1; h1 = h0;

      h0 = (tmp +  ((h1&h2) ^ (h3&(h1^h2))) + (h1>>>2 ^ h1>>>13 ^ h1>>>22 ^ h1<<30 ^ h1<<19 ^ h1<<10)) | 0;
    }

    h[0] = h[0]+h0 | 0;
    h[1] = h[1]+h1 | 0;
    h[2] = h[2]+h2 | 0;
    h[3] = h[3]+h3 | 0;
    h[4] = h[4]+h4 | 0;
    h[5] = h[5]+h5 | 0;
    h[6] = h[6]+h6 | 0;
    h[7] = h[7]+h7 | 0;
  }
};


/** @fileOverview Random number generator.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

/** @namespace Random number generator
 *
 * @description
 * <p>
 * This random number generator is a derivative of Ferguson and Schneier's
 * generator Fortuna.  It collects entropy from various events into several
 * pools, implemented by streaming SHA-256 instances.  It differs from
 * ordinary Fortuna in a few ways, though.
 * </p>
 *
 * <p>
 * Most importantly, it has an entropy estimator.  This is present because
 * there is a strong conflict here between making the generator available
 * as soon as possible, and making sure that it doesn't "run on empty".
 * In Fortuna, there is a saved state file, and the system is likely to have
 * time to warm up.
 * </p>
 *
 * <p>
 * Second, because users are unlikely to stay on the page for very long,
 * and to speed startup time, the number of pools increases logarithmically:
 * a new pool is created when the previous one is actually used for a reseed.
 * This gives the same asymptotic guarantees as Fortuna, but gives more
 * entropy to early reseeds.
 * </p>
 *
 * <p>
 * The entire mechanism here feels pretty klunky.  Furthermore, there are
 * several improvements that should be made, including support for
 * dedicated cryptographic functions that may be present in some browsers;
 * state files in local storage; cookies containing randomness; etc.  So
 * look for improvements in future versions.
 * </p>
 */
sjcl.random = {
  /** Generate several random words, and return them in an array
   * @param {Number} nwords The number of words to generate.
   */
  randomWords: function (nwords, paranoia) {
    var out = [], i, readiness = this.isReady(paranoia), g;
  
    if (readiness === this._NOT_READY) {
      throw new sjcl.exception.notReady("generator isn't seeded");
    } else if (readiness & this._REQUIRES_RESEED) {
      this._reseedFromPools(!(readiness & this._READY));
    }
  
    for (i=0; i<nwords; i+= 4) {
      if ((i+1) % this._MAX_WORDS_PER_BURST === 0) {
        this._gate();
      }
   
      g = this._gen4words();
      out.push(g[0],g[1],g[2],g[3]);
    }
    this._gate();
  
    return out.slice(0,nwords);
  },
  
  setDefaultParanoia: function (paranoia) {
    this._defaultParanoia = paranoia;
  },
  
  /**
   * Add entropy to the pools.
   * @param data The entropic value.  Should be a 32-bit integer, array of 32-bit integers, or string
   * @param {Number} estimatedEntropy The estimated entropy of data, in bits
   * @param {String} source The source of the entropy, eg "mouse"
   */
  addEntropy: function (data, estimatedEntropy, source) {
    source = source || "user";
  
    var id,
      i, tmp,
      t = (new Date()).valueOf(),
      robin = this._robins[source],
      oldReady = this.isReady(), err = 0;
      
    id = this._collectorIds[source];
    if (id === undefined) { id = this._collectorIds[source] = this._collectorIdNext ++; }
      
    if (robin === undefined) { robin = this._robins[source] = 0; }
    this._robins[source] = ( this._robins[source] + 1 ) % this._pools.length;
  
    switch(typeof(data)) {
      
    case "number":
      if (estimatedEntropy === undefined) {
        estimatedEntropy = 1;
      }
      this._pools[robin].update([id,this._eventId++,1,estimatedEntropy,t,1,data|0]);
      break;
      
    case "object":
      var objName = Object.prototype.toString.call(data);
      if (objName === "[object Uint32Array]") {
        tmp = [];
        for (i = 0; i < data.length; i++) {
          tmp.push(data[i]);
        }
        data = tmp;
      } else {
        if (objName !== "[object Array]") {
          err = 1;
        }
        for (i=0; i<data.length && !err; i++) {
          if (typeof(data[i]) != "number") {
            err = 1;
          }
        }
      }
      if (!err) {
        if (estimatedEntropy === undefined) {
          /* horrible entropy estimator */
          estimatedEntropy = 0;
          for (i=0; i<data.length; i++) {
            tmp= data[i];
            while (tmp>0) {
              estimatedEntropy++;
              tmp = tmp >>> 1;
            }
          }
        }
        this._pools[robin].update([id,this._eventId++,2,estimatedEntropy,t,data.length].concat(data));
      }
      break;
      
    case "string":
      if (estimatedEntropy === undefined) {
       /* English text has just over 1 bit per character of entropy.
        * But this might be HTML or something, and have far less
        * entropy than English...  Oh well, let's just say one bit.
        */
       estimatedEntropy = data.length;
      }
      this._pools[robin].update([id,this._eventId++,3,estimatedEntropy,t,data.length]);
      this._pools[robin].update(data);
      break;
      
    default:
      err=1;
    }
    if (err) {
      throw new sjcl.exception.bug("random: addEntropy only supports number, array of numbers or string");
    }
  
    /* record the new strength */
    this._poolEntropy[robin] += estimatedEntropy;
    this._poolStrength += estimatedEntropy;
  
    /* fire off events */
    if (oldReady === this._NOT_READY) {
      if (this.isReady() !== this._NOT_READY) {
        this._fireEvent("seeded", Math.max(this._strength, this._poolStrength));
      }
      this._fireEvent("progress", this.getProgress());
    }
  },
  
  /** Is the generator ready? */
  isReady: function (paranoia) {
    var entropyRequired = this._PARANOIA_LEVELS[ (paranoia !== undefined) ? paranoia : this._defaultParanoia ];
  
    if (this._strength && this._strength >= entropyRequired) {
      return (this._poolEntropy[0] > this._BITS_PER_RESEED && (new Date()).valueOf() > this._nextReseed) ?
        this._REQUIRES_RESEED | this._READY :
        this._READY;
    } else {
      return (this._poolStrength >= entropyRequired) ?
        this._REQUIRES_RESEED | this._NOT_READY :
        this._NOT_READY;
    }
  },
  
  /** Get the generator's progress toward readiness, as a fraction */
  getProgress: function (paranoia) {
    var entropyRequired = this._PARANOIA_LEVELS[ paranoia ? paranoia : this._defaultParanoia ];
  
    if (this._strength >= entropyRequired) {
      return 1.0;
    } else {
      return (this._poolStrength > entropyRequired) ?
        1.0 :
        this._poolStrength / entropyRequired;
    }
  },
  
  /** start the built-in entropy collectors */
  startCollectors: function () {
    if (this._collectorsStarted) { return; }
  
    if (window.addEventListener) {
      window.addEventListener("load", this._loadTimeCollector, false);
      window.addEventListener("mousemove", this._mouseCollector, false);
    } else if (document.attachEvent) {
      document.attachEvent("onload", this._loadTimeCollector);
      document.attachEvent("onmousemove", this._mouseCollector);
    }
    else {
      throw new sjcl.exception.bug("can't attach event");
    }
  
    this._collectorsStarted = true;
  },
  
  /** stop the built-in entropy collectors */
  stopCollectors: function () {
    if (!this._collectorsStarted) { return; }
  
    if (window.removeEventListener) {
      window.removeEventListener("load", this._loadTimeCollector, false);
      window.removeEventListener("mousemove", this._mouseCollector, false);
    } else if (window.detachEvent) {
      window.detachEvent("onload", this._loadTimeCollector);
      window.detachEvent("onmousemove", this._mouseCollector);
    }
    this._collectorsStarted = false;
  },
  
  /* use a cookie to store entropy.
  useCookie: function (all_cookies) {
      throw new sjcl.exception.bug("random: useCookie is unimplemented");
  },*/
  
  /** add an event listener for progress or seeded-ness. */
  addEventListener: function (name, callback) {
    this._callbacks[name][this._callbackI++] = callback;
  },
  
  /** remove an event listener for progress or seeded-ness */
  removeEventListener: function (name, cb) {
    var i, j, cbs=this._callbacks[name], jsTemp=[];
  
    /* I'm not sure if this is necessary; in C++, iterating over a
     * collection and modifying it at the same time is a no-no.
     */
  
    for (j in cbs) {
	if (cbs.hasOwnProperty(j) && cbs[j] === cb) {
        jsTemp.push(j);
      }
    }
  
    for (i=0; i<jsTemp.length; i++) {
      j = jsTemp[i];
      delete cbs[j];
    }
  },
  
  /* private */
  _pools                   : [new sjcl.hash.sha256()],
  _poolEntropy             : [0],
  _reseedCount             : 0,
  _robins                  : {},
  _eventId                 : 0,
  
  _collectorIds            : {},
  _collectorIdNext         : 0,
  
  _strength                : 0,
  _poolStrength            : 0,
  _nextReseed              : 0,
  _key                     : [0,0,0,0,0,0,0,0],
  _counter                 : [0,0,0,0],
  _cipher                  : undefined,
  _defaultParanoia         : 6,
  
  /* event listener stuff */
  _collectorsStarted       : false,
  _callbacks               : {progress: {}, seeded: {}},
  _callbackI               : 0,
  
  /* constants */
  _NOT_READY               : 0,
  _READY                   : 1,
  _REQUIRES_RESEED         : 2,

  _MAX_WORDS_PER_BURST     : 65536,
  _PARANOIA_LEVELS         : [0,48,64,96,128,192,256,384,512,768,1024],
  _MILLISECONDS_PER_RESEED : 30000,
  _BITS_PER_RESEED         : 80,
  
  /** Generate 4 random words, no reseed, no gate.
   * @private
   */
  _gen4words: function () {
    for (var i=0; i<4; i++) {
      this._counter[i] = this._counter[i]+1 | 0;
      if (this._counter[i]) { break; }
    }
    return this._cipher.encrypt(this._counter);
  },
  
  /* Rekey the AES instance with itself after a request, or every _MAX_WORDS_PER_BURST words.
   * @private
   */
  _gate: function () {
    this._key = this._gen4words().concat(this._gen4words());
    this._cipher = new sjcl.cipher.aes(this._key);
  },
  
  /** Reseed the generator with the given words
   * @private
   */
  _reseed: function (seedWords) {
    this._key = sjcl.hash.sha256.hash(this._key.concat(seedWords));
    this._cipher = new sjcl.cipher.aes(this._key);
    for (var i=0; i<4; i++) {
      this._counter[i] = this._counter[i]+1 | 0;
      if (this._counter[i]) { break; }
    }
  },
  
  /** reseed the data from the entropy pools
   * @param full If set, use all the entropy pools in the reseed.
   */
  _reseedFromPools: function (full) {
    var reseedData = [], strength = 0, i;
  
    this._nextReseed = reseedData[0] =
      (new Date()).valueOf() + this._MILLISECONDS_PER_RESEED;
    
    for (i=0; i<16; i++) {
      /* On some browsers, this is cryptographically random.  So we might
       * as well toss it in the pot and stir...
       */
      reseedData.push(Math.random()*0x100000000|0);
    }
    
    for (i=0; i<this._pools.length; i++) {
     reseedData = reseedData.concat(this._pools[i].finalize());
     strength += this._poolEntropy[i];
     this._poolEntropy[i] = 0;
   
     if (!full && (this._reseedCount & (1<<i))) { break; }
    }
  
    /* if we used the last pool, push a new one onto the stack */
    if (this._reseedCount >= 1 << this._pools.length) {
     this._pools.push(new sjcl.hash.sha256());
     this._poolEntropy.push(0);
    }
  
    /* how strong was this reseed? */
    this._poolStrength -= strength;
    if (strength > this._strength) {
      this._strength = strength;
    }
  
    this._reseedCount ++;
    this._reseed(reseedData);
  },
  
  _mouseCollector: function (ev) {
    var x = ev.x || ev.clientX || ev.offsetX || 0, y = ev.y || ev.clientY || ev.offsetY || 0;
    sjcl.random.addEntropy([x,y], 2, "mouse");
  },
  
  _loadTimeCollector: function (ev) {
    sjcl.random.addEntropy((new Date()).valueOf(), 2, "loadtime");
  },
  
  _fireEvent: function (name, arg) {
    var j, cbs=sjcl.random._callbacks[name], cbsTemp=[];
    /* TODO: there is a race condition between removing collectors and firing them */ 

    /* I'm not sure if this is necessary; in C++, iterating over a
     * collection and modifying it at the same time is a no-no.
     */
  
    for (j in cbs) {
     if (cbs.hasOwnProperty(j)) {
        cbsTemp.push(cbs[j]);
     }
    }
  
    for (j=0; j<cbsTemp.length; j++) {
     cbsTemp[j](arg);
    }
  }
};

(function(){
  try {
    // get cryptographically strong entropy in Webkit
    var ab = new Uint32Array(32);
    crypto.getRandomValues(ab);
    sjcl.random.addEntropy(ab, 1024, "crypto.getRandomValues");
  } catch (e) {
    // no getRandomValues :-(
  }
})();
(function () {
  for (var key in sjcl.beware) {
    if (sjcl.beware.hasOwnProperty(key)) {
      sjcl.beware[key]();
    }
  }
})();

var Braintree = {
  sjcl: sjcl,
  version: "1.3.10"
};

Braintree.generateAesKey = function () {
  return {
    key: sjcl.random.randomWords(8, 0),
    encrypt: function (plainText) {
      return this.encryptWithIv(plainText, sjcl.random.randomWords(4, 0));
    },
    encryptWithIv: function (plaintext, iv) {
      var aes = new sjcl.cipher.aes(this.key),
          plaintextBits = sjcl.codec.utf8String.toBits(plaintext),
          ciphertextBits = sjcl.mode.cbc.encrypt(aes, plaintextBits, iv),
          ciphertextAndIvBits = sjcl.bitArray.concat(iv, ciphertextBits);

      return sjcl.codec.base64.fromBits(ciphertextAndIvBits);
    }
  };
};

Braintree.create = function (publicKey) {
  return new Braintree.EncryptionClient(publicKey);
};

Braintree.EncryptionClient = function (publicKey) {
  var self = this,
      hiddenFields = [];

  self.publicKey = publicKey;
  self.version = Braintree.version;

  var createElement = function (tagName, attrs) {
    var element, attr, value;

    element = document.createElement(tagName);

    for (attr in attrs) {
      if (attrs.hasOwnProperty(attr)) {
        value = attrs[attr];
        element.setAttribute(attr, value);
      }
    }

    return element;
  };

  var extractForm = function (object) {
    if (window.jQuery && object instanceof jQuery) {
      return object[0];
    } else if (object.nodeType && object.nodeType === 1) {
      return object;
    } else {
      return document.getElementById(object);
    }
  };

  var extractIntegers = function (asn1) {
    var parts = [],
        start, end, data,
        i;

    if (asn1.typeName() === "INTEGER") {
      start = asn1.posContent();
      end   = asn1.posEnd();
      data  = asn1.stream.hexDump(start, end).replace(/[ \n]/g, "");
      parts.push(data);
    }

    if (asn1.sub !== null) {
      for (i = 0; i < asn1.sub.length; i++) {
        parts = parts.concat(extractIntegers(asn1.sub[i]));
      }
    }

    return parts;
  };

  var findInputs = function (element) {
    var found = [],
        children = element.children,
        child, i;

    for (i = 0; i < children.length; i++) {
      child = children[i];

      if (child.nodeType === 1 && child.attributes["data-encrypted-name"]) {
        found.push(child);
      } else if (child.children && child.children.length > 0) {
        found = found.concat(findInputs(child));
      }
    }

    return found;
  };

  var generateRsaKey = function () {
    var asn1, exponent, parts, modulus, rawKey, rsa;

    try {
      rawKey = b64toBA(publicKey);
      asn1 = ASN1.decode(rawKey);
    } catch (e) {
      throw "Invalid encryption key. Please use the key labeled 'Client-Side Encryption Key'";
    }

    parts = extractIntegers(asn1);

    if (parts.length !== 2) {
      throw "Invalid encryption key. Please use the key labeled 'Client-Side Encryption Key'";
    }

    modulus = parts[0];
    exponent = parts[1];

    rsa = new RSAKey();
    rsa.setPublic(modulus, exponent);

    return rsa;
  };

  var generateHmacKey = function () {
    return {
      key: sjcl.random.randomWords(8, 0),
      sign: function (message) {
        var hmac = new sjcl.misc.hmac(this.key, sjcl.hash.sha256),
            signature = hmac.encrypt(message);

        return sjcl.codec.base64.fromBits(signature);
      }
    };
  };

  self.encrypt = function (plaintext) {
    var rsa = generateRsaKey(),
        aes = Braintree.generateAesKey(),
        hmac = generateHmacKey(),
        ciphertext = aes.encrypt(plaintext),
        signature = hmac.sign(sjcl.codec.base64.toBits(ciphertext)),
        combinedKey = sjcl.bitArray.concat(aes.key, hmac.key),
        encodedKey = sjcl.codec.base64.fromBits(combinedKey),
        hexEncryptedKey = rsa.encrypt(encodedKey),
        prefix = "$bt4|javascript_" + self.version.replace(/\./g, "_") + "$",
        encryptedKey = null;

    if(hexEncryptedKey) {
      encryptedKey = hex2b64(hexEncryptedKey);
    }

    return prefix + encryptedKey + "$" + ciphertext + "$" + signature;
  };

  self.encryptForm = function (form) {
    var element, encryptedValue,
        fieldName, hiddenField,
        i, inputs;

    form = extractForm(form);
    inputs = findInputs(form);

    while (hiddenFields.length > 0) {
      try {
        form.removeChild(hiddenFields[0]);
      } catch (err) {}
      hiddenFields.splice(0, 1);
    }

    for (i = 0; i < inputs.length; i++) {
      element = inputs[i];
      fieldName = element.getAttribute("data-encrypted-name");
      encryptedValue = self.encrypt(element.value);
      element.removeAttribute("name");
      hiddenField = createElement("input", {
        value: encryptedValue,
        type: "hidden",
        name: fieldName
      });
      hiddenFields.push(hiddenField);
      form.appendChild(hiddenField);
    }
  };

  self.onSubmitEncryptForm = function (form, callback) {
    var wrappedCallback;

    form = extractForm(form);

    wrappedCallback = function (e) {
      self.encryptForm(form);
      return (!!callback) ? callback(e) : e;
    };

    if (window.jQuery) {
      window.jQuery(form).submit(wrappedCallback);
    } else if (form.addEventListener) {
      form.addEventListener("submit", wrappedCallback, false);
    } else if (form.attachEvent) {
      form.attachEvent("onsubmit", wrappedCallback);
    }
  };

  // backwards compatibility
  self.formEncrypter = {
    encryptForm: self.encryptForm,
    extractForm: extractForm,
    onSubmitEncryptForm: self.onSubmitEncryptForm
  };

  sjcl.random.startCollectors();
};

window.Braintree = Braintree;
})();
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.braintree = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
'use strict';

var bind = require(95);
var braintree3ds = require(26);
var parseClientToken = require(8);
var util = require(13);
var SEPAMandate = require(11);
var EuropeBankAccount = require(5);
var CreditCard = require(4);
var CoinbaseAccount = require(2);
var PayPalAccount = require(9);
var normalizeCreditCardFields = require(7).normalizeCreditCardFields;
var chooseRequestDriver = require(40).chooseDriver;
var shouldEnableCORS = require(12);
var getConfiguration = require(6);
var constants = require(3);
var uuid = require(57).uuid;

function getAnalyticsConfiguration(options) {
  var analyticsConfiguration = options.analyticsConfiguration || {};
  var globalBraintreeVersion = global.braintree ? global.braintree.VERSION : null;
  var defaultSdkVersion = globalBraintreeVersion ? 'braintree/web/' + globalBraintreeVersion : '';

  return {
    sdkVersion: analyticsConfiguration.sdkVersion || defaultSdkVersion,
    merchantAppId: analyticsConfiguration.merchantAppId || global.location.host
  };
}

function Client(options) {
  var analyticsConfiguration = getAnalyticsConfiguration(options);

  this.options = options;
  this.driver = options.driver || chooseRequestDriver({enableCORS: shouldEnableCORS(options)});
  this.customerId = options.customerId;
  this.integration = options.integrationType || options.integration || '';
  this.sdkVersion = analyticsConfiguration.sdkVersion;
  this.merchantAppId = analyticsConfiguration.merchantAppId;
  this.sessionId = options.channel || uuid();

  this.authorization = options.authorization || options.clientToken;
  if (util.isTokenizationKey(this.authorization)) {
    this.authorizationType = constants.authorizationTypes.TOKENIZATION_KEY;
    this.gatewayConfiguration = options.gatewayConfiguration;
  } else {
    this.gatewayConfiguration = options.gatewayConfiguration || parseClientToken(this.authorization);
    this.authorizationFingerprint = parseClientToken(this.authorization).authorizationFingerprint;
    this.authorizationType = constants.authorizationTypes.CLIENT_TOKEN;
  }

  if (options.hasOwnProperty('timeout')) {
    this.requestTimeout = options.timeout;
  } else {
    this.requestTimeout = 60000;
  }
}

Client.prototype._getGatewayConfiguration = function (callback) {
  var self = this;

  if (this.gatewayConfiguration) {
    callback(null, this.gatewayConfiguration);
    return;
  }

  getConfiguration({
    authorization: this.authorization,
    enableCORS: shouldEnableCORS(this.options)
  }, function (err, gatewayConfiguration) {
    if (err) {
      callback(err, null);
      return;
    }

    self.gatewayConfiguration = gatewayConfiguration;
    callback(null, gatewayConfiguration);
  });
};

/* eslint-disable no-invalid-this */

Client.prototype._getAttrs = function (gatewayConfiguration) {
  var attrs = {};

  if (this.options.hasOwnProperty('sharedCustomerIdentifier')) {
    attrs.sharedCustomerIdentifier = this.options.sharedCustomerIdentifier;
  }

  attrs.sharedCustomerIdentifierType = this.options.sharedCustomerIdentifierType;
  attrs.braintreeLibraryVersion = this.sdkVersion;

  if (gatewayConfiguration.merchantAccountId) {
    attrs.merchantAccountId = gatewayConfiguration.merchantAccountId;
  }

  if (this.authorizationType === constants.authorizationTypes.TOKENIZATION_KEY) {
    attrs.clientKey = this.options.authorization;
  } else {
    attrs.authorizationFingerprint = this.authorizationFingerprint;
  }

  attrs._meta = {
    sessionId: this.sessionId
  };

  return attrs;
};

Client.prototype.getCreditCards = function (callback) {
  this._getGatewayConfiguration(bind(function (err, gatewayConfiguration) {
    if (err) { return callback(err); }

    this.driver.get(
      util.joinUrlFragments([gatewayConfiguration.clientApiUrl, 'v1', 'payment_methods']),
      this._getAttrs(gatewayConfiguration),
      function (d) {
        var i = 0;
        var len = d.paymentMethods.length;
        var creditCards = [];

        for (i; i < len; i++) {
          creditCards.push(new CreditCard(d.paymentMethods[i]));
        }

        return creditCards;
      },
      callback,
      this.requestTimeout
    );
  }, this));
};

Client.prototype.tokenizeCoinbase = function (attrs, callback) {
  attrs.options = {validate: false};
  this.addCoinbase(attrs, function (err, result) {
    if (err) {
      callback(err, null);
    } else if (result && result.nonce) {
      callback(err, result);
    } else {
      callback('Unable to tokenize coinbase account.', null);
    }
  });
};

Client.prototype.tokenizePayPalAccount = function (attrs, callback) {
  attrs.options = {validate: false};
  this.addPayPalAccount(attrs, function (err, result) {
    if (err) {
      callback(err, null);
    } else if (result && result.nonce) {
      callback(null, result);
    } else {
      callback('Unable to tokenize paypal account.', null);
    }
  });
};

Client.prototype.tokenizeCard = function (attrs, callback) {
  attrs.options = {validate: false};
  this.addCreditCard(attrs, function (err, result) {
    if (result && result.nonce) {
      callback(err, result.nonce, {type: result.type, details: result.details});
    } else {
      callback('Unable to tokenize card.', null);
    }
  });
};

Client.prototype.lookup3DS = function (attrs, callback) {
  this._getGatewayConfiguration(bind(function (err, gatewayConfiguration) {
    var url, mergedAttrs;

    if (err) { return callback(err); }

    url = util.joinUrlFragments([gatewayConfiguration.clientApiUrl, 'v1/payment_methods', attrs.nonce, 'three_d_secure/lookup']);
    mergedAttrs = util.mergeOptions(this._getAttrs(gatewayConfiguration), {amount: attrs.amount});
    this.driver.post(url, mergedAttrs, function (d) {return d;},
      callback,
      this.requestTimeout
    );
  }, this));
};

Client.prototype.createSEPAMandate = function (attrs, callback) {
  this._getGatewayConfiguration(bind(function (err, gatewayConfiguration) {
    var mergedAttrs;

    if (err) { return callback(err); }

    mergedAttrs = util.mergeOptions(this._getAttrs(gatewayConfiguration), {sepaMandate: attrs});
    this.driver.post(
      util.joinUrlFragments([gatewayConfiguration.clientApiUrl, 'v1', 'sepa_mandates.json']),
      mergedAttrs,
      function (d) { return {sepaMandate: new SEPAMandate(d.europeBankAccounts[0].sepaMandates[0]), sepaBankAccount: new EuropeBankAccount(d.europeBankAccounts[0])}; },
      callback,
      this.requestTimeout
    );
  }, this));
};

Client.prototype.getSEPAMandate = function (attrs, callback) {
  this._getGatewayConfiguration(bind(function (err, gatewayConfiguration) {
    var mergedAttrs;

    if (err) { return callback(err); }

    mergedAttrs = util.mergeOptions(this._getAttrs(gatewayConfiguration), attrs);

    this.driver.get(
      util.joinUrlFragments([gatewayConfiguration.clientApiUrl, 'v1', 'sepa_mandates.json']),
      mergedAttrs,
      function (d) { return {sepaMandate: new SEPAMandate(d.sepaMandates[0])}; },
      callback,
      this.requestTimeout
    );
  }, this));
};

Client.prototype.addCoinbase = function (attrs, callback) {
  this._getGatewayConfiguration(bind(function (err, gatewayConfiguration) {
    var mergedAttrs;

    if (err) { return callback(err); }

    delete attrs.share;

    mergedAttrs = util.mergeOptions(this._getAttrs(gatewayConfiguration), {
      coinbaseAccount: attrs,
      _meta: {
        integration: this.integration || 'custom',
        source: 'coinbase',
        sessionId: this.sessionId
      }
    });

    this.driver.post(
      util.joinUrlFragments([gatewayConfiguration.clientApiUrl, 'v1', 'payment_methods/coinbase_accounts']),
      mergedAttrs,
      function (d) {
        return new CoinbaseAccount(d.coinbaseAccounts[0]);
      },
      callback,
      this.requestTimeout
    );
  }, this));
};

Client.prototype.addPayPalAccount = function (attrs, callback) {
  this._getGatewayConfiguration(bind(function (err, gatewayConfiguration) {
    var mergedAttrs;

    if (err) { return callback(err); }

    delete attrs.share;

    mergedAttrs = util.mergeOptions(this._getAttrs(gatewayConfiguration), {
      paypalAccount: attrs,
      _meta: {
        integration: this.integration || 'paypal',
        source: 'paypal',
        sessionId: this.sessionId
      }
    });

    this.driver.post(
      util.joinUrlFragments([gatewayConfiguration.clientApiUrl, 'v1', 'payment_methods', 'paypal_accounts']),
      mergedAttrs,
      function (d) {
        return new PayPalAccount(d.paypalAccounts[0]);
      },
      callback,
      this.requestTimeout
    );
  }, this));
};

Client.prototype.addCreditCard = function (attrs, callback) {
  this._getGatewayConfiguration(bind(function (err, gatewayConfiguration) {
    var mergedAttrs, creditCard, share;

    if (err) { return callback(err); }

    share = attrs.share;
    delete attrs.share;

    creditCard = normalizeCreditCardFields(attrs);

    mergedAttrs = util.mergeOptions(this._getAttrs(gatewayConfiguration), {
      share: share,
      creditCard: creditCard,
      _meta: {
        integration: this.integration || 'custom',
        source: 'form',
        sessionId: this.sessionId
      }
    });

    this.driver.post(
      util.joinUrlFragments([gatewayConfiguration.clientApiUrl, 'v1', 'payment_methods/credit_cards']),
      mergedAttrs,
      function (d) {
        return new CreditCard(d.creditCards[0]);
      },
      callback,
      this.requestTimeout
    );
  }, this));
};

Client.prototype.sendAnalyticsEvents = function (events, callback) {
  this._getGatewayConfiguration(bind(function (err, gatewayConfiguration) {
    var attrs, event, url, eventObjects;

    if (err) { return callback(err); }

    url = gatewayConfiguration.analytics.url;
    eventObjects = [];
    events = util.isArray(events) ? events : [events];

    if (!url) {
      if (callback) {
        callback(null, {});
      }
      return;
    }

    for (event in events) {
      if (events.hasOwnProperty(event)) {
        eventObjects.push({kind: events[event]});
      }
    }

    attrs = util.mergeOptions(this._getAttrs(gatewayConfiguration), {
      analytics: eventObjects,
      _meta: {
        merchantAppId: this.merchantAppId,
        platform: 'web',
        platformVersion: global.navigator.userAgent,
        integrationType: this.integration,
        sdkVersion: this.sdkVersion,
        sessionId: this.sessionId
      }
    });

    this.driver.post(url, attrs, function (d) { return d; }, callback, constants.ANALYTICS_TIMEOUT_MS);
  }, this));
};

Client.prototype.decryptBrowserswitchPayload = function (encryptedPayload, callback) {
  this._getGatewayConfiguration(bind(function (err, gatewayConfiguration) {
    var attrs, url;

    if (err) { return callback(err); }

    attrs = util.mergeOptions(this._getAttrs(gatewayConfiguration), {asymmetric_encrypted_payload: encryptedPayload});
    url = util.joinUrlFragments([gatewayConfiguration.clientApiUrl, '/v1/paypal_browser_switch/decrypt']);
    this.driver.post(
      url,
      attrs,
      function (d) { return d; },
      callback,
      this.requestTimeout
    );
  }, this));
};

Client.prototype.encryptBrowserswitchReturnPayload = function (payload, aesKey, callback) {
  this._getGatewayConfiguration(bind(function (err, gatewayConfiguration) {
    var attrs, url;

    if (err) { return callback(err); }

    attrs = util.mergeOptions(this._getAttrs(gatewayConfiguration), {
      payload: payload,
      aesKey: aesKey
    });
    url = util.joinUrlFragments([gatewayConfiguration.clientApiUrl, '/v1/paypal_browser_switch/encrypt']);
    this.driver.post(
      url,
      attrs,
      function (d) { return d; },
      callback,
      this.requestTimeout
    );
  }, this));
};

Client.prototype.exchangePaypalTokenForConsentCode = function (tokensObj, callback) {
  this._getGatewayConfiguration(bind(function (err, gatewayConfiguration) {
    var attrs, url;

    if (err) { return callback(err); }

    attrs = util.mergeOptions(this._getAttrs(gatewayConfiguration), tokensObj);
    if (gatewayConfiguration.merchantAccountId) {
      attrs.merchant_account_id = gatewayConfiguration.merchantAccountId;
    }
    url = util.joinUrlFragments([gatewayConfiguration.clientApiUrl, '/v1/paypal_account_service/merchant_consent']);
    this.driver.post(
      url,
      attrs,
      function (d) { return d; },
      callback,
      this.requestTimeout
    );
  }, this));
};

Client.prototype.getAmexRewardsBalance = function (attrs, callback) {
  this._getGatewayConfiguration(bind(function (err, gatewayConfiguration) {
    var mergedAttrs;

    if (err) { return callback(err); }

    mergedAttrs = util.mergeOptions(this._getAttrs(gatewayConfiguration), attrs);
    if (mergedAttrs.nonce) {
      mergedAttrs.payment_method_nonce = mergedAttrs.nonce;
      delete mergedAttrs.nonce;
    }

    this.driver.get(
      util.joinUrlFragments([gatewayConfiguration.clientApiUrl, 'v1/payment_methods/amex_rewards_balance']),
      mergedAttrs,
      function (d) { return d; },
      callback,
      this.requestTimeout
    );
  }, this));
};

Client.prototype.getAmexExpressCheckoutNonceProfile = function (attrs, callback) {
  this._getGatewayConfiguration(bind(function (err, gatewayConfiguration) {
    var mergedAttrs;

    if (err) { return callback(err); }

    mergedAttrs = util.mergeOptions(this._getAttrs(gatewayConfiguration), attrs);
    if (mergedAttrs.nonce) {
      mergedAttrs.payment_method_nonce = mergedAttrs.nonce;
      delete mergedAttrs.nonce;
    }

    this.driver.get(
      util.joinUrlFragments([gatewayConfiguration.clientApiUrl, 'v1/payment_methods/amex_express_checkout_cards', mergedAttrs.payment_method_nonce]),
      mergedAttrs,
      function (d) { return d; },
      callback,
      this.requestTimeout
    );
  }, this));
};

Client.prototype.verify3DS = function () {
  var args = arguments;

  if (this._secure3d) {
    return this._secure3d.verify.apply(this._secure3d, args);
  }

  this._getGatewayConfiguration(bind(function (err, gatewayConfiguration) {
    var callback;

    if (err) {
      callback = args[args.length - 1];
      return callback(err);
    }

    this._secure3d = braintree3ds.create(this, {
      container: this.options.container,
      clientToken: gatewayConfiguration
    });

    return this._secure3d.verify.apply(this._secure3d, args);
  }, this));
};

module.exports = Client;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"11":11,"12":12,"13":13,"2":2,"26":26,"3":3,"4":4,"40":40,"5":5,"57":57,"6":6,"7":7,"8":8,"9":9,"95":95}],2:[function(require,module,exports){
'use strict';

var ATTRIBUTES = [
  'nonce',
  'type',
  'description',
  'details'
];

function CoinbaseAccount(attributes) {
  var i, attribute;

  for (i = 0; i < ATTRIBUTES.length; i++) {
    attribute = ATTRIBUTES[i];
    this[attribute] = attributes[attribute];
  }
}

module.exports = CoinbaseAccount;

},{}],3:[function(require,module,exports){
'use strict';

var apiUrls = {
  production: 'https://api.braintreegateway.com:443',
  sandbox: 'https://api.sandbox.braintreegateway.com:443'
};

/* eslint-enable no-undef,block-scoped-var */

module.exports = {
  apiUrls: apiUrls,
  errors: {
    UNKNOWN_ERROR: 'Unknown error',
    INVALID_TIMEOUT: 'Timeout must be a number'
  },
  ANALYTICS_TIMEOUT_MS: 4000,
  authorizationTypes: {
    CLIENT_TOKEN: 'CLIENT_TOKEN',
    TOKENIZATION_KEY: 'TOKENIZATION_KEY'
  }
};

},{}],4:[function(require,module,exports){
'use strict';

var ATTRIBUTES = [
  'billingAddress',
  'branding',
  'createdAt',
  'createdAtMerchant',
  'createdAtMerchantName',
  'details',
  'isLocked',
  'lastUsedAt',
  'lastUsedAtMerchant',
  'lastUsedAtMerchantName',
  'lastUsedByCurrentMerchant',
  'nonce',
  'securityQuestions',
  'type'
];

function CreditCard(attributes) {
  var i, attribute;

  for (i = 0; i < ATTRIBUTES.length; i++) {
    attribute = ATTRIBUTES[i];
    this[attribute] = attributes[attribute];
  }
}

module.exports = CreditCard;

},{}],5:[function(require,module,exports){
'use strict';

function EuropeBankAccount(attributes) {
  var allAttributes = [
    'bic',
    'maskedIBAN',
    'nonce',
    'accountHolderName'
  ];
  var attribute;
  var i = 0;

  for (i = 0; i < allAttributes.length; i++) {
    attribute = allAttributes[i];
    this[attribute] = attributes[attribute];
  }
}

module.exports = EuropeBankAccount;

},{}],6:[function(require,module,exports){
'use strict';

var parseClientToken = require(8);
var util = require(13);
var chooseRequestDriver = require(40).chooseDriver;
var shouldEnableCORS = require(12);
var constants = require(3);

function _tokenizeTokenizationKey(tokenizationKey) {
  var tokens = tokenizationKey.split('_');
  var environment = tokens[0];
  var merchantId = tokens.slice(2).join('_');

  return {
    merchantId: merchantId,
    environment: environment
  };
}

function getConfiguration(options, callback) {
  var configUrl, tokenizationKeyParts, parsedClientToken;
  var driver = chooseRequestDriver({enableCORS: shouldEnableCORS(options)});
  var attrs = {};

  if (util.isTokenizationKey(options.authorization)) {
    attrs.clientKey = options.authorization;
    tokenizationKeyParts = _tokenizeTokenizationKey(options.authorization);
    configUrl = constants.apiUrls[tokenizationKeyParts.environment] + '/merchants/' + tokenizationKeyParts.merchantId + '/client_api/v1/configuration';
  } else {
    parsedClientToken = parseClientToken(options.authorization);
    attrs.authorizationFingerprint = parsedClientToken.authorizationFingerprint;
    configUrl = parsedClientToken.configUrl;
  }

  if (options.sessionId) {
    attrs._meta = {sessionId: options.sessionId};
  }

  driver.get(
    configUrl,
    attrs,
    function (d) {
      return d;
    },
    callback,
    options.timeout
  );
}

module.exports = getConfiguration;

},{"12":12,"13":13,"3":3,"40":40,"8":8}],7:[function(require,module,exports){
'use strict';

function normalizeCreditCardFields(attrs) {
  var key;
  var creditCard = {
    billingAddress: attrs.billingAddress || {}
  };

  for (key in attrs) {
    if (!attrs.hasOwnProperty(key)) { continue; }

    switch (key.replace(/_/g, '').toLowerCase()) {
      case 'postalcode':
      case 'countryname':
      case 'countrycodenumeric':
      case 'countrycodealpha2':
      case 'countrycodealpha3':
      case 'region':
      case 'extendedaddress':
      case 'locality':
      case 'firstname':
      case 'lastname':
      case 'company':
      case 'streetaddress':
        creditCard.billingAddress[key] = attrs[key];
        break;
      default:
        creditCard[key] = attrs[key];
    }
  }

  return creditCard;
}

module.exports = {
  normalizeCreditCardFields: normalizeCreditCardFields
};

},{}],8:[function(require,module,exports){
'use strict';

var braintreeUtils = require(57);
require(10);

function parseClientToken(rawClientToken) {
  var clientToken;

  if (!rawClientToken) {
    throw new Error('Braintree API Client Misconfigured: clientToken required.');
  }

  if (typeof rawClientToken === 'object' && rawClientToken !== null) {
    clientToken = rawClientToken;
  } else {
    try {
      rawClientToken = window.atob(rawClientToken);
    } catch (b64Error) { /* ignored */ }

    try {
      clientToken = JSON.parse(rawClientToken);
    } catch (jsonError) {
      throw new Error('Braintree API Client Misconfigured: clientToken is not valid JSON.');
    }
  }

  if (!clientToken.hasOwnProperty('clientApiUrl') || !braintreeUtils.isWhitelistedDomain(clientToken.clientApiUrl)) {
    throw new Error('Braintree API Client Misconfigured: the clientApiUrl provided in the clientToken is invalid.');
  }

  return clientToken;
}

module.exports = parseClientToken;

},{"10":10,"57":57}],9:[function(require,module,exports){
'use strict';

var ATTRIBUTES = [
  'nonce',
  'type',
  'description',
  'details'
];

function PayPalAccount(attributes) {
  var i, attribute;

  for (i = 0; i < ATTRIBUTES.length; i++) {
    attribute = ATTRIBUTES[i];
    this[attribute] = attributes[attribute];
  }
}

module.exports = PayPalAccount;

},{}],10:[function(require,module,exports){
(function (global){
'use strict';

var atobPolyfill = function (base64String) {
  var base64Matcher = new RegExp("^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})([=]{1,2})?$");
  var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  var result = "";

  if (!base64Matcher.test(base64String)) {
    throw new Error("Non base64 encoded input passed to window.atob polyfill");
  }

  var i = 0;
  do {
    var b1 = characters.indexOf( base64String.charAt(i++) );
    var b2 = characters.indexOf( base64String.charAt(i++) );
    var b3 = characters.indexOf( base64String.charAt(i++) );
    var b4 = characters.indexOf( base64String.charAt(i++) );

    var a = ( ( b1 & 0x3F ) << 2 ) | ( ( b2 >> 4 ) & 0x3 );
    var b = ( ( b2 & 0xF  ) << 4 ) | ( ( b3 >> 2 ) & 0xF );
    var c = ( ( b3 & 0x3  ) << 6 ) | ( b4 & 0x3F );

    result += String.fromCharCode(a) + (b?String.fromCharCode(b):"") + (c?String.fromCharCode(c):"");

  } while( i < base64String.length );

  return result;
};

global.atob = global.atob || atobPolyfill;

module.exports = {
  atobPolyfill: atobPolyfill
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],11:[function(require,module,exports){
'use strict';

function SEPAMandate(attributes) {
  var i = 0;
  var attribute;
  var allAttributes = [
    'accountHolderName',
    'bic',
    'longFormURL',
    'mandateReferenceNumber',
    'maskedIBAN',
    'shortForm'
  ];

  for (i = 0; i < allAttributes.length; i++) {
    attribute = allAttributes[i];
    this[attribute] = attributes[attribute];
  }
}

module.exports = SEPAMandate;

},{}],12:[function(require,module,exports){
'use strict';

module.exports = function (options) {
  if (options.enableCORS != null) {
    return options.enableCORS;
  }

  if (options.merchantConfiguration) {
    return options.merchantConfiguration.enableCORS;
  }

  return false;
};

},{}],13:[function(require,module,exports){
'use strict';

function joinUrlFragments(fragments) {
  var strippedFragment, i;
  var strippedFragments = [];

  for (i = 0; i < fragments.length; i++) {
    strippedFragment = fragments[i];
    if (strippedFragment.charAt(strippedFragment.length - 1) === '/') {
      strippedFragment = strippedFragment.substring(0, strippedFragment.length - 1);
    }
    if (strippedFragment.charAt(0) === '/') {
      strippedFragment = strippedFragment.substring(1);
    }

    strippedFragments.push(strippedFragment);
  }

  return strippedFragments.join('/');
}

function isArray(value) {
  return value && typeof value === 'object' && typeof value.length === 'number' &&
    Object.prototype.toString.call(value) === '[object Array]' || false;
}

function mergeOptions(obj1, obj2) {
  var obj3 = {};
  var attrname;
  for (attrname in obj1) {
    if (obj1.hasOwnProperty(attrname)) {
      obj3[attrname] = obj1[attrname];
    }
  }
  for (attrname in obj2) {
    if (obj2.hasOwnProperty(attrname)) {
      obj3[attrname] = obj2[attrname];
    }
  }
  return obj3;
}

function isTokenizationKey(str) {
  return /^[a-zA-Z0-9_]+_[a-zA-Z0-9]+_[a-zA-Z0-9_]+$/.test(str);
}

module.exports = {
  joinUrlFragments: joinUrlFragments,
  isArray: isArray,
  mergeOptions: mergeOptions,
  isTokenizationKey: isTokenizationKey
};

},{}],14:[function(require,module,exports){
'use strict';

var Client = require(1);
var util = require(13);
var parseClientToken = require(8);
var getConfiguration = require(6);

function configure(options) {
  return new Client(options);
}

module.exports = {
  Client: Client,
  configure: configure,
  util: util,
  parseClientToken: parseClientToken,
  _getConfiguration: getConfiguration
};

},{"1":1,"13":13,"6":6,"8":8}],15:[function(require,module,exports){
'use strict';

var nativeIndexOf = Array.prototype.indexOf;

var indexOf;
if (nativeIndexOf) {
  indexOf = function (haystack, needle) {
    return haystack.indexOf(needle);
  };
} else {
  indexOf = function indexOf(haystack, needle) {
    for (var i = 0, len = haystack.length; i < len; i++) {
      if (haystack[i] === needle) {
        return i;
      }
    }
    return -1;
  };
}

module.exports = {
  indexOf: indexOf
};

},{}],16:[function(require,module,exports){
'use strict';

function _escape(string) {
  var i, hex;
  var escaped = '';

  for (i = 0; i < string.length; i++) {
    escaped += '%';
    hex = string[i].charCodeAt(0).toString(16).toUpperCase();

    if (hex.length < 2) {
      escaped += '0';
    }

    escaped += hex;
  }

  return escaped;
}

function decodeUtf8(b64) {
  return decodeURIComponent(_escape(atob(b64)));
}

module.exports = {
  decodeUtf8: decodeUtf8
};

},{}],17:[function(require,module,exports){
'use strict';

function normalizeElement (element, errorMessage) {
  errorMessage = errorMessage || '[' + element + '] is not a valid DOM Element';

  if (element && element.nodeType && element.nodeType === 1) {
    return element;
  }
  if (element && window.jQuery && (element instanceof jQuery || 'jquery' in Object(element)) && element.length !== 0) {
    return element[0];
  }

  if (typeof element === 'string' && document.getElementById(element)) {
    return document.getElementById(element);
  }

  throw new Error(errorMessage);
}

module.exports = {
  normalizeElement: normalizeElement
};

},{}],18:[function(require,module,exports){
'use strict';

function addEventListener(element, type, listener, useCapture) {
  if (element.addEventListener) {
    element.addEventListener(type, listener, useCapture || false);
  } else if (element.attachEvent) {
    element.attachEvent('on' + type, listener);
  }
}

function removeEventListener(element, type, listener, useCapture) {
  if (element.removeEventListener) {
    element.removeEventListener(type, listener, useCapture || false);
  } else if (element.detachEvent) {
    element.detachEvent('on' + type, listener);
  }
}

function preventDefault(event) {
  if (event.preventDefault) {
    event.preventDefault();
  } else {
    event.returnValue = false;
  }
}

module.exports = {
  addEventListener: addEventListener,
  removeEventListener: removeEventListener,
  preventDefault: preventDefault
};

},{}],19:[function(require,module,exports){
'use strict';

var toString = Object.prototype.toString;

function isFunction(func) {
  return toString.call(func) === '[object Function]';
}

function bind(func, context) {
  return function () {
    return func.apply(context, arguments);
  };
}

module.exports = {
  bind: bind,
  isFunction: isFunction
};

},{}],20:[function(require,module,exports){
'use strict';

function getMaxCharLength(width) {
  var max, i, range, len;
  var ranges = [
    { min: 0, max: 180, chars: 7 },
    { min: 181, max: 620, chars: 14 },
    { min: 621, max: 960, chars: 22 }
  ];

  len = ranges.length;

  width = width || window.innerWidth;

  for (i = 0; i < len; i++) {
    range = ranges[i];

    if (width >= range.min && width <= range.max) {
      max = range.chars;
    }
  }

  return max || 60;
}

function truncateEmail(email, maxLength) {
  var address, domain;

  if (email.indexOf('@') === -1) {
    return email;
  }

  email = email.split('@');
  address = email[0];
  domain = email[1];

  if (address.length > maxLength) {
    address = address.slice(0, maxLength) + '...';
  }

  if (domain.length > maxLength) {
    domain = '...' + domain.slice(-maxLength);
  }

  return address + '@' + domain;
}

module.exports = {
  truncateEmail: truncateEmail,
  getMaxCharLength: getMaxCharLength
};

},{}],21:[function(require,module,exports){
'use strict';

var array = require(15);

function isBrowserHttps() {
  return window.location.protocol === 'https:';
}

function encode(str) {
  switch (str) {
    case null:
    case undefined:
      return '';
    case true:
      return '1';
    case false:
      return '0';
    default:
      return encodeURIComponent(str);
  }
}

function makeQueryString(params, namespace) {
  var query = [], k, p;
  for (p in params) {
    if (params.hasOwnProperty(p)) {
      var v = params[p];
      if (namespace) {
        k = namespace + '[' + p + ']';
      } else {
        k = p;
      }
      if (typeof v === 'object') {
        query.push(makeQueryString(v, k));
      } else if (v !== undefined && v !== null) {
        query.push(encode(k) + '=' + encode(v));
      }
    }
  }
  return query.join('&');
}

function decodeQueryString(queryString) {
  var params = {},
  paramPairs = queryString.split('&');

  for (var i = 0; i < paramPairs.length; i++) {
    var paramPair = paramPairs[i].split('=');
    var key = paramPair[0];
    var value = decodeURIComponent(paramPair[1]);
    params[key] = value;
  }

  return params;
}

function getParams(url) {
  var urlSegments = url.split('?');

  if (urlSegments.length !== 2) {
    return {};
  }

  return decodeQueryString(urlSegments[1]);
}

var parser = document.createElement('a');
var legalHosts = [
  'paypal.com',
  'braintreepayments.com',
  'braintreegateway.com',
  'localhost'
];

function isWhitelistedDomain(url) {
  url = url.toLowerCase();

  if (!/^http/.test(url)) {
    return false;
  }

  parser.href = url;

  var pieces = parser.hostname.split('.');
  var topLevelDomain = pieces.slice(-2).join('.');

  if (array.indexOf(legalHosts, topLevelDomain) === -1) {
    return false;
  }

  return true;
}

module.exports = {
  isBrowserHttps: isBrowserHttps,
  makeQueryString: makeQueryString,
  decodeQueryString: decodeQueryString,
  getParams: getParams,
  isWhitelistedDomain: isWhitelistedDomain
};

},{"15":15}],22:[function(require,module,exports){
'use strict';

// RFC 4122 v4 (pseudo-random) UUID
function generate() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0;
    var v = c === 'x' ? r : r & 0x3 | 0x8;
    return v.toString(16);
  });
}

module.exports = generate;

},{}],23:[function(require,module,exports){
var dom = require(17);
var url = require(21);
var fn = require(19);
var events = require(18);
var string = require(20);
var array = require(15);
var base64 = require(16);
var uuid = require(22);

module.exports = {
  string: string,
  array: array,
  normalizeElement: dom.normalizeElement,
  isBrowserHttps: url.isBrowserHttps,
  makeQueryString: url.makeQueryString,
  decodeQueryString: url.decodeQueryString,
  getParams: url.getParams,
  isWhitelistedDomain: url.isWhitelistedDomain,
  removeEventListener: events.removeEventListener,
  addEventListener: events.addEventListener,
  preventDefault: events.preventDefault,
  bind: fn.bind,
  isFunction: fn.isFunction,
  base64ToUtf8: base64.decodeUtf8,
  uuid: uuid
};

},{"15":15,"16":16,"17":17,"18":18,"19":19,"20":20,"21":21,"22":22}],24:[function(require,module,exports){
'use strict';

var utils = require(23);
var isFunction = require(151);
var Receiver = require(31);
var version = "1.3.3";

var htmlNode, bodyNode;

function getElementStyle(element, style) {
  var computedStyle = window.getComputedStyle ? getComputedStyle(element) : element.currentStyle;

  return computedStyle[style];
}

function getMerchantPageDefaultStyles() {
  return {
    html: {
      height: htmlNode.style.height || '',
      overflow: getElementStyle(htmlNode, 'overflow'),
      position: getElementStyle(htmlNode, 'position')
    },
    body: {
      height: bodyNode.style.height || '',
      overflow: getElementStyle(bodyNode, 'overflow')
    }
  };
}

function AuthenticationService (assetsUrl, container) {
  this.assetsUrl = assetsUrl;
  this.container = container || document.body;
  this.iframe = null;

  htmlNode = document.documentElement;
  bodyNode = document.body;
  this.merchantPageDefaultStyles = getMerchantPageDefaultStyles();
}

AuthenticationService.prototype.get = function (response, callback) {
  var self = this,
  url = this.constructAuthorizationURL(response);

  if (this.container && isFunction(this.container)) {
    this.container(url + '&no_style=1');
  } else {
    this.insertIframe(url);
  }

  new Receiver(function (response) {
    if (!isFunction(self.container)) {
      self.removeIframe();
    }
    callback(response);
  });
};

AuthenticationService.prototype.removeIframe = function () {
  if (this.container && this.container.nodeType && this.container.nodeType === 1) {
    this.container.removeChild(this.iframe);
  } else if (this.container && window.jQuery && this.container instanceof jQuery) {
    $(this.iframe, this.container).remove();
  } else if (typeof this.container === 'string') {
    document.getElementById(this.container).removeChild(this.iframe);
  }

  this.unlockMerchantWindowSize();
};

AuthenticationService.prototype.insertIframe = function (url) {
  // TODO: Security - This takes a url and makes an iframe. Doesn't seem like this would be a problem.
  var iframe = document.createElement('iframe');
  iframe.src = url;
  this.applyStyles(iframe);
  this.lockMerchantWindowSize();

  if (this.container && this.container.nodeType && this.container.nodeType === 1) {
    this.container.appendChild(iframe);
  } else if (this.container && window.jQuery && this.container instanceof jQuery && this.container.length !== 0) {
    this.container.append(iframe);
  } else if (typeof this.container === 'string' && document.getElementById(this.container)) {
    document.getElementById(this.container).appendChild(iframe);
  } else {
    throw new Error('Unable to find valid container for iframe.');
  }
  this.iframe = iframe;
};

AuthenticationService.prototype.applyStyles = function (iframe) {
  iframe.style.position = 'fixed';
  iframe.style.top = '0';
  iframe.style.left = '0';
  iframe.style.height = '100%';
  iframe.style.width = '100%';
  iframe.setAttribute('frameborder', '0');
  iframe.setAttribute('allowTransparency', 'true');
  iframe.style.border = '0';
  iframe.style.zIndex = '99999';
};

AuthenticationService.prototype.lockMerchantWindowSize = function () {
  htmlNode.style.overflow = 'hidden';
  bodyNode.style.overflow = 'hidden';
  bodyNode.style.height = '100%';
};

AuthenticationService.prototype.unlockMerchantWindowSize = function () {
  var defaultStyles = this.merchantPageDefaultStyles;

  bodyNode.style.height = defaultStyles.body.height;
  bodyNode.style.overflow = defaultStyles.body.overflow;

  htmlNode.style.overflow = defaultStyles.html.overflow;
};

AuthenticationService.prototype.constructAuthorizationURL = function (response) {
  var queryString,
  parentURL = window.location.href;

  if (parentURL.indexOf('#') > -1) {
    parentURL = parentURL.split('#')[0];
  }

  queryString = utils.makeQueryString({
    acsUrl: response.acsUrl,
    pareq: response.pareq,
    termUrl: response.termUrl + '&three_d_secure_version=' + version,
    md: response.md,
    parentUrl: parentURL
  });
  return this.assetsUrl + '/3ds/' + version + '/html/style_frame?' + queryString;
};

module.exports = AuthenticationService;

},{"151":151,"23":23,"31":31}],25:[function(require,module,exports){
'use strict';

var utils = require(23);
var bind = require(95);
var isFunction = require(151);
var AuthenticationService = require(24);
var Loader = require(27);

function noop() {}

function Client(api, options) {
  options = options || {};
  this.clientToken = options.clientToken;
  this.container = options.container;
  this.api = api;
  this.nonce = null;

  this._loader = null;
  this._boundHandleUserClose = bind(this._handleUserClose, this);
}

Client.prototype.verify = function (data, callback) {
  if (!isFunction(callback)) {
    this.api.sendAnalyticsEvents('3ds.web.no_callback');
    throw new Error('No suitable callback argument was given');
  }
  if (isFunction(data.onUserClose)) {
    this._onUserClose = data.onUserClose;
  }
  if (isFunction(data.onLookupComplete)) {
    this._onLookupComplete = data.onLookupComplete;
  }
  if (data.useDefaultLoader === undefined || data.useDefaultLoader === true) {
    this._createDefaultLoader();
  }

  var dataRecord = {nonce: '', amount: data.amount};
  var creditCardMetaData = data.creditCard;

  if (typeof creditCardMetaData === 'string') {
    dataRecord.nonce = creditCardMetaData;
    this.api.sendAnalyticsEvents('3ds.web.verify.nonce');
    this.startVerification(dataRecord, callback);
  } else {
    var self = this;
    var boundHandleTokenizeCard = function (err, nonce) {
      if (err) {
        self._removeDefaultLoader();

        return callback(err);
      }
      dataRecord.nonce = nonce;
      self.startVerification(dataRecord, callback);
    };
    this.api.sendAnalyticsEvents('3ds.web.verify.credit_card');
    this.api.tokenizeCard(creditCardMetaData, boundHandleTokenizeCard);
  }
};

Client.prototype.startVerification = function (data, merchantCallback) {
  this.api.lookup3DS(data, bind(this.handleLookupResponse(merchantCallback), this));
};

Client.prototype.handleLookupResponse = function (merchantCallback) {
  var self = this;
  return function (errorResponse, lookupResponse) {
    var authenticationService;

    this._onLookupComplete();

    if (errorResponse) {
      merchantCallback(errorResponse.error);
    } else if (lookupResponse.lookup && lookupResponse.lookup.acsUrl && lookupResponse.lookup.acsUrl.length > 0) {
      self.nonce = lookupResponse.paymentMethod.nonce;
      authenticationService = new AuthenticationService(this.clientToken.assetsUrl, this.container);
      authenticationService.get(lookupResponse.lookup, bind(this.handleAuthenticationResponse(merchantCallback), this));

      this._detachListeners();
      this._attachListeners();
    } else {
      self.nonce = lookupResponse.paymentMethod.nonce;
      merchantCallback(null, {
        nonce: self.nonce,
        verificationDetails: lookupResponse.threeDSecureInfo
      });
    }
  };
};

Client.prototype.handleAuthenticationResponse = function (merchantCallback) {
  return function (authResponseQueryString) {
    var authResponse,
        queryParams = utils.decodeQueryString(authResponseQueryString);

    if (queryParams.user_closed) {
      return;
    }

    authResponse = JSON.parse(queryParams.auth_response);

    if (authResponse.success) {
      merchantCallback(null, {
        nonce: authResponse.paymentMethod.nonce,
        verificationDetails: authResponse.threeDSecureInfo
      });
    } else if (authResponse.threeDSecureInfo && authResponse.threeDSecureInfo.liabilityShiftPossible) {
      merchantCallback(null, {
        nonce: this.nonce,
        verificationDetails: authResponse.threeDSecureInfo
      });
    } else {
      merchantCallback(authResponse.error);
    }
  };
};

Client.prototype._attachListeners = function () {
  utils.addEventListener(window, 'message', this._boundHandleUserClose);
};

Client.prototype._detachListeners = function () {
  utils.removeEventListener(window, 'message', this._boundHandleUserClose);
};

Client.prototype._createDefaultLoader = function () {
  this._loader = new Loader();

  document.body.appendChild(this._loader.getElement());
};

Client.prototype._removeDefaultLoader = function () {
  if (!this._loader) {
    return;
  }

  var loaderElement = this._loader.getElement();
  var parentElement = loaderElement.parentNode;

  if (parentElement) {
    parentElement.removeChild(loaderElement);
  }

  this._loader.dispose();
  this._loader = null;
};

Client.prototype._handleUserClose = function (event) {
  if (event.data === 'user_closed=true') {
    this._onUserClose();
  }
};

Client.prototype._onUserClose = noop;

Client.prototype._onLookupComplete = function () {
  this._removeDefaultLoader();
};

module.exports = Client;

},{"151":151,"23":23,"24":24,"27":27,"95":95}],26:[function(require,module,exports){
'use strict';

var Client = require(25);

module.exports = {
  create: function (clientToken, options) {
    var client = new Client(clientToken, options);
    return client;
  }
};

},{"25":25}],27:[function(require,module,exports){
'use strict';

var LoaderDisplay = require(28);
var LoaderMessage = require(29);
var LoaderSpinner = require(30);

function Loader() {
  this._element = document.createElement('div');
  this._element.style.cssText = this._cssDeclarations;

  this._display = null;

  this._initialize();
}

Loader.prototype._cssDeclarations = [
  'filter:progid:DXImageTransform.Microsoft.Gradient(StartColorStr=#7F000000, EndColorStr=#7F000000)',
  'background-color: rgba(0, 0, 0, 0.5)',
  'display: table',
  'height: 100%',
  'left: 0',
  'position: fixed',
  'right: 0',
  'top: 0',
  'width: 100%',
  'z-index: 99999'
].join(';');

Loader.prototype.getElement = function () {
  return this._element;
};

Loader.prototype.dispose = function () {
  this._display.dispose();
  this._display = null;

  this._element = null;
};

Loader.prototype._initialize = function () {
  var displayObject = new LoaderSpinner();
  var supportsSvgAnimations = (window.SVGElement && window.SVGAnimateElement &&
                               window.SVGAnimateTransformElement);

  if (!(supportsSvgAnimations)) {
    displayObject = new LoaderMessage('Loading...');
  }

  this._display = new LoaderDisplay(displayObject);
  this.getElement().appendChild(this._display.getElement());
};

module.exports = Loader;

},{"28":28,"29":29,"30":30}],28:[function(require,module,exports){
'use strict';

function LoaderDisplay(displayObject) {
  this._element = document.createElement('div');
  this._element.style.cssText = this._cssDeclarations;

  this._displayObject = displayObject;

  this._initialize();
}

LoaderDisplay.prototype._cssDeclarations = [
  'display: table-cell',
  'vertical-align: middle'
].join(';');

LoaderDisplay.prototype.getElement = function () {
  return this._element;
};

LoaderDisplay.prototype.dispose = function () {
  this._displayObject.dispose();
  this._displayObject = null;

  this._element = null;
};

LoaderDisplay.prototype._initialize = function () {
  this.getElement().appendChild(this._displayObject.getElement());
};

module.exports = LoaderDisplay;

},{}],29:[function(require,module,exports){
'use strict';

function LoaderMessage(text) {
  this._element = document.createElement('div');
  this._element.style.cssText = this._cssDeclarations;
  this._element.innerHTML = text;
}

LoaderMessage.prototype._cssDeclarations = [
  'color: #fff',
  'font-family: Helvetica, sans-serif',
  'font-size: 12px',
  'text-align: center'
].join(';');

LoaderMessage.prototype.getElement = function () {
  return this._element;
};

LoaderMessage.prototype.dispose = function () {
  this._element = null;
};

module.exports = LoaderMessage;

},{}],30:[function(require,module,exports){
'use strict';

function LoaderSpinner() {
  this._element = document.createElement('div');
  this._element.style.cssText = this._cssDeclarations;
  this._element.innerHTML = this._markup;
}

LoaderSpinner.prototype._cssDeclarations = [
  'height: 36px',
  'margin-left: auto',
  'margin-right: auto',
  'width: 36px'
].join(';');

LoaderSpinner.prototype._markup = [
  '<svg version="1.1" id="loader-1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"',
  'width="100%" height="100%" viewBox="0 0 50 50" style="enable-background:new 0 0 50 50;" xml:space="preserve">',
  '  <path fill="#FFF" d="M43.935,25.145c0-10.318-8.364-18.683-18.683-18.683c-10.318,0-18.683,8.365-18.683,18.683h4.068c0-8.071,6.543-14.615,14.615-14.615c8.072,0,14.615,6.543,14.615,14.615H43.935z">',
  '    <animateTransform attributeType="xml"',
  '    attributeName="transform"',
  '    type="rotate"',
  '    from="0 25 25"',
  '    to="360 25 25"',
  '    dur="780ms"',
  '    repeatCount="indefinite"',
  '    calcMode="spline"',
  '    keySplines="0.44, 0.22, 0, 1"',
  '    keyTimes="0;1"/>',
  '  </path>',
  '</svg>'
].join('');

LoaderSpinner.prototype.getElement = function () {
  return this._element;
};

LoaderSpinner.prototype.dispose = function () {
  this._element = null;
};

module.exports = LoaderSpinner;

},{}],31:[function(require,module,exports){
'use strict';

var utils = require(23);

function Receiver (callback) {
  this.postMessageReceiver(callback);
  this.hashChangeReceiver(callback);
}

Receiver.prototype.postMessageReceiver = function (callback) {
  var self = this;

  this.wrappedCallback = function (event) {
    var data = event.data;

    if (/^(auth_response=)/.test(data) || data === 'user_closed=true') {
      callback(data);
      self.stopListening();
    }
  };

  utils.addEventListener(window, 'message', this.wrappedCallback);
};

Receiver.prototype.hashChangeReceiver = function (callback) {
  var hash,
      originalHash = window.location.hash,
      self = this;

  this.poll = setInterval(function () {
    hash = window.location.hash;

    if (hash.length > 0 && (hash !== originalHash)) {
      self.stopListening();

      hash = hash.substring(1, hash.length);
      callback(hash);

      if (originalHash.length > 0) {
        window.location.hash = originalHash;
      } else {
        window.location.hash = '';
      }
    }
  }, 10);
};

Receiver.prototype.stopListening = function () {
  clearTimeout(this.poll);

  utils.removeEventListener(window, 'message', this.wrappedCallback);
};

module.exports = Receiver;

},{"23":23}],32:[function(require,module,exports){
(function (global){
'use strict';

var util = require(39);
var prepBody = require(38);
var parseBody = require(37);
var constants = require(34);
var isXHRAvailable = global.XMLHttpRequest && 'withCredentials' in new global.XMLHttpRequest();

function getRequestObject() {
  return isXHRAvailable ? new XMLHttpRequest() : new XDomainRequest();
}

function get(url, attrs, deserializer, callback, timeout) {
  var urlParams = util.createURLParams(url, attrs);
  makeRequest('GET', urlParams, null, deserializer, callback, timeout);
}

function post(url, attrs, deserializer, callback, timeout) {
  makeRequest('POST', url, attrs, deserializer, callback, timeout);
}

function makeRequest(method, url, body, deserializer, callback, timeout) {
  var status, resBody;
  var req = getRequestObject();

  callback = callback || function () {};

  if (isXHRAvailable) {
    req.onreadystatechange = function () {
      if (req.readyState !== 4) { return; }

      status = req.status;
      resBody = parseBody(req.responseText);

      if (status >= 400 || status === 0) {
        callback.call(null, resBody || {errors: constants.errors.UNKNOWN_ERROR}, null);
      } else if (status > 0) {
        callback.call(null, null, deserializer(resBody));
      }
    };
  } else {
    req.onload = function () {
      callback.call(null, null, deserializer(parseBody(req.responseText)));
    };

    req.onerror = function () {
      callback.call(null, req.responseText, null);
    };

    // This must remain for IE9 to work
    req.onprogress = function() {};

    req.ontimeout = function () {
      callback.call(null, {errors: constants.errors.UNKNOWN_ERROR}, null);
    };
  }

  req.open(method, url, true);
  req.timeout = timeout == null ? 60000 : timeout;

  if (isXHRAvailable && method === 'POST') {
    req.setRequestHeader('Content-Type', 'application/json');
  }

  setTimeout(function () {
    req.send(prepBody(method, body));
  }, 0);
}

module.exports = {
  get: get,
  post: post
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"34":34,"37":37,"38":38,"39":39}],33:[function(require,module,exports){
'use strict';

var JSONPDriver = require(35);
var AJAXDriver = require(32);
var util = require(39);

function chooseRequestDriver(options) {
  var ua = util.getUserAgent();
  var isAJAXAvailable = !(util.isHTTP() && /(MSIE\s(8|9))|(Phantom)/.test(ua));

  options = options || {};

  if (options.enableCORS && isAJAXAvailable) {
    return AJAXDriver;
  } else {
    return JSONPDriver;
  }
}

module.exports = chooseRequestDriver;

},{"32":32,"35":35,"39":39}],34:[function(require,module,exports){
module.exports={
  "errors": {
    "UNKNOWN_ERROR": "Unknown error",
    "INVALID_TIMEOUT": "Timeout must be a number"
  }
};

},{}],35:[function(require,module,exports){
'use strict';

var JSONP = require(36);
var constants = require(34);
var timeoutWatchers = [];

function deserialize(response, mapper) {
  if (response.status >= 400) {
    return [response, null];
  } else {
    return [null, mapper(response)];
  }
}

function noop() {}

function requestWithTimeout(url, attrs, deserializer, method, callback, timeout) {
  var uniqueName;

  callback = callback || noop;

  if (timeout == null) {
    timeout = 60000;
  }

  uniqueName = method(url, attrs, function (data, name) {
    if (timeoutWatchers[name]) {
      clearTimeout(timeoutWatchers[name]);
      callback.apply(null, deserialize(data, function (d) { return deserializer(d); }));
    }
  });

  if (typeof timeout === 'number') {
    timeoutWatchers[uniqueName] = setTimeout(function () {
      timeoutWatchers[uniqueName] = null;
      callback.apply(null, [{errors: constants.errors.UNKNOWN_ERROR}, null]);
    }, timeout);
  } else {
    callback.apply(null, [{errors: constants.errors.INVALID_TIMEOUT}, null]);
  }
}

function post(url, attrs, deserializer, callback, timeout) {
  attrs._method = 'POST';
  requestWithTimeout(url, attrs, deserializer, JSONP.get, callback, timeout);
}

function get(url, attrs, deserializer, callback, timeout) {
  requestWithTimeout(url, attrs, deserializer, JSONP.get, callback, timeout);
}

module.exports = {
  get: get,
  post: post
};

},{"34":34,"36":36}],36:[function(require,module,exports){
(function (global){
'use strict';

var util = require(39);

/*
* Lightweight JSONP fetcher
* Copyright 2010-2012 Erik Karlsson. All rights reserved.
* BSD licensed
*/
var head,
    window = global,
    config = {};

function load(url, pfnError) {
  var script = document.createElement('script'),
  done = false;
  script.src = url;
  script.async = true;

  var errorHandler = pfnError || config.error;
  if ( typeof errorHandler === 'function' ) {
    script.onerror = function (ex){
      errorHandler({url: url, event: ex});
    };
  }

  script.onload = script.onreadystatechange = function () {
    if ( !done && (!this.readyState || this.readyState === "loaded" || this.readyState === "complete") ) {
      done = true;
      script.onload = script.onreadystatechange = null;
      if ( script && script.parentNode ) {
        script.parentNode.removeChild( script );
      }
    }
  };

  if ( !head ) {
    head = document.getElementsByTagName('head')[0];
  }
  head.appendChild( script );
}

function jsonp(url, params, callback, callbackName) {
  var urlParams, key, uniqueName;

  callbackName = (callbackName||config['callbackName']||'callback');
  uniqueName = callbackName + "_json" + util.generateUUID();
  params[callbackName] = uniqueName;
  urlParams = util.createURLParams(url, params)

  window[ uniqueName ] = function (data){
    callback(data, uniqueName);
    try {
      delete window[ uniqueName ];
    } catch (e) {}
    window[ uniqueName ] = null;
  };

  load(urlParams);
  return uniqueName;
}

function setDefaults(obj){
  config = obj;
}

module.exports = {
  get: jsonp,
  init: setDefaults
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"39":39}],37:[function(require,module,exports){
'use strict';

module.exports = function (body) {
  try {
    body = JSON.parse(body);
  } catch (e) {}

  return body;
};

},{}],38:[function(require,module,exports){
'use strict';

var isString = require(48);

module.exports = function (method, body) {
  if (!isString(method)) {
    throw new Error('Method must be a string');
  }

  if (method.toLowerCase() !== 'get' && body != null) {
    body = isString(body) ? body : JSON.stringify(body);
  }

  return body;
};

},{"48":48}],39:[function(require,module,exports){
(function (global){
'use strict';

var isEmpty = require(41);
var isObject = require(47);

function isArray(value) {
  return value && typeof value === 'object' && typeof value.length === 'number' &&
    Object.prototype.toString.call(value) === '[object Array]' || false;
}

function stringify(params, namespace) {
  var query = [], k, v, p;

  for (p in params) {
    if (!params.hasOwnProperty(p)) {
      continue;
    }

    v = params[p];

    if (namespace) {
      if (isArray(params)) {
        k = namespace + '[]';
      } else {
        k = namespace + '[' + p + ']';
      }
    } else {
      k = p;
    }
    if (typeof v === 'object') {
      query.push(stringify(v, k));
    } else {
      query.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
    }
  }

  return query.join('&');
}

function generateUUID() { // RFC 4122 v4 (pseudo-random) UUID without hyphens
  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function (xORy) {
    var randomHex = Math.floor(Math.random() * 16);
    var uuidHex = xORy === 'x' ? randomHex : randomHex & 0x3 | 0x8; // jshint ignore:line
    return uuidHex.toString(16);
  });
}

function createURLParams(url, params) {
  url = url || '';

  if (!isEmpty(params) && isObject(params)) {
    url += url.indexOf('?') === -1 ? '?' : '';
    url += url.indexOf('=') !== -1 ? '&' : '';
    url += stringify(params);
  }

  return url;
}

function getUserAgent() {
  return global.navigator.userAgent;
}

function isHTTP() {
  return global.location.protocol === 'http:';
}

module.exports = {
  isArray: isArray,
  generateUUID: generateUUID,
  stringify: stringify,
  createURLParams: createURLParams,
  getUserAgent: getUserAgent,
  isHTTP: isHTTP
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"41":41,"47":47}],40:[function(require,module,exports){
'use strict';

var AJAXDriver = require(32);
var JSONPDriver = require(35);
var chooseDriver = require(33);
var util = require(39);

module.exports = {
  AJAXDriver: AJAXDriver,
  JSONPDriver: JSONPDriver,
  chooseDriver: chooseDriver,
  util: util
};

},{"32":32,"33":33,"35":35,"39":39}],41:[function(require,module,exports){
/**
 * lodash 3.0.4 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var isArguments = require(42),
    isArray = require(43),
    isFunction = require(44),
    isString = require(48),
    keys = require(45);

/**
 * Checks if `value` is object-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/**
 * Used as the [maximum length](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

/**
 * Gets the "length" property value of `object`.
 *
 * **Note:** This function is used to avoid a [JIT bug](https://bugs.webkit.org/show_bug.cgi?id=142792)
 * that affects Safari on at least iOS 8.1-8.3 ARM64.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {*} Returns the "length" value.
 */
var getLength = baseProperty('length');

/**
 * Checks if `value` is array-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 */
function isArrayLike(value) {
  return value != null && isLength(getLength(value));
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is empty. A value is considered empty unless it is an
 * `arguments` object, array, string, or jQuery-like collection with a length
 * greater than `0` or an object with own enumerable properties.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {Array|Object|string} value The value to inspect.
 * @returns {boolean} Returns `true` if `value` is empty, else `false`.
 * @example
 *
 * _.isEmpty(null);
 * // => true
 *
 * _.isEmpty(true);
 * // => true
 *
 * _.isEmpty(1);
 * // => true
 *
 * _.isEmpty([1, 2, 3]);
 * // => false
 *
 * _.isEmpty({ 'a': 1 });
 * // => false
 */
function isEmpty(value) {
  if (value == null) {
    return true;
  }
  if (isArrayLike(value) && (isArray(value) || isString(value) || isArguments(value) ||
      (isObjectLike(value) && isFunction(value.splice)))) {
    return !value.length;
  }
  return !keys(value).length;
}

module.exports = isEmpty;

},{"42":42,"43":43,"44":44,"45":45,"48":48}],42:[function(require,module,exports){
/**
 * lodash 3.0.4 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/**
 * Checks if `value` is object-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/** Native method references. */
var propertyIsEnumerable = objectProto.propertyIsEnumerable;

/**
 * Used as the [maximum length](http://ecma-international.org/ecma-262/6.0/#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

/**
 * Gets the "length" property value of `object`.
 *
 * **Note:** This function is used to avoid a [JIT bug](https://bugs.webkit.org/show_bug.cgi?id=142792)
 * that affects Safari on at least iOS 8.1-8.3 ARM64.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {*} Returns the "length" value.
 */
var getLength = baseProperty('length');

/**
 * Checks if `value` is array-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 */
function isArrayLike(value) {
  return value != null && isLength(getLength(value));
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](http://ecma-international.org/ecma-262/6.0/#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is classified as an `arguments` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isArguments(function() { return arguments; }());
 * // => true
 *
 * _.isArguments([1, 2, 3]);
 * // => false
 */
function isArguments(value) {
  return isObjectLike(value) && isArrayLike(value) &&
    hasOwnProperty.call(value, 'callee') && !propertyIsEnumerable.call(value, 'callee');
}

module.exports = isArguments;

},{}],43:[function(require,module,exports){
/**
 * lodash 3.0.4 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/** `Object#toString` result references. */
var arrayTag = '[object Array]',
    funcTag = '[object Function]';

/** Used to detect host constructors (Safari > 5). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/**
 * Checks if `value` is object-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var fnToString = Function.prototype.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  fnToString.call(hasOwnProperty).replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/* Native method references for those with the same name as other `lodash` methods. */
var nativeIsArray = getNative(Array, 'isArray');

/**
 * Used as the [maximum length](http://ecma-international.org/ecma-262/6.0/#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = object == null ? undefined : object[key];
  return isNative(value) ? value : undefined;
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](http://ecma-international.org/ecma-262/6.0/#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(function() { return arguments; }());
 * // => false
 */
var isArray = nativeIsArray || function(value) {
  return isObjectLike(value) && isLength(value.length) && objToString.call(value) == arrayTag;
};

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in older versions of Chrome and Safari which return 'function' for regexes
  // and Safari 8 equivalents which return 'object' for typed array constructors.
  return isObject(value) && objToString.call(value) == funcTag;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is a native function.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function, else `false`.
 * @example
 *
 * _.isNative(Array.prototype.push);
 * // => true
 *
 * _.isNative(_);
 * // => false
 */
function isNative(value) {
  if (value == null) {
    return false;
  }
  if (isFunction(value)) {
    return reIsNative.test(fnToString.call(value));
  }
  return isObjectLike(value) && reIsHostCtor.test(value);
}

module.exports = isArray;

},{}],44:[function(require,module,exports){
/**
 * lodash 3.0.6 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/** `Object#toString` result references. */
var funcTag = '[object Function]';

/** Used for native method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in older versions of Chrome and Safari which return 'function' for regexes
  // and Safari 8 equivalents which return 'object' for typed array constructors.
  return isObject(value) && objToString.call(value) == funcTag;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

module.exports = isFunction;

},{}],45:[function(require,module,exports){
/**
 * lodash 3.1.2 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var getNative = require(46),
    isArguments = require(42),
    isArray = require(43);

/** Used to detect unsigned integer values. */
var reIsUint = /^\d+$/;

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/* Native method references for those with the same name as other `lodash` methods. */
var nativeKeys = getNative(Object, 'keys');

/**
 * Used as the [maximum length](http://ecma-international.org/ecma-262/6.0/#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

/**
 * Gets the "length" property value of `object`.
 *
 * **Note:** This function is used to avoid a [JIT bug](https://bugs.webkit.org/show_bug.cgi?id=142792)
 * that affects Safari on at least iOS 8.1-8.3 ARM64.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {*} Returns the "length" value.
 */
var getLength = baseProperty('length');

/**
 * Checks if `value` is array-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 */
function isArrayLike(value) {
  return value != null && isLength(getLength(value));
}

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  value = (typeof value == 'number' || reIsUint.test(value)) ? +value : -1;
  length = length == null ? MAX_SAFE_INTEGER : length;
  return value > -1 && value % 1 == 0 && value < length;
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](http://ecma-international.org/ecma-262/6.0/#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * A fallback implementation of `Object.keys` which creates an array of the
 * own enumerable property names of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
function shimKeys(object) {
  var props = keysIn(object),
      propsLength = props.length,
      length = propsLength && object.length;

  var allowIndexes = !!length && isLength(length) &&
    (isArray(object) || isArguments(object));

  var index = -1,
      result = [];

  while (++index < propsLength) {
    var key = props[index];
    if ((allowIndexes && isIndex(key, length)) || hasOwnProperty.call(object, key)) {
      result.push(key);
    }
  }
  return result;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Creates an array of the own enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects. See the
 * [ES spec](http://ecma-international.org/ecma-262/6.0/#sec-object.keys)
 * for more details.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keys(new Foo);
 * // => ['a', 'b'] (iteration order is not guaranteed)
 *
 * _.keys('hi');
 * // => ['0', '1']
 */
var keys = !nativeKeys ? shimKeys : function(object) {
  var Ctor = object == null ? undefined : object.constructor;
  if ((typeof Ctor == 'function' && Ctor.prototype === object) ||
      (typeof object != 'function' && isArrayLike(object))) {
    return shimKeys(object);
  }
  return isObject(object) ? nativeKeys(object) : [];
};

/**
 * Creates an array of the own and inherited enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keysIn(new Foo);
 * // => ['a', 'b', 'c'] (iteration order is not guaranteed)
 */
function keysIn(object) {
  if (object == null) {
    return [];
  }
  if (!isObject(object)) {
    object = Object(object);
  }
  var length = object.length;
  length = (length && isLength(length) &&
    (isArray(object) || isArguments(object)) && length) || 0;

  var Ctor = object.constructor,
      index = -1,
      isProto = typeof Ctor == 'function' && Ctor.prototype === object,
      result = Array(length),
      skipIndexes = length > 0;

  while (++index < length) {
    result[index] = (index + '');
  }
  for (var key in object) {
    if (!(skipIndexes && isIndex(key, length)) &&
        !(key == 'constructor' && (isProto || !hasOwnProperty.call(object, key)))) {
      result.push(key);
    }
  }
  return result;
}

module.exports = keys;

},{"42":42,"43":43,"46":46}],46:[function(require,module,exports){
/**
 * lodash 3.9.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/** `Object#toString` result references. */
var funcTag = '[object Function]';

/** Used to detect host constructors (Safari > 5). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/**
 * Checks if `value` is object-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var fnToString = Function.prototype.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  fnToString.call(hasOwnProperty).replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = object == null ? undefined : object[key];
  return isNative(value) ? value : undefined;
}

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in older versions of Chrome and Safari which return 'function' for regexes
  // and Safari 8 equivalents which return 'object' for typed array constructors.
  return isObject(value) && objToString.call(value) == funcTag;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is a native function.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function, else `false`.
 * @example
 *
 * _.isNative(Array.prototype.push);
 * // => true
 *
 * _.isNative(_);
 * // => false
 */
function isNative(value) {
  if (value == null) {
    return false;
  }
  if (isFunction(value)) {
    return reIsNative.test(fnToString.call(value));
  }
  return isObjectLike(value) && reIsHostCtor.test(value);
}

module.exports = getNative;

},{}],47:[function(require,module,exports){
/**
 * lodash 3.0.2 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

module.exports = isObject;

},{}],48:[function(require,module,exports){
/**
 * lodash 3.0.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/** `Object#toString` result references. */
var stringTag = '[object String]';

/**
 * Checks if `value` is object-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/** Used for native method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the [`toStringTag`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/**
 * Checks if `value` is classified as a `String` primitive or object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isString('abc');
 * // => true
 *
 * _.isString(1);
 * // => false
 */
function isString(value) {
  return typeof value == 'string' || (isObjectLike(value) && objToString.call(value) == stringTag);
}

module.exports = isString;

},{}],49:[function(require,module,exports){
arguments[4][15][0].apply(exports,arguments)
},{"15":15}],50:[function(require,module,exports){
arguments[4][16][0].apply(exports,arguments)
},{"16":16}],51:[function(require,module,exports){
arguments[4][17][0].apply(exports,arguments)
},{"17":17}],52:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"18":18}],53:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"19":19}],54:[function(require,module,exports){
arguments[4][20][0].apply(exports,arguments)
},{"20":20}],55:[function(require,module,exports){
arguments[4][21][0].apply(exports,arguments)
},{"21":21,"49":49}],56:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"22":22}],57:[function(require,module,exports){
arguments[4][23][0].apply(exports,arguments)
},{"23":23,"49":49,"50":50,"51":51,"52":52,"53":53,"54":54,"55":55,"56":56}],58:[function(require,module,exports){
'use strict';

var utils = require(72);

function MessageBus(host, channel) {
  this.host = host || window;
  this.channel = channel || null;
  this.handlers = [];

  utils.addEventListener(this.host, 'message', utils.bind(this.receive, this));
}

MessageBus.prototype.receive = function (event) {
  var i, message, parsed, type;

  try {
    parsed = JSON.parse(event.data);
  } catch (e) {
    return;
  }

  type = parsed.type;
  message = new MessageBus.Message(this, event.source, parsed.data);

  for (i = 0; i < this.handlers.length; i++) {
    if (this.handlers[i].type === type) {
      this.handlers[i].handler(message);
    }
  }
};

MessageBus.prototype.send = function (source, type, data) {
  try {
    source.postMessage(JSON.stringify({
      type: this._namespaceEvent(type),
      data: data
    }), '*');
  } catch (e) {}
};

MessageBus.prototype.register = function (type, handler) {
  this.handlers.push({
    type: this._namespaceEvent(type),
    handler: handler
  });
};

MessageBus.prototype.unregister = function (type, handler) {
  for (var i = this.handlers.length - 1; i >= 0; i--) {
    if (this.handlers[i].type === type && this.handlers[i].handler === handler) {
      return this.handlers.splice(i, 1);
    }
  }
};

MessageBus.prototype._namespaceEvent = function (eventName) {
  return this.channel ? ['braintree', this.channel, eventName].join(':') : eventName;
};

MessageBus.Message = function (bus, source, content) {
  this.bus = bus;
  this.source = source;
  this.content = content;
};

MessageBus.Message.prototype.reply = function (type, data) {
  this.bus.send(this.source, type, data);
};

module.exports = MessageBus;

},{"72":72}],59:[function(require,module,exports){
'use strict';

var utils = require(72);

function PubsubClient(bus, target) {
  this.bus = bus;
  this.target = target;
  this.handlers = [];

  this.bus.register('publish', utils.bind(this._handleMessage, this));
}

PubsubClient.prototype._handleMessage = function (message) {
  var i,
  content = message.content,
  handlers = this.handlers[content.channel];

  if (typeof handlers !== 'undefined') {
    for (i = 0; i < handlers.length; i++) {
      handlers[i](content.data);
    }
  }
};

PubsubClient.prototype.publish = function (channel, data) {
  this.bus.send(this.target, 'publish', { channel: channel, data: data });
};

PubsubClient.prototype.subscribe = function (channel, handler) {
  this.handlers[channel] = this.handlers[channel] || [];
  this.handlers[channel].push(handler);
};

PubsubClient.prototype.unsubscribe = function (channel, handler) {
  var i,
  handlers = this.handlers[channel];

  if (typeof handlers !== 'undefined') {
    for (i = 0; i < handlers.length; i++) {
      if (handlers[i] === handler) {
        handlers.splice(i, 1);
      }
    }
  }
};

module.exports = PubsubClient;

},{"72":72}],60:[function(require,module,exports){
'use strict';

function PubsubServer(bus) {
  this.bus = bus;
  this.frames = [];
  this.handlers = [];
}

PubsubServer.prototype.subscribe = function (channel, handler) {
  this.handlers[channel] = this.handlers[channel] || [];
  this.handlers[channel].push(handler);
};

PubsubServer.prototype.registerFrame = function (frame) {
  this.frames.push(frame);
};

PubsubServer.prototype.unregisterFrame = function (frame) {
  for (var i = 0; i < this.frames.length; i++) {
    if (this.frames[i] === frame) {
      this.frames.splice(i, 1);
    }
  }
};

PubsubServer.prototype.publish = function (channel, data) {
  var i,
  handlers = this.handlers[channel];

  if (typeof handlers !== 'undefined') {
    for (i = 0; i < handlers.length; i++) {
      handlers[i](data);
    }
  }

  for (i = 0; i < this.frames.length; i++) {
    this.bus.send(this.frames[i], 'publish', {
      channel: channel,
      data: data
    });
  }
};

PubsubServer.prototype.unsubscribe = function (channel, handler) {
  var i,
  handlers = this.handlers[channel];

  if (typeof handlers !== 'undefined') {
    for (i = 0; i < handlers.length; i++) {
      if (handlers[i] === handler) {
        handlers.splice(i, 1);
      }
    }
  }
};

module.exports = PubsubServer;

},{}],61:[function(require,module,exports){
'use strict';

var utils = require(72);

function RPCClient(bus, target) {
  this.bus = bus;
  this.target = target || window.parent;
  this.counter = 0;
  this.callbacks = {};

  this.bus.register('rpc_response', utils.bind(this._handleResponse, this));
}

RPCClient.prototype._handleResponse = function (message) {
  var content = message.content,
  thisCallback = this.callbacks[content.id];

  if (typeof thisCallback === 'function') {
    thisCallback.apply(null, content.response);
    delete this.callbacks[content.id];
  }
};

RPCClient.prototype.invoke = function (method, args, callback) {
  var counter = this.counter++;

  this.callbacks[counter] = callback;
  this.bus.send(this.target, 'rpc_request', { id: counter, method: method, args: args });
};

module.exports = RPCClient;

},{"72":72}],62:[function(require,module,exports){
'use strict';

var utils = require(72);

function RPCServer(bus) {
  this.bus = bus;
  this.methods = {};

  this.bus.register('rpc_request', utils.bind(this._handleRequest, this));
}

RPCServer.prototype._handleRequest = function (message) {
  var reply,
  content = message.content,
  args = content.args || [],
  thisMethod = this.methods[content.method];

  if (typeof thisMethod === 'function') {
    reply = function () {
      message.reply('rpc_response', {
        id: content.id,
        response: Array.prototype.slice.call(arguments)
      });
    };

    args.push(reply);

    thisMethod.apply(null, args);
  }
};

RPCServer.prototype.reset = function () {
  this.methods = {};
};

RPCServer.prototype.define = function (method, handler) {
  this.methods[method] = handler;
};

module.exports = RPCServer;

},{"72":72}],63:[function(require,module,exports){
var MessageBus = require(58);
var PubsubClient = require(59);
var PubsubServer = require(60);
var RPCClient = require(61);
var RPCServer = require(62);

module.exports = {
  MessageBus: MessageBus,
  PubsubClient: PubsubClient,
  PubsubServer: PubsubServer,
  RPCClient: RPCClient,
  RPCServer: RPCServer
};

},{"58":58,"59":59,"60":60,"61":61,"62":62}],64:[function(require,module,exports){
arguments[4][15][0].apply(exports,arguments)
},{"15":15}],65:[function(require,module,exports){
arguments[4][16][0].apply(exports,arguments)
},{"16":16}],66:[function(require,module,exports){
arguments[4][17][0].apply(exports,arguments)
},{"17":17}],67:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"18":18}],68:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"19":19}],69:[function(require,module,exports){
arguments[4][20][0].apply(exports,arguments)
},{"20":20}],70:[function(require,module,exports){
arguments[4][21][0].apply(exports,arguments)
},{"21":21,"64":64}],71:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"22":22}],72:[function(require,module,exports){
arguments[4][23][0].apply(exports,arguments)
},{"23":23,"64":64,"65":65,"66":66,"67":67,"68":68,"69":69,"70":70,"71":71}],73:[function(require,module,exports){
arguments[4][15][0].apply(exports,arguments)
},{"15":15}],74:[function(require,module,exports){
arguments[4][16][0].apply(exports,arguments)
},{"16":16}],75:[function(require,module,exports){
arguments[4][17][0].apply(exports,arguments)
},{"17":17}],76:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"18":18}],77:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"19":19}],78:[function(require,module,exports){
arguments[4][20][0].apply(exports,arguments)
},{"20":20}],79:[function(require,module,exports){
arguments[4][21][0].apply(exports,arguments)
},{"21":21,"73":73}],80:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"22":22}],81:[function(require,module,exports){
arguments[4][23][0].apply(exports,arguments)
},{"23":23,"73":73,"74":74,"75":75,"76":76,"77":77,"78":78,"79":79,"80":80}],82:[function(require,module,exports){
'use strict';

module.exports = ClassList

var indexOf = require(83),
    trim = require(84),
    arr = Array.prototype

/**
 * ClassList(elem) is kind of like Element#classList.
 *
 * @param {Element} elem
 * @return {ClassList}
 */
function ClassList (elem) {
  if (!(this instanceof ClassList))
    return new ClassList(elem)

  var classes = trim(elem.className).split(/\s+/),
      i

  this._elem = elem

  this.length = 0

  for (i = 0; i < classes.length; i += 1) {
    if (classes[i])
      arr.push.call(this, classes[i])
  }
}

/**
 * add(class1 [, class2 [, ...]]) adds the given class(es) to the
 * element.
 *
 * @param {String} ...
 * @return {Context}
 */
ClassList.prototype.add = function () {
  var name,
      i

  for (i = 0; i < arguments.length; i += 1) {
    name = '' + arguments[i]

    if (indexOf(this, name) >= 0)
      continue

    arr.push.call(this, name)
  }

  this._elem.className = this.toString()

  return this
}

/**
 * remove(class1 [, class2 [, ...]]) removes the given class(es) from
 * the element.
 *
 * @param {String} ...
 * @return {Context}
 */
ClassList.prototype.remove = function () {
  var index,
      name,
      i

  for (i = 0; i < arguments.length; i += 1) {
    name = '' + arguments[i]
    index = indexOf(this, name)

    if (index < 0) continue

    arr.splice.call(this, index, 1)
  }

  this._elem.className = this.toString()

  return this
}

/**
 * contains(name) determines if the element has a given class.
 *
 * @param {String} name
 * @return {Boolean}
 */
ClassList.prototype.contains = function (name) {
  name += ''
  return indexOf(this, name) >= 0
}

/**
 * toggle(name [, force]) toggles a class. If force is a boolean,
 * this method is basically just an alias for add/remove.
 *
 * @param {String} name
 * @param {Boolean} force
 * @return {Context}
 */
ClassList.prototype.toggle = function (name, force) {
  name += ''

  if (force === true) return this.add(name)
  if (force === false) return this.remove(name)

  return this[this.contains(name) ? 'remove' : 'add'](name)
}

/**
 * toString() returns the className of the element.
 *
 * @return {String}
 */
ClassList.prototype.toString = function () {
  return arr.join.call(this, ' ')
}

},{"83":83,"84":84}],83:[function(require,module,exports){
module.exports = function(arr, obj){
  if (arr.indexOf) return arr.indexOf(obj);
  for (var i = 0; i < arr.length; ++i) {
    if (arr[i] === obj) return i;
  }
  return -1;
};
},{}],84:[function(require,module,exports){

exports = module.exports = trim;

function trim(str){
  return str.replace(/^\s*|\s*$/g, '');
}

exports.left = function(str){
  return str.replace(/^\s*/, '');
};

exports.right = function(str){
  return str.replace(/\s*$/, '');
};

},{}],85:[function(require,module,exports){
'use strict';

var batchExecuteFunctions = require(86);
// Reach into lib for isFunction. This lib requires a DOM and cannot be
// tested otherwise
var fnUtil = require(87);

function Destructor() {
  this._teardownRegistry = [];
}

Destructor.prototype.registerFunctionForTeardown = function (fn) {
  if (fnUtil.isFunction(fn)) {
    this._teardownRegistry.push(fn);
  }
};

Destructor.prototype.teardown = function (callback) {
  batchExecuteFunctions(this._teardownRegistry, fnUtil.bind(function (err) {
    this._teardownRegistry = [];

    if (fnUtil.isFunction(callback)) {
      callback(err);
    }
  }, this));
};

module.exports = Destructor;

},{"86":86,"87":87}],86:[function(require,module,exports){
'use strict';

function call(fn, callback) {
  var isSync = fn.length === 0;
  var wrappedCallback;

  if (isSync) {
    fn();
    callback(null);
  } else {
    wrappedCallback = once(callback);
    fn(wrappedCallback);
  }
}

function once(fn) {
  var called = false;
  return function () {
    if (!called) {
      called = true;
      fn.apply(this, arguments);
    }
  };
}

module.exports = function (functions, callback) {
  var length = functions.length;
  var remaining = length;

  if (length === 0) {
    callback(null);
    return;
  }

  for (var i = 0; i < length; i++) {
    call(functions[i], function (err) {
      if (err) {
        callback(err);
        return;
      }

      remaining -= 1;
      if (remaining === 0) {
        callback(null);
      }
    });
  }
};

},{}],87:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"19":19}],88:[function(require,module,exports){
(function (global){
'use strict';

function FormNapper(form) {
  if (typeof form === 'string' || form instanceof String) {
    form = document.getElementById(form);
  }

  if (form instanceof HTMLFormElement) {
    this.htmlForm = form;
  } else {
    throw new TypeError('FormNapper requires an HTMLFormElement element or the id string of one.');
  }
}

FormNapper.prototype.hijack = function (onsubmit) {
  if (this.submitHandler) { return; }

  this.submitHandler = function (event) {
    if (event.preventDefault) {
      event.preventDefault();
    } else {
      event.returnValue = false;
    }

    onsubmit(event);
  };

  if (global.addEventListener != null) {
    this.htmlForm.addEventListener('submit', this.submitHandler, false);
  } else if (global.attachEvent != null) {
    this.htmlForm.attachEvent('onsubmit', this.submitHandler);
  } else {
    this.htmlForm.onsubmit = this.submitHandler;
  }
};

FormNapper.prototype.inject = function (name, value) {
  var input = this.htmlForm.querySelector('input[name="' + name + '"]');

  if (input == null) {
    input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    this.htmlForm.appendChild(input);
  }

  input.value = value;

  return input;
};

FormNapper.prototype.submit = function () {
  HTMLFormElement.prototype.submit.call(this.htmlForm);
};

FormNapper.prototype.detach = function () {
  if (!this.submitHandler) { return; }

  if (global.removeEventListener != null) {
    this.htmlForm.removeEventListener('submit', this.submitHandler, false);
  } else if (global.detachEvent != null) {
    this.htmlForm.detachEvent('onsubmit', this.submitHandler);
  } else {
    this.htmlForm.onsubmit = null;
  }

  delete this.submitHandler;
};

module.exports = FormNapper;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],89:[function(require,module,exports){
'use strict';
(function (root, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    root.framebus = factory();
  }
})(this, function () {
  var win, framebus;
  var popups = [];
  var subscribers = {};
  var prefix = '/*framebus*/';

  function include(popup) {
    if (popup == null) { return false; }
    if (popup.Window == null) { return false; }
    if (popup.constructor !== popup.Window) { return false; }

    popups.push(popup);
    return true;
  }

  function target(origin) {
    var key;
    var targetedFramebus = {};

    for (key in framebus) {
      if (!framebus.hasOwnProperty(key)) { continue; }

      targetedFramebus[key] = framebus[key];
    }

    targetedFramebus._origin = origin || '*';

    return targetedFramebus;
  }

  function publish(event) {
    var payload, args;
    var origin = _getOrigin(this);

    if (_isntString(event)) { return false; }
    if (_isntString(origin)) { return false; }

    args = Array.prototype.slice.call(arguments, 1);

    payload = _packagePayload(event, args, origin);
    if (payload === false) { return false; }

    _broadcast(win.top, payload, origin);

    return true;
  }

  function subscribe(event, fn) {
    var origin = _getOrigin(this);

    if (_subscriptionArgsInvalid(event, fn, origin)) { return false; }

    subscribers[origin] = subscribers[origin] || {};
    subscribers[origin][event] = subscribers[origin][event] || [];
    subscribers[origin][event].push(fn);

    return true;
  }

  function unsubscribe(event, fn) {
    var i, subscriberList;
    var origin = _getOrigin(this);

    if (_subscriptionArgsInvalid(event, fn, origin)) { return false; }

    subscriberList = subscribers[origin] && subscribers[origin][event];
    if (!subscriberList) { return false; }

    for (i = 0; i < subscriberList.length; i++) {
      if (subscriberList[i] === fn) {
        subscriberList.splice(i, 1);
        return true;
      }
    }

    return false;
  }

  function _getOrigin(scope) {
    return scope && scope._origin || '*';
  }

  function _isntString(string) {
    return typeof string !== 'string';
  }

  function _packagePayload(event, args, origin) {
    var packaged = false;
    var payload = {
      event:  event,
      origin: origin
    };
    var reply = args[args.length - 1];

    if (typeof reply === 'function') {
      payload.reply = _subscribeReplier(reply, origin);
      args = args.slice(0, -1);
    }

    payload.args = args;

    try {
      packaged = prefix + JSON.stringify(payload);
    } catch (e) {
      throw new Error('Could not stringify event: ' + e.message);
    }
    return packaged;
  }

  function _unpackPayload(e) {
    var payload, replyOrigin, replySource, replyEvent;

    if (e.data.slice(0, prefix.length) !== prefix) { return false; }

    try {
      payload = JSON.parse(e.data.slice(prefix.length));
    } catch (err) {
      return false;
    }

    if (payload.reply != null) {
      replyOrigin = e.origin;
      replySource = e.source;
      replyEvent = payload.reply;

      payload.reply = function reply(data) {
        var replyPayload = _packagePayload(replyEvent, [data], replyOrigin);
        if (replyPayload === false) { return false; }

        replySource.postMessage(replyPayload, replyOrigin);
      };

      payload.args.push(payload.reply);
    }

    return payload;
  }

  function _attach(w) {
    if (win) { return; }
    win = w || window;

    if (win.addEventListener) {
      win.addEventListener('message', _onmessage, false);
    } else if (win.attachEvent) {
      win.attachEvent('onmessage', _onmessage);
    } else if (win.onmessage === null) {
      win.onmessage = _onmessage;
    } else {
      win = null;
    }
  }

  function _uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      var v = c === 'x' ? r : r & 0x3 | 0x8;
      return v.toString(16);
    });
  }

  function _onmessage(e) {
    var payload;
    if (_isntString(e.data)) { return; }

    payload = _unpackPayload(e);
    if (!payload) { return; }

    _dispatch('*', payload.event, payload.args, e);
    _dispatch(e.origin, payload.event, payload.args, e);
    _broadcastPopups(e.data, payload.origin, e.source);
  }

  function _dispatch(origin, event, args, e) {
    var i;
    if (!subscribers[origin]) { return; }
    if (!subscribers[origin][event]) { return; }

    for (i = 0; i < subscribers[origin][event].length; i++) {
      subscribers[origin][event][i].apply(e, args);
    }
  }

  function _broadcast(frame, payload, origin) {
    var i;

    try {
      frame.postMessage(payload, origin);
    } catch (_) { return; }

    if (frame.opener && frame.opener !== frame && !frame.opener.closed && frame.opener !== win) {
      _broadcast(frame.opener.top, payload, origin);
    }

    for (i = 0; i < frame.frames.length; i++) {
      _broadcast(frame.frames[i], payload, origin);
    }
  }

  function _broadcastPopups(payload, origin, source) {
    var i, popup;

    for (i = popups.length - 1; i >= 0; i--) {
      popup = popups[i];

      if (popup.closed === true) {
        popups = popups.slice(i, 1);
      } else if (source !== popup) {
        _broadcast(popup.top, payload, origin);
      }
    }
  }

  function _subscribeReplier(fn, origin) {
    var uuid = _uuid();

    function replier(d, o) {
      fn(d, o);
      framebus.target(origin).unsubscribe(uuid, replier);
    }

    framebus.target(origin).subscribe(uuid, replier);
    return uuid;
  }

  function _subscriptionArgsInvalid(event, fn, origin) {
    if (_isntString(event)) { return true; }
    if (typeof fn !== 'function') { return true; }
    if (_isntString(origin)) { return true; }

    return false;
  }

  _attach();

  framebus = {
    target:                   target,
    include:                  include,
    publish:                  publish,
    pub:                      publish,
    trigger:                  publish,
    emit:                     publish,
    subscribe:                subscribe,
    sub:                      subscribe,
    on:                       subscribe,
    unsubscribe:              unsubscribe,
    unsub:                    unsubscribe,
    off:                      unsubscribe
  };

  return framebus;
});

},{}],90:[function(require,module,exports){
'use strict';

var assign = require(155);
var isString = require(154);
var setAttributes = require(92);
var defaultAttributes = require(91);

module.exports = function createFrame(options) {
  var iframe = document.createElement('iframe');
  var config = assign({}, defaultAttributes, options);

  if (config.style && !isString(config.style)) {
    assign(iframe.style, config.style);
    delete config.style;
  }

  setAttributes(iframe, config);

  if (!iframe.getAttribute('id')) {
    iframe.id = iframe.name;
  }

  return iframe;
};

},{"154":154,"155":155,"91":91,"92":92}],91:[function(require,module,exports){
module.exports={
  "src": "about:blank",
  "frameBorder": 0,
  "allowtransparency": true,
  "scrolling": "no"
}

},{}],92:[function(require,module,exports){
module.exports = function setAttributes(element, attributes) {
  var value;

  for (var key in attributes) {
    if (attributes.hasOwnProperty(key)) {
      value = attributes[key];

      if (value == null) {
        element.removeAttribute(key);
      } else {
        element.setAttribute(key, value);
      }
    }
  }
};

},{}],93:[function(require,module,exports){
var LazyWrapper = require(98),
    LodashWrapper = require(99),
    baseLodash = require(112),
    isArray = require(150),
    isObjectLike = require(138),
    wrapperClone = require(147);

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Creates a `lodash` object which wraps `value` to enable implicit chaining.
 * Methods that operate on and return arrays, collections, and functions can
 * be chained together. Methods that retrieve a single value or may return a
 * primitive value will automatically end the chain returning the unwrapped
 * value. Explicit chaining may be enabled using `_.chain`. The execution of
 * chained methods is lazy, that is, execution is deferred until `_#value`
 * is implicitly or explicitly called.
 *
 * Lazy evaluation allows several methods to support shortcut fusion. Shortcut
 * fusion is an optimization strategy which merge iteratee calls; this can help
 * to avoid the creation of intermediate data structures and greatly reduce the
 * number of iteratee executions.
 *
 * Chaining is supported in custom builds as long as the `_#value` method is
 * directly or indirectly included in the build.
 *
 * In addition to lodash methods, wrappers have `Array` and `String` methods.
 *
 * The wrapper `Array` methods are:
 * `concat`, `join`, `pop`, `push`, `reverse`, `shift`, `slice`, `sort`,
 * `splice`, and `unshift`
 *
 * The wrapper `String` methods are:
 * `replace` and `split`
 *
 * The wrapper methods that support shortcut fusion are:
 * `compact`, `drop`, `dropRight`, `dropRightWhile`, `dropWhile`, `filter`,
 * `first`, `initial`, `last`, `map`, `pluck`, `reject`, `rest`, `reverse`,
 * `slice`, `take`, `takeRight`, `takeRightWhile`, `takeWhile`, `toArray`,
 * and `where`
 *
 * The chainable wrapper methods are:
 * `after`, `ary`, `assign`, `at`, `before`, `bind`, `bindAll`, `bindKey`,
 * `callback`, `chain`, `chunk`, `commit`, `compact`, `concat`, `constant`,
 * `countBy`, `create`, `curry`, `debounce`, `defaults`, `defaultsDeep`,
 * `defer`, `delay`, `difference`, `drop`, `dropRight`, `dropRightWhile`,
 * `dropWhile`, `fill`, `filter`, `flatten`, `flattenDeep`, `flow`, `flowRight`,
 * `forEach`, `forEachRight`, `forIn`, `forInRight`, `forOwn`, `forOwnRight`,
 * `functions`, `groupBy`, `indexBy`, `initial`, `intersection`, `invert`,
 * `invoke`, `keys`, `keysIn`, `map`, `mapKeys`, `mapValues`, `matches`,
 * `matchesProperty`, `memoize`, `merge`, `method`, `methodOf`, `mixin`,
 * `modArgs`, `negate`, `omit`, `once`, `pairs`, `partial`, `partialRight`,
 * `partition`, `pick`, `plant`, `pluck`, `property`, `propertyOf`, `pull`,
 * `pullAt`, `push`, `range`, `rearg`, `reject`, `remove`, `rest`, `restParam`,
 * `reverse`, `set`, `shuffle`, `slice`, `sort`, `sortBy`, `sortByAll`,
 * `sortByOrder`, `splice`, `spread`, `take`, `takeRight`, `takeRightWhile`,
 * `takeWhile`, `tap`, `throttle`, `thru`, `times`, `toArray`, `toPlainObject`,
 * `transform`, `union`, `uniq`, `unshift`, `unzip`, `unzipWith`, `values`,
 * `valuesIn`, `where`, `without`, `wrap`, `xor`, `zip`, `zipObject`, `zipWith`
 *
 * The wrapper methods that are **not** chainable by default are:
 * `add`, `attempt`, `camelCase`, `capitalize`, `ceil`, `clone`, `cloneDeep`,
 * `deburr`, `endsWith`, `escape`, `escapeRegExp`, `every`, `find`, `findIndex`,
 * `findKey`, `findLast`, `findLastIndex`, `findLastKey`, `findWhere`, `first`,
 * `floor`, `get`, `gt`, `gte`, `has`, `identity`, `includes`, `indexOf`,
 * `inRange`, `isArguments`, `isArray`, `isBoolean`, `isDate`, `isElement`,
 * `isEmpty`, `isEqual`, `isError`, `isFinite` `isFunction`, `isMatch`,
 * `isNative`, `isNaN`, `isNull`, `isNumber`, `isObject`, `isPlainObject`,
 * `isRegExp`, `isString`, `isUndefined`, `isTypedArray`, `join`, `kebabCase`,
 * `last`, `lastIndexOf`, `lt`, `lte`, `max`, `min`, `noConflict`, `noop`,
 * `now`, `pad`, `padLeft`, `padRight`, `parseInt`, `pop`, `random`, `reduce`,
 * `reduceRight`, `repeat`, `result`, `round`, `runInContext`, `shift`, `size`,
 * `snakeCase`, `some`, `sortedIndex`, `sortedLastIndex`, `startCase`,
 * `startsWith`, `sum`, `template`, `trim`, `trimLeft`, `trimRight`, `trunc`,
 * `unescape`, `uniqueId`, `value`, and `words`
 *
 * The wrapper method `sample` will return a wrapped value when `n` is provided,
 * otherwise an unwrapped value is returned.
 *
 * @name _
 * @constructor
 * @category Chain
 * @param {*} value The value to wrap in a `lodash` instance.
 * @returns {Object} Returns the new `lodash` wrapper instance.
 * @example
 *
 * var wrapped = _([1, 2, 3]);
 *
 * // returns an unwrapped value
 * wrapped.reduce(function(total, n) {
 *   return total + n;
 * });
 * // => 6
 *
 * // returns a wrapped value
 * var squares = wrapped.map(function(n) {
 *   return n * n;
 * });
 *
 * _.isArray(squares);
 * // => false
 *
 * _.isArray(squares.value());
 * // => true
 */
function lodash(value) {
  if (isObjectLike(value) && !isArray(value) && !(value instanceof LazyWrapper)) {
    if (value instanceof LodashWrapper) {
      return value;
    }
    if (hasOwnProperty.call(value, '__chain__') && hasOwnProperty.call(value, '__wrapped__')) {
      return wrapperClone(value);
    }
  }
  return new LodashWrapper(value);
}

// Ensure wrappers are instances of `baseLodash`.
lodash.prototype = baseLodash.prototype;

module.exports = lodash;

},{"112":112,"138":138,"147":147,"150":150,"98":98,"99":99}],94:[function(require,module,exports){
var getNative = require(129);

/* Native method references for those with the same name as other `lodash` methods. */
var nativeNow = getNative(Date, 'now');

/**
 * Gets the number of milliseconds that have elapsed since the Unix epoch
 * (1 January 1970 00:00:00 UTC).
 *
 * @static
 * @memberOf _
 * @category Date
 * @example
 *
 * _.defer(function(stamp) {
 *   console.log(_.now() - stamp);
 * }, _.now());
 * // => logs the number of milliseconds it took for the deferred function to be invoked
 */
var now = nativeNow || function() {
  return new Date().getTime();
};

module.exports = now;

},{"129":129}],95:[function(require,module,exports){
var createWrapper = require(125),
    replaceHolders = require(143),
    restParam = require(97);

/** Used to compose bitmasks for wrapper metadata. */
var BIND_FLAG = 1,
    PARTIAL_FLAG = 32;

/**
 * Creates a function that invokes `func` with the `this` binding of `thisArg`
 * and prepends any additional `_.bind` arguments to those provided to the
 * bound function.
 *
 * The `_.bind.placeholder` value, which defaults to `_` in monolithic builds,
 * may be used as a placeholder for partially applied arguments.
 *
 * **Note:** Unlike native `Function#bind` this method does not set the "length"
 * property of bound functions.
 *
 * @static
 * @memberOf _
 * @category Function
 * @param {Function} func The function to bind.
 * @param {*} thisArg The `this` binding of `func`.
 * @param {...*} [partials] The arguments to be partially applied.
 * @returns {Function} Returns the new bound function.
 * @example
 *
 * var greet = function(greeting, punctuation) {
 *   return greeting + ' ' + this.user + punctuation;
 * };
 *
 * var object = { 'user': 'fred' };
 *
 * var bound = _.bind(greet, object, 'hi');
 * bound('!');
 * // => 'hi fred!'
 *
 * // using placeholders
 * var bound = _.bind(greet, object, _, '!');
 * bound('hi');
 * // => 'hi fred!'
 */
var bind = restParam(function(func, thisArg, partials) {
  var bitmask = BIND_FLAG;
  if (partials.length) {
    var holders = replaceHolders(partials, bind.placeholder);
    bitmask |= PARTIAL_FLAG;
  }
  return createWrapper(func, bitmask, thisArg, partials, holders);
});

// Assign default placeholders.
bind.placeholder = {};

module.exports = bind;

},{"125":125,"143":143,"97":97}],96:[function(require,module,exports){
var baseFlatten = require(108),
    createWrapper = require(125),
    functions = require(157),
    restParam = require(97);

/** Used to compose bitmasks for wrapper metadata. */
var BIND_FLAG = 1;

/**
 * Binds methods of an object to the object itself, overwriting the existing
 * method. Method names may be specified as individual arguments or as arrays
 * of method names. If no method names are provided all enumerable function
 * properties, own and inherited, of `object` are bound.
 *
 * **Note:** This method does not set the "length" property of bound functions.
 *
 * @static
 * @memberOf _
 * @category Function
 * @param {Object} object The object to bind and assign the bound methods to.
 * @param {...(string|string[])} [methodNames] The object method names to bind,
 *  specified as individual method names or arrays of method names.
 * @returns {Object} Returns `object`.
 * @example
 *
 * var view = {
 *   'label': 'docs',
 *   'onClick': function() {
 *     console.log('clicked ' + this.label);
 *   }
 * };
 *
 * _.bindAll(view);
 * jQuery('#docs').on('click', view.onClick);
 * // => logs 'clicked docs' when the element is clicked
 */
var bindAll = restParam(function(object, methodNames) {
  methodNames = methodNames.length ? baseFlatten(methodNames) : functions(object);

  var index = -1,
      length = methodNames.length;

  while (++index < length) {
    var key = methodNames[index];
    object[key] = createWrapper(object[key], BIND_FLAG, object);
  }
  return object;
});

module.exports = bindAll;

},{"108":108,"125":125,"157":157,"97":97}],97:[function(require,module,exports){
/** Used as the `TypeError` message for "Functions" methods. */
var FUNC_ERROR_TEXT = 'Expected a function';

/* Native method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max;

/**
 * Creates a function that invokes `func` with the `this` binding of the
 * created function and arguments from `start` and beyond provided as an array.
 *
 * **Note:** This method is based on the [rest parameter](https://developer.mozilla.org/Web/JavaScript/Reference/Functions/rest_parameters).
 *
 * @static
 * @memberOf _
 * @category Function
 * @param {Function} func The function to apply a rest parameter to.
 * @param {number} [start=func.length-1] The start position of the rest parameter.
 * @returns {Function} Returns the new function.
 * @example
 *
 * var say = _.restParam(function(what, names) {
 *   return what + ' ' + _.initial(names).join(', ') +
 *     (_.size(names) > 1 ? ', & ' : '') + _.last(names);
 * });
 *
 * say('hello', 'fred', 'barney', 'pebbles');
 * // => 'hello fred, barney, & pebbles'
 */
function restParam(func, start) {
  if (typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  start = nativeMax(start === undefined ? (func.length - 1) : (+start || 0), 0);
  return function() {
    var args = arguments,
        index = -1,
        length = nativeMax(args.length - start, 0),
        rest = Array(length);

    while (++index < length) {
      rest[index] = args[start + index];
    }
    switch (start) {
      case 0: return func.call(this, rest);
      case 1: return func.call(this, args[0], rest);
      case 2: return func.call(this, args[0], args[1], rest);
    }
    var otherArgs = Array(start + 1);
    index = -1;
    while (++index < start) {
      otherArgs[index] = args[index];
    }
    otherArgs[start] = rest;
    return func.apply(this, otherArgs);
  };
}

module.exports = restParam;

},{}],98:[function(require,module,exports){
var baseCreate = require(107),
    baseLodash = require(112);

/** Used as references for `-Infinity` and `Infinity`. */
var POSITIVE_INFINITY = Number.POSITIVE_INFINITY;

/**
 * Creates a lazy wrapper object which wraps `value` to enable lazy evaluation.
 *
 * @private
 * @param {*} value The value to wrap.
 */
function LazyWrapper(value) {
  this.__wrapped__ = value;
  this.__actions__ = [];
  this.__dir__ = 1;
  this.__filtered__ = false;
  this.__iteratees__ = [];
  this.__takeCount__ = POSITIVE_INFINITY;
  this.__views__ = [];
}

LazyWrapper.prototype = baseCreate(baseLodash.prototype);
LazyWrapper.prototype.constructor = LazyWrapper;

module.exports = LazyWrapper;

},{"107":107,"112":112}],99:[function(require,module,exports){
var baseCreate = require(107),
    baseLodash = require(112);

/**
 * The base constructor for creating `lodash` wrapper objects.
 *
 * @private
 * @param {*} value The value to wrap.
 * @param {boolean} [chainAll] Enable chaining for all wrapper methods.
 * @param {Array} [actions=[]] Actions to peform to resolve the unwrapped value.
 */
function LodashWrapper(value, chainAll, actions) {
  this.__wrapped__ = value;
  this.__actions__ = actions || [];
  this.__chain__ = !!chainAll;
}

LodashWrapper.prototype = baseCreate(baseLodash.prototype);
LodashWrapper.prototype.constructor = LodashWrapper;

module.exports = LodashWrapper;

},{"107":107,"112":112}],100:[function(require,module,exports){
/**
 * Copies the values of `source` to `array`.
 *
 * @private
 * @param {Array} source The array to copy values from.
 * @param {Array} [array=[]] The array to copy values to.
 * @returns {Array} Returns `array`.
 */
function arrayCopy(source, array) {
  var index = -1,
      length = source.length;

  array || (array = Array(length));
  while (++index < length) {
    array[index] = source[index];
  }
  return array;
}

module.exports = arrayCopy;

},{}],101:[function(require,module,exports){
/**
 * A specialized version of `_.forEach` for arrays without support for callback
 * shorthands and `this` binding.
 *
 * @private
 * @param {Array} array The array to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns `array`.
 */
function arrayEach(array, iteratee) {
  var index = -1,
      length = array.length;

  while (++index < length) {
    if (iteratee(array[index], index, array) === false) {
      break;
    }
  }
  return array;
}

module.exports = arrayEach;

},{}],102:[function(require,module,exports){
/**
 * Appends the elements of `values` to `array`.
 *
 * @private
 * @param {Array} array The array to modify.
 * @param {Array} values The values to append.
 * @returns {Array} Returns `array`.
 */
function arrayPush(array, values) {
  var index = -1,
      length = values.length,
      offset = array.length;

  while (++index < length) {
    array[offset + index] = values[index];
  }
  return array;
}

module.exports = arrayPush;

},{}],103:[function(require,module,exports){
var keys = require(158);

/**
 * A specialized version of `_.assign` for customizing assigned values without
 * support for argument juggling, multiple sources, and `this` binding `customizer`
 * functions.
 *
 * @private
 * @param {Object} object The destination object.
 * @param {Object} source The source object.
 * @param {Function} customizer The function to customize assigned values.
 * @returns {Object} Returns `object`.
 */
function assignWith(object, source, customizer) {
  var index = -1,
      props = keys(source),
      length = props.length;

  while (++index < length) {
    var key = props[index],
        value = object[key],
        result = customizer(value, source[key], key, object, source);

    if ((result === result ? (result !== value) : (value === value)) ||
        (value === undefined && !(key in object))) {
      object[key] = result;
    }
  }
  return object;
}

module.exports = assignWith;

},{"158":158}],104:[function(require,module,exports){
var baseCopy = require(106),
    keys = require(158);

/**
 * The base implementation of `_.assign` without support for argument juggling,
 * multiple sources, and `customizer` functions.
 *
 * @private
 * @param {Object} object The destination object.
 * @param {Object} source The source object.
 * @returns {Object} Returns `object`.
 */
function baseAssign(object, source) {
  return source == null
    ? object
    : baseCopy(source, keys(source), object);
}

module.exports = baseAssign;

},{"106":106,"158":158}],105:[function(require,module,exports){
var arrayCopy = require(100),
    arrayEach = require(101),
    baseAssign = require(104),
    baseForOwn = require(110),
    initCloneArray = require(130),
    initCloneByTag = require(131),
    initCloneObject = require(132),
    isArray = require(150),
    isObject = require(153);

/** `Object#toString` result references. */
var argsTag = '[object Arguments]',
    arrayTag = '[object Array]',
    boolTag = '[object Boolean]',
    dateTag = '[object Date]',
    errorTag = '[object Error]',
    funcTag = '[object Function]',
    mapTag = '[object Map]',
    numberTag = '[object Number]',
    objectTag = '[object Object]',
    regexpTag = '[object RegExp]',
    setTag = '[object Set]',
    stringTag = '[object String]',
    weakMapTag = '[object WeakMap]';

var arrayBufferTag = '[object ArrayBuffer]',
    float32Tag = '[object Float32Array]',
    float64Tag = '[object Float64Array]',
    int8Tag = '[object Int8Array]',
    int16Tag = '[object Int16Array]',
    int32Tag = '[object Int32Array]',
    uint8Tag = '[object Uint8Array]',
    uint8ClampedTag = '[object Uint8ClampedArray]',
    uint16Tag = '[object Uint16Array]',
    uint32Tag = '[object Uint32Array]';

/** Used to identify `toStringTag` values supported by `_.clone`. */
var cloneableTags = {};
cloneableTags[argsTag] = cloneableTags[arrayTag] =
cloneableTags[arrayBufferTag] = cloneableTags[boolTag] =
cloneableTags[dateTag] = cloneableTags[float32Tag] =
cloneableTags[float64Tag] = cloneableTags[int8Tag] =
cloneableTags[int16Tag] = cloneableTags[int32Tag] =
cloneableTags[numberTag] = cloneableTags[objectTag] =
cloneableTags[regexpTag] = cloneableTags[stringTag] =
cloneableTags[uint8Tag] = cloneableTags[uint8ClampedTag] =
cloneableTags[uint16Tag] = cloneableTags[uint32Tag] = true;
cloneableTags[errorTag] = cloneableTags[funcTag] =
cloneableTags[mapTag] = cloneableTags[setTag] =
cloneableTags[weakMapTag] = false;

/** Used for native method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/**
 * The base implementation of `_.clone` without support for argument juggling
 * and `this` binding `customizer` functions.
 *
 * @private
 * @param {*} value The value to clone.
 * @param {boolean} [isDeep] Specify a deep clone.
 * @param {Function} [customizer] The function to customize cloning values.
 * @param {string} [key] The key of `value`.
 * @param {Object} [object] The object `value` belongs to.
 * @param {Array} [stackA=[]] Tracks traversed source objects.
 * @param {Array} [stackB=[]] Associates clones with source counterparts.
 * @returns {*} Returns the cloned value.
 */
function baseClone(value, isDeep, customizer, key, object, stackA, stackB) {
  var result;
  if (customizer) {
    result = object ? customizer(value, key, object) : customizer(value);
  }
  if (result !== undefined) {
    return result;
  }
  if (!isObject(value)) {
    return value;
  }
  var isArr = isArray(value);
  if (isArr) {
    result = initCloneArray(value);
    if (!isDeep) {
      return arrayCopy(value, result);
    }
  } else {
    var tag = objToString.call(value),
        isFunc = tag == funcTag;

    if (tag == objectTag || tag == argsTag || (isFunc && !object)) {
      result = initCloneObject(isFunc ? {} : value);
      if (!isDeep) {
        return baseAssign(result, value);
      }
    } else {
      return cloneableTags[tag]
        ? initCloneByTag(value, tag, isDeep)
        : (object ? value : {});
    }
  }
  // Check for circular references and return its corresponding clone.
  stackA || (stackA = []);
  stackB || (stackB = []);

  var length = stackA.length;
  while (length--) {
    if (stackA[length] == value) {
      return stackB[length];
    }
  }
  // Add the source value to the stack of traversed objects and associate it with its clone.
  stackA.push(value);
  stackB.push(result);

  // Recursively populate clone (susceptible to call stack limits).
  (isArr ? arrayEach : baseForOwn)(value, function(subValue, key) {
    result[key] = baseClone(subValue, isDeep, customizer, key, value, stackA, stackB);
  });
  return result;
}

module.exports = baseClone;

},{"100":100,"101":101,"104":104,"110":110,"130":130,"131":131,"132":132,"150":150,"153":153}],106:[function(require,module,exports){
/**
 * Copies properties of `source` to `object`.
 *
 * @private
 * @param {Object} source The object to copy properties from.
 * @param {Array} props The property names to copy.
 * @param {Object} [object={}] The object to copy properties to.
 * @returns {Object} Returns `object`.
 */
function baseCopy(source, props, object) {
  object || (object = {});

  var index = -1,
      length = props.length;

  while (++index < length) {
    var key = props[index];
    object[key] = source[key];
  }
  return object;
}

module.exports = baseCopy;

},{}],107:[function(require,module,exports){
var isObject = require(153);

/**
 * The base implementation of `_.create` without support for assigning
 * properties to the created object.
 *
 * @private
 * @param {Object} prototype The object to inherit from.
 * @returns {Object} Returns the new object.
 */
var baseCreate = (function() {
  function object() {}
  return function(prototype) {
    if (isObject(prototype)) {
      object.prototype = prototype;
      var result = new object;
      object.prototype = undefined;
    }
    return result || {};
  };
}());

module.exports = baseCreate;

},{"153":153}],108:[function(require,module,exports){
var arrayPush = require(102),
    isArguments = require(149),
    isArray = require(150),
    isArrayLike = require(133),
    isObjectLike = require(138);

/**
 * The base implementation of `_.flatten` with added support for restricting
 * flattening and specifying the start index.
 *
 * @private
 * @param {Array} array The array to flatten.
 * @param {boolean} [isDeep] Specify a deep flatten.
 * @param {boolean} [isStrict] Restrict flattening to arrays-like objects.
 * @param {Array} [result=[]] The initial result value.
 * @returns {Array} Returns the new flattened array.
 */
function baseFlatten(array, isDeep, isStrict, result) {
  result || (result = []);

  var index = -1,
      length = array.length;

  while (++index < length) {
    var value = array[index];
    if (isObjectLike(value) && isArrayLike(value) &&
        (isStrict || isArray(value) || isArguments(value))) {
      if (isDeep) {
        // Recursively flatten arrays (susceptible to call stack limits).
        baseFlatten(value, isDeep, isStrict, result);
      } else {
        arrayPush(result, value);
      }
    } else if (!isStrict) {
      result[result.length] = value;
    }
  }
  return result;
}

module.exports = baseFlatten;

},{"102":102,"133":133,"138":138,"149":149,"150":150}],109:[function(require,module,exports){
var createBaseFor = require(120);

/**
 * The base implementation of `baseForIn` and `baseForOwn` which iterates
 * over `object` properties returned by `keysFunc` invoking `iteratee` for
 * each property. Iteratee functions may exit iteration early by explicitly
 * returning `false`.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @param {Function} keysFunc The function to get the keys of `object`.
 * @returns {Object} Returns `object`.
 */
var baseFor = createBaseFor();

module.exports = baseFor;

},{"120":120}],110:[function(require,module,exports){
var baseFor = require(109),
    keys = require(158);

/**
 * The base implementation of `_.forOwn` without support for callback
 * shorthands and `this` binding.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Object} Returns `object`.
 */
function baseForOwn(object, iteratee) {
  return baseFor(object, iteratee, keys);
}

module.exports = baseForOwn;

},{"109":109,"158":158}],111:[function(require,module,exports){
var isFunction = require(151);

/**
 * The base implementation of `_.functions` which creates an array of
 * `object` function property names filtered from those provided.
 *
 * @private
 * @param {Object} object The object to inspect.
 * @param {Array} props The property names to filter.
 * @returns {Array} Returns the new array of filtered property names.
 */
function baseFunctions(object, props) {
  var index = -1,
      length = props.length,
      resIndex = -1,
      result = [];

  while (++index < length) {
    var key = props[index];
    if (isFunction(object[key])) {
      result[++resIndex] = key;
    }
  }
  return result;
}

module.exports = baseFunctions;

},{"151":151}],112:[function(require,module,exports){
/**
 * The function whose prototype all chaining wrappers inherit from.
 *
 * @private
 */
function baseLodash() {
  // No operation performed.
}

module.exports = baseLodash;

},{}],113:[function(require,module,exports){
/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

module.exports = baseProperty;

},{}],114:[function(require,module,exports){
var identity = require(160),
    metaMap = require(140);

/**
 * The base implementation of `setData` without support for hot loop detection.
 *
 * @private
 * @param {Function} func The function to associate metadata with.
 * @param {*} data The metadata.
 * @returns {Function} Returns `func`.
 */
var baseSetData = !metaMap ? identity : function(func, data) {
  metaMap.set(func, data);
  return func;
};

module.exports = baseSetData;

},{"140":140,"160":160}],115:[function(require,module,exports){
var identity = require(160);

/**
 * A specialized version of `baseCallback` which only supports `this` binding
 * and specifying the number of arguments to provide to `func`.
 *
 * @private
 * @param {Function} func The function to bind.
 * @param {*} thisArg The `this` binding of `func`.
 * @param {number} [argCount] The number of arguments to provide to `func`.
 * @returns {Function} Returns the callback.
 */
function bindCallback(func, thisArg, argCount) {
  if (typeof func != 'function') {
    return identity;
  }
  if (thisArg === undefined) {
    return func;
  }
  switch (argCount) {
    case 1: return function(value) {
      return func.call(thisArg, value);
    };
    case 3: return function(value, index, collection) {
      return func.call(thisArg, value, index, collection);
    };
    case 4: return function(accumulator, value, index, collection) {
      return func.call(thisArg, accumulator, value, index, collection);
    };
    case 5: return function(value, other, key, object, source) {
      return func.call(thisArg, value, other, key, object, source);
    };
  }
  return function() {
    return func.apply(thisArg, arguments);
  };
}

module.exports = bindCallback;

},{"160":160}],116:[function(require,module,exports){
(function (global){
/** Native method references. */
var ArrayBuffer = global.ArrayBuffer,
    Uint8Array = global.Uint8Array;

/**
 * Creates a clone of the given array buffer.
 *
 * @private
 * @param {ArrayBuffer} buffer The array buffer to clone.
 * @returns {ArrayBuffer} Returns the cloned array buffer.
 */
function bufferClone(buffer) {
  var result = new ArrayBuffer(buffer.byteLength),
      view = new Uint8Array(result);

  view.set(new Uint8Array(buffer));
  return result;
}

module.exports = bufferClone;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],117:[function(require,module,exports){
/* Native method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max;

/**
 * Creates an array that is the composition of partially applied arguments,
 * placeholders, and provided arguments into a single array of arguments.
 *
 * @private
 * @param {Array|Object} args The provided arguments.
 * @param {Array} partials The arguments to prepend to those provided.
 * @param {Array} holders The `partials` placeholder indexes.
 * @returns {Array} Returns the new array of composed arguments.
 */
function composeArgs(args, partials, holders) {
  var holdersLength = holders.length,
      argsIndex = -1,
      argsLength = nativeMax(args.length - holdersLength, 0),
      leftIndex = -1,
      leftLength = partials.length,
      result = Array(leftLength + argsLength);

  while (++leftIndex < leftLength) {
    result[leftIndex] = partials[leftIndex];
  }
  while (++argsIndex < holdersLength) {
    result[holders[argsIndex]] = args[argsIndex];
  }
  while (argsLength--) {
    result[leftIndex++] = args[argsIndex++];
  }
  return result;
}

module.exports = composeArgs;

},{}],118:[function(require,module,exports){
/* Native method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max;

/**
 * This function is like `composeArgs` except that the arguments composition
 * is tailored for `_.partialRight`.
 *
 * @private
 * @param {Array|Object} args The provided arguments.
 * @param {Array} partials The arguments to append to those provided.
 * @param {Array} holders The `partials` placeholder indexes.
 * @returns {Array} Returns the new array of composed arguments.
 */
function composeArgsRight(args, partials, holders) {
  var holdersIndex = -1,
      holdersLength = holders.length,
      argsIndex = -1,
      argsLength = nativeMax(args.length - holdersLength, 0),
      rightIndex = -1,
      rightLength = partials.length,
      result = Array(argsLength + rightLength);

  while (++argsIndex < argsLength) {
    result[argsIndex] = args[argsIndex];
  }
  var offset = argsIndex;
  while (++rightIndex < rightLength) {
    result[offset + rightIndex] = partials[rightIndex];
  }
  while (++holdersIndex < holdersLength) {
    result[offset + holders[holdersIndex]] = args[argsIndex++];
  }
  return result;
}

module.exports = composeArgsRight;

},{}],119:[function(require,module,exports){
var bindCallback = require(115),
    isIterateeCall = require(135),
    restParam = require(97);

/**
 * Creates a `_.assign`, `_.defaults`, or `_.merge` function.
 *
 * @private
 * @param {Function} assigner The function to assign values.
 * @returns {Function} Returns the new assigner function.
 */
function createAssigner(assigner) {
  return restParam(function(object, sources) {
    var index = -1,
        length = object == null ? 0 : sources.length,
        customizer = length > 2 ? sources[length - 2] : undefined,
        guard = length > 2 ? sources[2] : undefined,
        thisArg = length > 1 ? sources[length - 1] : undefined;

    if (typeof customizer == 'function') {
      customizer = bindCallback(customizer, thisArg, 5);
      length -= 2;
    } else {
      customizer = typeof thisArg == 'function' ? thisArg : undefined;
      length -= (customizer ? 1 : 0);
    }
    if (guard && isIterateeCall(sources[0], sources[1], guard)) {
      customizer = length < 3 ? undefined : customizer;
      length = 1;
    }
    while (++index < length) {
      var source = sources[index];
      if (source) {
        assigner(object, source, customizer);
      }
    }
    return object;
  });
}

module.exports = createAssigner;

},{"115":115,"135":135,"97":97}],120:[function(require,module,exports){
var toObject = require(146);

/**
 * Creates a base function for `_.forIn` or `_.forInRight`.
 *
 * @private
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {Function} Returns the new base function.
 */
function createBaseFor(fromRight) {
  return function(object, iteratee, keysFunc) {
    var iterable = toObject(object),
        props = keysFunc(object),
        length = props.length,
        index = fromRight ? length : -1;

    while ((fromRight ? index-- : ++index < length)) {
      var key = props[index];
      if (iteratee(iterable[key], key, iterable) === false) {
        break;
      }
    }
    return object;
  };
}

module.exports = createBaseFor;

},{"146":146}],121:[function(require,module,exports){
(function (global){
var createCtorWrapper = require(122);

/**
 * Creates a function that wraps `func` and invokes it with the `this`
 * binding of `thisArg`.
 *
 * @private
 * @param {Function} func The function to bind.
 * @param {*} [thisArg] The `this` binding of `func`.
 * @returns {Function} Returns the new bound function.
 */
function createBindWrapper(func, thisArg) {
  var Ctor = createCtorWrapper(func);

  function wrapper() {
    var fn = (this && this !== global && this instanceof wrapper) ? Ctor : func;
    return fn.apply(thisArg, arguments);
  }
  return wrapper;
}

module.exports = createBindWrapper;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"122":122}],122:[function(require,module,exports){
var baseCreate = require(107),
    isObject = require(153);

/**
 * Creates a function that produces an instance of `Ctor` regardless of
 * whether it was invoked as part of a `new` expression or by `call` or `apply`.
 *
 * @private
 * @param {Function} Ctor The constructor to wrap.
 * @returns {Function} Returns the new wrapped function.
 */
function createCtorWrapper(Ctor) {
  return function() {
    // Use a `switch` statement to work with class constructors.
    // See http://ecma-international.org/ecma-262/6.0/#sec-ecmascript-function-objects-call-thisargument-argumentslist
    // for more details.
    var args = arguments;
    switch (args.length) {
      case 0: return new Ctor;
      case 1: return new Ctor(args[0]);
      case 2: return new Ctor(args[0], args[1]);
      case 3: return new Ctor(args[0], args[1], args[2]);
      case 4: return new Ctor(args[0], args[1], args[2], args[3]);
      case 5: return new Ctor(args[0], args[1], args[2], args[3], args[4]);
      case 6: return new Ctor(args[0], args[1], args[2], args[3], args[4], args[5]);
      case 7: return new Ctor(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
    }
    var thisBinding = baseCreate(Ctor.prototype),
        result = Ctor.apply(thisBinding, args);

    // Mimic the constructor's `return` behavior.
    // See https://es5.github.io/#x13.2.2 for more details.
    return isObject(result) ? result : thisBinding;
  };
}

module.exports = createCtorWrapper;

},{"107":107,"153":153}],123:[function(require,module,exports){
(function (global){
var arrayCopy = require(100),
    composeArgs = require(117),
    composeArgsRight = require(118),
    createCtorWrapper = require(122),
    isLaziable = require(136),
    reorder = require(142),
    replaceHolders = require(143),
    setData = require(144);

/** Used to compose bitmasks for wrapper metadata. */
var BIND_FLAG = 1,
    BIND_KEY_FLAG = 2,
    CURRY_BOUND_FLAG = 4,
    CURRY_FLAG = 8,
    CURRY_RIGHT_FLAG = 16,
    PARTIAL_FLAG = 32,
    PARTIAL_RIGHT_FLAG = 64,
    ARY_FLAG = 128;

/* Native method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max;

/**
 * Creates a function that wraps `func` and invokes it with optional `this`
 * binding of, partial application, and currying.
 *
 * @private
 * @param {Function|string} func The function or method name to reference.
 * @param {number} bitmask The bitmask of flags. See `createWrapper` for more details.
 * @param {*} [thisArg] The `this` binding of `func`.
 * @param {Array} [partials] The arguments to prepend to those provided to the new function.
 * @param {Array} [holders] The `partials` placeholder indexes.
 * @param {Array} [partialsRight] The arguments to append to those provided to the new function.
 * @param {Array} [holdersRight] The `partialsRight` placeholder indexes.
 * @param {Array} [argPos] The argument positions of the new function.
 * @param {number} [ary] The arity cap of `func`.
 * @param {number} [arity] The arity of `func`.
 * @returns {Function} Returns the new wrapped function.
 */
function createHybridWrapper(func, bitmask, thisArg, partials, holders, partialsRight, holdersRight, argPos, ary, arity) {
  var isAry = bitmask & ARY_FLAG,
      isBind = bitmask & BIND_FLAG,
      isBindKey = bitmask & BIND_KEY_FLAG,
      isCurry = bitmask & CURRY_FLAG,
      isCurryBound = bitmask & CURRY_BOUND_FLAG,
      isCurryRight = bitmask & CURRY_RIGHT_FLAG,
      Ctor = isBindKey ? undefined : createCtorWrapper(func);

  function wrapper() {
    // Avoid `arguments` object use disqualifying optimizations by
    // converting it to an array before providing it to other functions.
    var length = arguments.length,
        index = length,
        args = Array(length);

    while (index--) {
      args[index] = arguments[index];
    }
    if (partials) {
      args = composeArgs(args, partials, holders);
    }
    if (partialsRight) {
      args = composeArgsRight(args, partialsRight, holdersRight);
    }
    if (isCurry || isCurryRight) {
      var placeholder = wrapper.placeholder,
          argsHolders = replaceHolders(args, placeholder);

      length -= argsHolders.length;
      if (length < arity) {
        var newArgPos = argPos ? arrayCopy(argPos) : undefined,
            newArity = nativeMax(arity - length, 0),
            newsHolders = isCurry ? argsHolders : undefined,
            newHoldersRight = isCurry ? undefined : argsHolders,
            newPartials = isCurry ? args : undefined,
            newPartialsRight = isCurry ? undefined : args;

        bitmask |= (isCurry ? PARTIAL_FLAG : PARTIAL_RIGHT_FLAG);
        bitmask &= ~(isCurry ? PARTIAL_RIGHT_FLAG : PARTIAL_FLAG);

        if (!isCurryBound) {
          bitmask &= ~(BIND_FLAG | BIND_KEY_FLAG);
        }
        var newData = [func, bitmask, thisArg, newPartials, newsHolders, newPartialsRight, newHoldersRight, newArgPos, ary, newArity],
            result = createHybridWrapper.apply(undefined, newData);

        if (isLaziable(func)) {
          setData(result, newData);
        }
        result.placeholder = placeholder;
        return result;
      }
    }
    var thisBinding = isBind ? thisArg : this,
        fn = isBindKey ? thisBinding[func] : func;

    if (argPos) {
      args = reorder(args, argPos);
    }
    if (isAry && ary < args.length) {
      args.length = ary;
    }
    if (this && this !== global && this instanceof wrapper) {
      fn = Ctor || createCtorWrapper(func);
    }
    return fn.apply(thisBinding, args);
  }
  return wrapper;
}

module.exports = createHybridWrapper;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"100":100,"117":117,"118":118,"122":122,"136":136,"142":142,"143":143,"144":144}],124:[function(require,module,exports){
(function (global){
var createCtorWrapper = require(122);

/** Used to compose bitmasks for wrapper metadata. */
var BIND_FLAG = 1;

/**
 * Creates a function that wraps `func` and invokes it with the optional `this`
 * binding of `thisArg` and the `partials` prepended to those provided to
 * the wrapper.
 *
 * @private
 * @param {Function} func The function to partially apply arguments to.
 * @param {number} bitmask The bitmask of flags. See `createWrapper` for more details.
 * @param {*} thisArg The `this` binding of `func`.
 * @param {Array} partials The arguments to prepend to those provided to the new function.
 * @returns {Function} Returns the new bound function.
 */
function createPartialWrapper(func, bitmask, thisArg, partials) {
  var isBind = bitmask & BIND_FLAG,
      Ctor = createCtorWrapper(func);

  function wrapper() {
    // Avoid `arguments` object use disqualifying optimizations by
    // converting it to an array before providing it `func`.
    var argsIndex = -1,
        argsLength = arguments.length,
        leftIndex = -1,
        leftLength = partials.length,
        args = Array(leftLength + argsLength);

    while (++leftIndex < leftLength) {
      args[leftIndex] = partials[leftIndex];
    }
    while (argsLength--) {
      args[leftIndex++] = arguments[++argsIndex];
    }
    var fn = (this && this !== global && this instanceof wrapper) ? Ctor : func;
    return fn.apply(isBind ? thisArg : this, args);
  }
  return wrapper;
}

module.exports = createPartialWrapper;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"122":122}],125:[function(require,module,exports){
var baseSetData = require(114),
    createBindWrapper = require(121),
    createHybridWrapper = require(123),
    createPartialWrapper = require(124),
    getData = require(126),
    mergeData = require(139),
    setData = require(144);

/** Used to compose bitmasks for wrapper metadata. */
var BIND_FLAG = 1,
    BIND_KEY_FLAG = 2,
    PARTIAL_FLAG = 32,
    PARTIAL_RIGHT_FLAG = 64;

/** Used as the `TypeError` message for "Functions" methods. */
var FUNC_ERROR_TEXT = 'Expected a function';

/* Native method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max;

/**
 * Creates a function that either curries or invokes `func` with optional
 * `this` binding and partially applied arguments.
 *
 * @private
 * @param {Function|string} func The function or method name to reference.
 * @param {number} bitmask The bitmask of flags.
 *  The bitmask may be composed of the following flags:
 *     1 - `_.bind`
 *     2 - `_.bindKey`
 *     4 - `_.curry` or `_.curryRight` of a bound function
 *     8 - `_.curry`
 *    16 - `_.curryRight`
 *    32 - `_.partial`
 *    64 - `_.partialRight`
 *   128 - `_.rearg`
 *   256 - `_.ary`
 * @param {*} [thisArg] The `this` binding of `func`.
 * @param {Array} [partials] The arguments to be partially applied.
 * @param {Array} [holders] The `partials` placeholder indexes.
 * @param {Array} [argPos] The argument positions of the new function.
 * @param {number} [ary] The arity cap of `func`.
 * @param {number} [arity] The arity of `func`.
 * @returns {Function} Returns the new wrapped function.
 */
function createWrapper(func, bitmask, thisArg, partials, holders, argPos, ary, arity) {
  var isBindKey = bitmask & BIND_KEY_FLAG;
  if (!isBindKey && typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  var length = partials ? partials.length : 0;
  if (!length) {
    bitmask &= ~(PARTIAL_FLAG | PARTIAL_RIGHT_FLAG);
    partials = holders = undefined;
  }
  length -= (holders ? holders.length : 0);
  if (bitmask & PARTIAL_RIGHT_FLAG) {
    var partialsRight = partials,
        holdersRight = holders;

    partials = holders = undefined;
  }
  var data = isBindKey ? undefined : getData(func),
      newData = [func, bitmask, thisArg, partials, holders, partialsRight, holdersRight, argPos, ary, arity];

  if (data) {
    mergeData(newData, data);
    bitmask = newData[1];
    arity = newData[9];
  }
  newData[9] = arity == null
    ? (isBindKey ? 0 : func.length)
    : (nativeMax(arity - length, 0) || 0);

  if (bitmask == BIND_FLAG) {
    var result = createBindWrapper(newData[0], newData[2]);
  } else if ((bitmask == PARTIAL_FLAG || bitmask == (BIND_FLAG | PARTIAL_FLAG)) && !newData[4].length) {
    result = createPartialWrapper.apply(undefined, newData);
  } else {
    result = createHybridWrapper.apply(undefined, newData);
  }
  var setter = data ? baseSetData : setData;
  return setter(result, newData);
}

module.exports = createWrapper;

},{"114":114,"121":121,"123":123,"124":124,"126":126,"139":139,"144":144}],126:[function(require,module,exports){
var metaMap = require(140),
    noop = require(161);

/**
 * Gets metadata for `func`.
 *
 * @private
 * @param {Function} func The function to query.
 * @returns {*} Returns the metadata for `func`.
 */
var getData = !metaMap ? noop : function(func) {
  return metaMap.get(func);
};

module.exports = getData;

},{"140":140,"161":161}],127:[function(require,module,exports){
var realNames = require(141);

/**
 * Gets the name of `func`.
 *
 * @private
 * @param {Function} func The function to query.
 * @returns {string} Returns the function name.
 */
function getFuncName(func) {
  var result = (func.name + ''),
      array = realNames[result],
      length = array ? array.length : 0;

  while (length--) {
    var data = array[length],
        otherFunc = data.func;
    if (otherFunc == null || otherFunc == func) {
      return data.name;
    }
  }
  return result;
}

module.exports = getFuncName;

},{"141":141}],128:[function(require,module,exports){
var baseProperty = require(113);

/**
 * Gets the "length" property value of `object`.
 *
 * **Note:** This function is used to avoid a [JIT bug](https://bugs.webkit.org/show_bug.cgi?id=142792)
 * that affects Safari on at least iOS 8.1-8.3 ARM64.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {*} Returns the "length" value.
 */
var getLength = baseProperty('length');

module.exports = getLength;

},{"113":113}],129:[function(require,module,exports){
var isNative = require(152);

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = object == null ? undefined : object[key];
  return isNative(value) ? value : undefined;
}

module.exports = getNative;

},{"152":152}],130:[function(require,module,exports){
/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Initializes an array clone.
 *
 * @private
 * @param {Array} array The array to clone.
 * @returns {Array} Returns the initialized clone.
 */
function initCloneArray(array) {
  var length = array.length,
      result = new array.constructor(length);

  // Add array properties assigned by `RegExp#exec`.
  if (length && typeof array[0] == 'string' && hasOwnProperty.call(array, 'index')) {
    result.index = array.index;
    result.input = array.input;
  }
  return result;
}

module.exports = initCloneArray;

},{}],131:[function(require,module,exports){
var bufferClone = require(116);

/** `Object#toString` result references. */
var boolTag = '[object Boolean]',
    dateTag = '[object Date]',
    numberTag = '[object Number]',
    regexpTag = '[object RegExp]',
    stringTag = '[object String]';

var arrayBufferTag = '[object ArrayBuffer]',
    float32Tag = '[object Float32Array]',
    float64Tag = '[object Float64Array]',
    int8Tag = '[object Int8Array]',
    int16Tag = '[object Int16Array]',
    int32Tag = '[object Int32Array]',
    uint8Tag = '[object Uint8Array]',
    uint8ClampedTag = '[object Uint8ClampedArray]',
    uint16Tag = '[object Uint16Array]',
    uint32Tag = '[object Uint32Array]';

/** Used to match `RegExp` flags from their coerced string values. */
var reFlags = /\w*$/;

/**
 * Initializes an object clone based on its `toStringTag`.
 *
 * **Note:** This function only supports cloning values with tags of
 * `Boolean`, `Date`, `Error`, `Number`, `RegExp`, or `String`.
 *
 * @private
 * @param {Object} object The object to clone.
 * @param {string} tag The `toStringTag` of the object to clone.
 * @param {boolean} [isDeep] Specify a deep clone.
 * @returns {Object} Returns the initialized clone.
 */
function initCloneByTag(object, tag, isDeep) {
  var Ctor = object.constructor;
  switch (tag) {
    case arrayBufferTag:
      return bufferClone(object);

    case boolTag:
    case dateTag:
      return new Ctor(+object);

    case float32Tag: case float64Tag:
    case int8Tag: case int16Tag: case int32Tag:
    case uint8Tag: case uint8ClampedTag: case uint16Tag: case uint32Tag:
      var buffer = object.buffer;
      return new Ctor(isDeep ? bufferClone(buffer) : buffer, object.byteOffset, object.length);

    case numberTag:
    case stringTag:
      return new Ctor(object);

    case regexpTag:
      var result = new Ctor(object.source, reFlags.exec(object));
      result.lastIndex = object.lastIndex;
  }
  return result;
}

module.exports = initCloneByTag;

},{"116":116}],132:[function(require,module,exports){
/**
 * Initializes an object clone.
 *
 * @private
 * @param {Object} object The object to clone.
 * @returns {Object} Returns the initialized clone.
 */
function initCloneObject(object) {
  var Ctor = object.constructor;
  if (!(typeof Ctor == 'function' && Ctor instanceof Ctor)) {
    Ctor = Object;
  }
  return new Ctor;
}

module.exports = initCloneObject;

},{}],133:[function(require,module,exports){
var getLength = require(128),
    isLength = require(137);

/**
 * Checks if `value` is array-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 */
function isArrayLike(value) {
  return value != null && isLength(getLength(value));
}

module.exports = isArrayLike;

},{"128":128,"137":137}],134:[function(require,module,exports){
/** Used to detect unsigned integer values. */
var reIsUint = /^\d+$/;

/**
 * Used as the [maximum length](http://ecma-international.org/ecma-262/6.0/#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  value = (typeof value == 'number' || reIsUint.test(value)) ? +value : -1;
  length = length == null ? MAX_SAFE_INTEGER : length;
  return value > -1 && value % 1 == 0 && value < length;
}

module.exports = isIndex;

},{}],135:[function(require,module,exports){
var isArrayLike = require(133),
    isIndex = require(134),
    isObject = require(153);

/**
 * Checks if the provided arguments are from an iteratee call.
 *
 * @private
 * @param {*} value The potential iteratee value argument.
 * @param {*} index The potential iteratee index or key argument.
 * @param {*} object The potential iteratee object argument.
 * @returns {boolean} Returns `true` if the arguments are from an iteratee call, else `false`.
 */
function isIterateeCall(value, index, object) {
  if (!isObject(object)) {
    return false;
  }
  var type = typeof index;
  if (type == 'number'
      ? (isArrayLike(object) && isIndex(index, object.length))
      : (type == 'string' && index in object)) {
    var other = object[index];
    return value === value ? (value === other) : (other !== other);
  }
  return false;
}

module.exports = isIterateeCall;

},{"133":133,"134":134,"153":153}],136:[function(require,module,exports){
var LazyWrapper = require(98),
    getData = require(126),
    getFuncName = require(127),
    lodash = require(93);

/**
 * Checks if `func` has a lazy counterpart.
 *
 * @private
 * @param {Function} func The function to check.
 * @returns {boolean} Returns `true` if `func` has a lazy counterpart, else `false`.
 */
function isLaziable(func) {
  var funcName = getFuncName(func),
      other = lodash[funcName];

  if (typeof other != 'function' || !(funcName in LazyWrapper.prototype)) {
    return false;
  }
  if (func === other) {
    return true;
  }
  var data = getData(other);
  return !!data && func === data[0];
}

module.exports = isLaziable;

},{"126":126,"127":127,"93":93,"98":98}],137:[function(require,module,exports){
/**
 * Used as the [maximum length](http://ecma-international.org/ecma-262/6.0/#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](http://ecma-international.org/ecma-262/6.0/#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

module.exports = isLength;

},{}],138:[function(require,module,exports){
/**
 * Checks if `value` is object-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

module.exports = isObjectLike;

},{}],139:[function(require,module,exports){
var arrayCopy = require(100),
    composeArgs = require(117),
    composeArgsRight = require(118),
    replaceHolders = require(143);

/** Used to compose bitmasks for wrapper metadata. */
var BIND_FLAG = 1,
    CURRY_BOUND_FLAG = 4,
    CURRY_FLAG = 8,
    ARY_FLAG = 128,
    REARG_FLAG = 256;

/** Used as the internal argument placeholder. */
var PLACEHOLDER = '__lodash_placeholder__';

/* Native method references for those with the same name as other `lodash` methods. */
var nativeMin = Math.min;

/**
 * Merges the function metadata of `source` into `data`.
 *
 * Merging metadata reduces the number of wrappers required to invoke a function.
 * This is possible because methods like `_.bind`, `_.curry`, and `_.partial`
 * may be applied regardless of execution order. Methods like `_.ary` and `_.rearg`
 * augment function arguments, making the order in which they are executed important,
 * preventing the merging of metadata. However, we make an exception for a safe
 * common case where curried functions have `_.ary` and or `_.rearg` applied.
 *
 * @private
 * @param {Array} data The destination metadata.
 * @param {Array} source The source metadata.
 * @returns {Array} Returns `data`.
 */
function mergeData(data, source) {
  var bitmask = data[1],
      srcBitmask = source[1],
      newBitmask = bitmask | srcBitmask,
      isCommon = newBitmask < ARY_FLAG;

  var isCombo =
    (srcBitmask == ARY_FLAG && bitmask == CURRY_FLAG) ||
    (srcBitmask == ARY_FLAG && bitmask == REARG_FLAG && data[7].length <= source[8]) ||
    (srcBitmask == (ARY_FLAG | REARG_FLAG) && bitmask == CURRY_FLAG);

  // Exit early if metadata can't be merged.
  if (!(isCommon || isCombo)) {
    return data;
  }
  // Use source `thisArg` if available.
  if (srcBitmask & BIND_FLAG) {
    data[2] = source[2];
    // Set when currying a bound function.
    newBitmask |= (bitmask & BIND_FLAG) ? 0 : CURRY_BOUND_FLAG;
  }
  // Compose partial arguments.
  var value = source[3];
  if (value) {
    var partials = data[3];
    data[3] = partials ? composeArgs(partials, value, source[4]) : arrayCopy(value);
    data[4] = partials ? replaceHolders(data[3], PLACEHOLDER) : arrayCopy(source[4]);
  }
  // Compose partial right arguments.
  value = source[5];
  if (value) {
    partials = data[5];
    data[5] = partials ? composeArgsRight(partials, value, source[6]) : arrayCopy(value);
    data[6] = partials ? replaceHolders(data[5], PLACEHOLDER) : arrayCopy(source[6]);
  }
  // Use source `argPos` if available.
  value = source[7];
  if (value) {
    data[7] = arrayCopy(value);
  }
  // Use source `ary` if it's smaller.
  if (srcBitmask & ARY_FLAG) {
    data[8] = data[8] == null ? source[8] : nativeMin(data[8], source[8]);
  }
  // Use source `arity` if one is not provided.
  if (data[9] == null) {
    data[9] = source[9];
  }
  // Use source `func` and merge bitmasks.
  data[0] = source[0];
  data[1] = newBitmask;

  return data;
}

module.exports = mergeData;

},{"100":100,"117":117,"118":118,"143":143}],140:[function(require,module,exports){
(function (global){
var getNative = require(129);

/** Native method references. */
var WeakMap = getNative(global, 'WeakMap');

/** Used to store function metadata. */
var metaMap = WeakMap && new WeakMap;

module.exports = metaMap;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"129":129}],141:[function(require,module,exports){
/** Used to lookup unminified function names. */
var realNames = {};

module.exports = realNames;

},{}],142:[function(require,module,exports){
var arrayCopy = require(100),
    isIndex = require(134);

/* Native method references for those with the same name as other `lodash` methods. */
var nativeMin = Math.min;

/**
 * Reorder `array` according to the specified indexes where the element at
 * the first index is assigned as the first element, the element at
 * the second index is assigned as the second element, and so on.
 *
 * @private
 * @param {Array} array The array to reorder.
 * @param {Array} indexes The arranged array indexes.
 * @returns {Array} Returns `array`.
 */
function reorder(array, indexes) {
  var arrLength = array.length,
      length = nativeMin(indexes.length, arrLength),
      oldArray = arrayCopy(array);

  while (length--) {
    var index = indexes[length];
    array[length] = isIndex(index, arrLength) ? oldArray[index] : undefined;
  }
  return array;
}

module.exports = reorder;

},{"100":100,"134":134}],143:[function(require,module,exports){
/** Used as the internal argument placeholder. */
var PLACEHOLDER = '__lodash_placeholder__';

/**
 * Replaces all `placeholder` elements in `array` with an internal placeholder
 * and returns an array of their indexes.
 *
 * @private
 * @param {Array} array The array to modify.
 * @param {*} placeholder The placeholder to replace.
 * @returns {Array} Returns the new array of placeholder indexes.
 */
function replaceHolders(array, placeholder) {
  var index = -1,
      length = array.length,
      resIndex = -1,
      result = [];

  while (++index < length) {
    if (array[index] === placeholder) {
      array[index] = PLACEHOLDER;
      result[++resIndex] = index;
    }
  }
  return result;
}

module.exports = replaceHolders;

},{}],144:[function(require,module,exports){
var baseSetData = require(114),
    now = require(94);

/** Used to detect when a function becomes hot. */
var HOT_COUNT = 150,
    HOT_SPAN = 16;

/**
 * Sets metadata for `func`.
 *
 * **Note:** If this function becomes hot, i.e. is invoked a lot in a short
 * period of time, it will trip its breaker and transition to an identity function
 * to avoid garbage collection pauses in V8. See [V8 issue 2070](https://code.google.com/p/v8/issues/detail?id=2070)
 * for more details.
 *
 * @private
 * @param {Function} func The function to associate metadata with.
 * @param {*} data The metadata.
 * @returns {Function} Returns `func`.
 */
var setData = (function() {
  var count = 0,
      lastCalled = 0;

  return function(key, value) {
    var stamp = now(),
        remaining = HOT_SPAN - (stamp - lastCalled);

    lastCalled = stamp;
    if (remaining > 0) {
      if (++count >= HOT_COUNT) {
        return key;
      }
    } else {
      count = 0;
    }
    return baseSetData(key, value);
  };
}());

module.exports = setData;

},{"114":114,"94":94}],145:[function(require,module,exports){
var isArguments = require(149),
    isArray = require(150),
    isIndex = require(134),
    isLength = require(137),
    keysIn = require(159);

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * A fallback implementation of `Object.keys` which creates an array of the
 * own enumerable property names of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
function shimKeys(object) {
  var props = keysIn(object),
      propsLength = props.length,
      length = propsLength && object.length;

  var allowIndexes = !!length && isLength(length) &&
    (isArray(object) || isArguments(object));

  var index = -1,
      result = [];

  while (++index < propsLength) {
    var key = props[index];
    if ((allowIndexes && isIndex(key, length)) || hasOwnProperty.call(object, key)) {
      result.push(key);
    }
  }
  return result;
}

module.exports = shimKeys;

},{"134":134,"137":137,"149":149,"150":150,"159":159}],146:[function(require,module,exports){
var isObject = require(153);

/**
 * Converts `value` to an object if it's not one.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {Object} Returns the object.
 */
function toObject(value) {
  return isObject(value) ? value : Object(value);
}

module.exports = toObject;

},{"153":153}],147:[function(require,module,exports){
var LazyWrapper = require(98),
    LodashWrapper = require(99),
    arrayCopy = require(100);

/**
 * Creates a clone of `wrapper`.
 *
 * @private
 * @param {Object} wrapper The wrapper to clone.
 * @returns {Object} Returns the cloned wrapper.
 */
function wrapperClone(wrapper) {
  return wrapper instanceof LazyWrapper
    ? wrapper.clone()
    : new LodashWrapper(wrapper.__wrapped__, wrapper.__chain__, arrayCopy(wrapper.__actions__));
}

module.exports = wrapperClone;

},{"100":100,"98":98,"99":99}],148:[function(require,module,exports){
var baseClone = require(105),
    bindCallback = require(115);

/**
 * Creates a deep clone of `value`. If `customizer` is provided it's invoked
 * to produce the cloned values. If `customizer` returns `undefined` cloning
 * is handled by the method instead. The `customizer` is bound to `thisArg`
 * and invoked with up to three argument; (value [, index|key, object]).
 *
 * **Note:** This method is loosely based on the
 * [structured clone algorithm](http://www.w3.org/TR/html5/infrastructure.html#internal-structured-cloning-algorithm).
 * The enumerable properties of `arguments` objects and objects created by
 * constructors other than `Object` are cloned to plain `Object` objects. An
 * empty object is returned for uncloneable values such as functions, DOM nodes,
 * Maps, Sets, and WeakMaps.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to deep clone.
 * @param {Function} [customizer] The function to customize cloning values.
 * @param {*} [thisArg] The `this` binding of `customizer`.
 * @returns {*} Returns the deep cloned value.
 * @example
 *
 * var users = [
 *   { 'user': 'barney' },
 *   { 'user': 'fred' }
 * ];
 *
 * var deep = _.cloneDeep(users);
 * deep[0] === users[0];
 * // => false
 *
 * // using a customizer callback
 * var el = _.cloneDeep(document.body, function(value) {
 *   if (_.isElement(value)) {
 *     return value.cloneNode(true);
 *   }
 * });
 *
 * el === document.body
 * // => false
 * el.nodeName
 * // => BODY
 * el.childNodes.length;
 * // => 20
 */
function cloneDeep(value, customizer, thisArg) {
  return typeof customizer == 'function'
    ? baseClone(value, true, bindCallback(customizer, thisArg, 3))
    : baseClone(value, true);
}

module.exports = cloneDeep;

},{"105":105,"115":115}],149:[function(require,module,exports){
var isArrayLike = require(133),
    isObjectLike = require(138);

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/** Native method references. */
var propertyIsEnumerable = objectProto.propertyIsEnumerable;

/**
 * Checks if `value` is classified as an `arguments` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isArguments(function() { return arguments; }());
 * // => true
 *
 * _.isArguments([1, 2, 3]);
 * // => false
 */
function isArguments(value) {
  return isObjectLike(value) && isArrayLike(value) &&
    hasOwnProperty.call(value, 'callee') && !propertyIsEnumerable.call(value, 'callee');
}

module.exports = isArguments;

},{"133":133,"138":138}],150:[function(require,module,exports){
var getNative = require(129),
    isLength = require(137),
    isObjectLike = require(138);

/** `Object#toString` result references. */
var arrayTag = '[object Array]';

/** Used for native method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/* Native method references for those with the same name as other `lodash` methods. */
var nativeIsArray = getNative(Array, 'isArray');

/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(function() { return arguments; }());
 * // => false
 */
var isArray = nativeIsArray || function(value) {
  return isObjectLike(value) && isLength(value.length) && objToString.call(value) == arrayTag;
};

module.exports = isArray;

},{"129":129,"137":137,"138":138}],151:[function(require,module,exports){
var isObject = require(153);

/** `Object#toString` result references. */
var funcTag = '[object Function]';

/** Used for native method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in older versions of Chrome and Safari which return 'function' for regexes
  // and Safari 8 which returns 'object' for typed array constructors.
  return isObject(value) && objToString.call(value) == funcTag;
}

module.exports = isFunction;

},{"153":153}],152:[function(require,module,exports){
var isFunction = require(151),
    isObjectLike = require(138);

/** Used to detect host constructors (Safari > 5). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var fnToString = Function.prototype.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  fnToString.call(hasOwnProperty).replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/**
 * Checks if `value` is a native function.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function, else `false`.
 * @example
 *
 * _.isNative(Array.prototype.push);
 * // => true
 *
 * _.isNative(_);
 * // => false
 */
function isNative(value) {
  if (value == null) {
    return false;
  }
  if (isFunction(value)) {
    return reIsNative.test(fnToString.call(value));
  }
  return isObjectLike(value) && reIsHostCtor.test(value);
}

module.exports = isNative;

},{"138":138,"151":151}],153:[function(require,module,exports){
/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

module.exports = isObject;

},{}],154:[function(require,module,exports){
var isObjectLike = require(138);

/** `Object#toString` result references. */
var stringTag = '[object String]';

/** Used for native method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/**
 * Checks if `value` is classified as a `String` primitive or object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isString('abc');
 * // => true
 *
 * _.isString(1);
 * // => false
 */
function isString(value) {
  return typeof value == 'string' || (isObjectLike(value) && objToString.call(value) == stringTag);
}

module.exports = isString;

},{"138":138}],155:[function(require,module,exports){
var assignWith = require(103),
    baseAssign = require(104),
    createAssigner = require(119);

/**
 * Assigns own enumerable properties of source object(s) to the destination
 * object. Subsequent sources overwrite property assignments of previous sources.
 * If `customizer` is provided it's invoked to produce the assigned values.
 * The `customizer` is bound to `thisArg` and invoked with five arguments:
 * (objectValue, sourceValue, key, object, source).
 *
 * **Note:** This method mutates `object` and is based on
 * [`Object.assign`](http://ecma-international.org/ecma-262/6.0/#sec-object.assign).
 *
 * @static
 * @memberOf _
 * @alias extend
 * @category Object
 * @param {Object} object The destination object.
 * @param {...Object} [sources] The source objects.
 * @param {Function} [customizer] The function to customize assigned values.
 * @param {*} [thisArg] The `this` binding of `customizer`.
 * @returns {Object} Returns `object`.
 * @example
 *
 * _.assign({ 'user': 'barney' }, { 'age': 40 }, { 'user': 'fred' });
 * // => { 'user': 'fred', 'age': 40 }
 *
 * // using a customizer callback
 * var defaults = _.partialRight(_.assign, function(value, other) {
 *   return _.isUndefined(value) ? other : value;
 * });
 *
 * defaults({ 'user': 'barney' }, { 'age': 36 }, { 'user': 'fred' });
 * // => { 'user': 'barney', 'age': 36 }
 */
var assign = createAssigner(function(object, source, customizer) {
  return customizer
    ? assignWith(object, source, customizer)
    : baseAssign(object, source);
});

module.exports = assign;

},{"103":103,"104":104,"119":119}],156:[function(require,module,exports){
var baseAssign = require(104),
    baseCreate = require(107),
    isIterateeCall = require(135);

/**
 * Creates an object that inherits from the given `prototype` object. If a
 * `properties` object is provided its own enumerable properties are assigned
 * to the created object.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} prototype The object to inherit from.
 * @param {Object} [properties] The properties to assign to the object.
 * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
 * @returns {Object} Returns the new object.
 * @example
 *
 * function Shape() {
 *   this.x = 0;
 *   this.y = 0;
 * }
 *
 * function Circle() {
 *   Shape.call(this);
 * }
 *
 * Circle.prototype = _.create(Shape.prototype, {
 *   'constructor': Circle
 * });
 *
 * var circle = new Circle;
 * circle instanceof Circle;
 * // => true
 *
 * circle instanceof Shape;
 * // => true
 */
function create(prototype, properties, guard) {
  var result = baseCreate(prototype);
  if (guard && isIterateeCall(prototype, properties, guard)) {
    properties = undefined;
  }
  return properties ? baseAssign(result, properties) : result;
}

module.exports = create;

},{"104":104,"107":107,"135":135}],157:[function(require,module,exports){
var baseFunctions = require(111),
    keysIn = require(159);

/**
 * Creates an array of function property names from all enumerable properties,
 * own and inherited, of `object`.
 *
 * @static
 * @memberOf _
 * @alias methods
 * @category Object
 * @param {Object} object The object to inspect.
 * @returns {Array} Returns the new array of property names.
 * @example
 *
 * _.functions(_);
 * // => ['after', 'ary', 'assign', ...]
 */
function functions(object) {
  return baseFunctions(object, keysIn(object));
}

module.exports = functions;

},{"111":111,"159":159}],158:[function(require,module,exports){
var getNative = require(129),
    isArrayLike = require(133),
    isObject = require(153),
    shimKeys = require(145);

/* Native method references for those with the same name as other `lodash` methods. */
var nativeKeys = getNative(Object, 'keys');

/**
 * Creates an array of the own enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects. See the
 * [ES spec](http://ecma-international.org/ecma-262/6.0/#sec-object.keys)
 * for more details.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keys(new Foo);
 * // => ['a', 'b'] (iteration order is not guaranteed)
 *
 * _.keys('hi');
 * // => ['0', '1']
 */
var keys = !nativeKeys ? shimKeys : function(object) {
  var Ctor = object == null ? undefined : object.constructor;
  if ((typeof Ctor == 'function' && Ctor.prototype === object) ||
      (typeof object != 'function' && isArrayLike(object))) {
    return shimKeys(object);
  }
  return isObject(object) ? nativeKeys(object) : [];
};

module.exports = keys;

},{"129":129,"133":133,"145":145,"153":153}],159:[function(require,module,exports){
var isArguments = require(149),
    isArray = require(150),
    isIndex = require(134),
    isLength = require(137),
    isObject = require(153);

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Creates an array of the own and inherited enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keysIn(new Foo);
 * // => ['a', 'b', 'c'] (iteration order is not guaranteed)
 */
function keysIn(object) {
  if (object == null) {
    return [];
  }
  if (!isObject(object)) {
    object = Object(object);
  }
  var length = object.length;
  length = (length && isLength(length) &&
    (isArray(object) || isArguments(object)) && length) || 0;

  var Ctor = object.constructor,
      index = -1,
      isProto = typeof Ctor == 'function' && Ctor.prototype === object,
      result = Array(length),
      skipIndexes = length > 0;

  while (++index < length) {
    result[index] = (index + '');
  }
  for (var key in object) {
    if (!(skipIndexes && isIndex(key, length)) &&
        !(key == 'constructor' && (isProto || !hasOwnProperty.call(object, key)))) {
      result.push(key);
    }
  }
  return result;
}

module.exports = keysIn;

},{"134":134,"137":137,"149":149,"150":150,"153":153}],160:[function(require,module,exports){
/**
 * This method returns the first argument provided to it.
 *
 * @static
 * @memberOf _
 * @category Utility
 * @param {*} value Any value.
 * @returns {*} Returns `value`.
 * @example
 *
 * var object = { 'user': 'fred' };
 *
 * _.identity(object) === object;
 * // => true
 */
function identity(value) {
  return value;
}

module.exports = identity;

},{}],161:[function(require,module,exports){
/**
 * A no-operation function that returns `undefined` regardless of the
 * arguments it receives.
 *
 * @static
 * @memberOf _
 * @category Utility
 * @example
 *
 * var object = { 'user': 'fred' };
 *
 * _.noop(object) === undefined;
 * // => true
 */
function noop() {
  // No operation performed.
}

module.exports = noop;

},{}],162:[function(require,module,exports){
function nodeListToArray(nodeList) {
  try {
    return Array.prototype.slice.call(nodeList);
  } catch (err) {
    var result = [];
    for (var i = 0; i < nodeList.length; i++) {
      result.push(nodeList[i]);
    }
    return result;
  }
}

if (typeof module !== 'undefined') {
  module.exports = nodeListToArray;
}

},{}],163:[function(require,module,exports){
'use strict';

var bus = require(89);
var events = require(165);
var checkOrigin = require(164).checkOrigin;

function BraintreeBus(options) {
  options = options || {};

  this.channel = options.channel;
  if (!this.channel) {
    throw new Error('Channel ID must be specified');
  }

  this.merchantUrl = options.merchantUrl;

  this._isDestroyed = false;
  this._isVerbose = false;

  this._listeners = [];

  this._log('new bus on channel ' + this.channel, [location.href]);
}

BraintreeBus.prototype.on = function (eventName, originalHandler) {
  var namespacedEvent, args;
  var handler = originalHandler;
  var self = this;

  if (this._isDestroyed) { return; }

  if (this.merchantUrl) {
    handler = function () {
      /* eslint-disable no-invalid-this */
      if (checkOrigin(this.origin, self.merchantUrl)) {
        originalHandler.apply(this, arguments);
      }
      /* eslint-enable no-invalid-this */
    };
  }

  namespacedEvent = this._namespaceEvent(eventName);
  args = Array.prototype.slice.call(arguments);
  args[0] = namespacedEvent;
  args[1] = handler;

  this._log('on', args);
  bus.on.apply(bus, args);

  this._listeners.push({
    eventName: eventName,
    handler: handler,
    originalHandler: originalHandler
  });
};

BraintreeBus.prototype.emit = function (eventName) {
  var args;

  if (this._isDestroyed) { return; }

  args = Array.prototype.slice.call(arguments);
  args[0] = this._namespaceEvent(eventName);

  this._log('emit', args);
  bus.emit.apply(bus, args);
};

BraintreeBus.prototype._offDirect = function (eventName) {
  var args = Array.prototype.slice.call(arguments);

  if (this._isDestroyed) { return; }

  args[0] = this._namespaceEvent(eventName);

  this._log('off', args);
  bus.off.apply(bus, args);
};

BraintreeBus.prototype.off = function (eventName, originalHandler) {
  var i, listener;
  var handler = originalHandler;

  if (this._isDestroyed) { return; }

  if (this.merchantUrl) {
    for (i = 0; i < this._listeners.length; i++) {
      listener = this._listeners[i];

      if (listener.originalHandler === originalHandler) {
        handler = listener.handler;
      }
    }
  }

  this._offDirect(eventName, handler);
};

BraintreeBus.prototype._namespaceEvent = function (eventName) {
  return ['braintree', this.channel, eventName].join(':');
};

BraintreeBus.prototype.teardown = function () {
  var listener, i;

  for (i = 0; i < this._listeners.length; i++) {
    listener = this._listeners[i];
    this._offDirect(listener.eventName, listener.handler);
  }

  this._listeners.length = 0;

  this._isDestroyed = true;
};

BraintreeBus.prototype._log = function (functionName, args) {
  if (this._isVerbose) {
    console.log(functionName, args); // eslint-disable-line no-console
  }
};

BraintreeBus.events = events;

module.exports = BraintreeBus;

},{"164":164,"165":165,"89":89}],164:[function(require,module,exports){
'use strict';

var BT_ORIGIN_REGEX = /^https:\/\/([a-zA-Z0-9-]+\.)*(braintreepayments|braintreegateway|paypal)\.com(:\d{1,5})?$/;

function checkOrigin(postMessageOrigin, merchantUrl) {
  var merchantOrigin, merchantHost;
  var a = document.createElement('a');

  a.href = merchantUrl;

  if (a.protocol === 'https:') {
    merchantHost = a.host.replace(/:443$/, '');
  } else if (a.protocol === 'http:') {
    merchantHost = a.host.replace(/:80$/, '');
  } else {
    merchantHost = a.host;
  }

  merchantOrigin = a.protocol + '//' + merchantHost;

  return merchantOrigin === postMessageOrigin || BT_ORIGIN_REGEX.test(postMessageOrigin);
}

module.exports = {
  checkOrigin: checkOrigin
};

},{}],165:[function(require,module,exports){
'use strict';

var i, evnt;
var eventList = [
  'PAYMENT_METHOD_REQUEST',
  'PAYMENT_METHOD_RECEIVED',
  'PAYMENT_METHOD_GENERATED',
  'PAYMENT_METHOD_NOT_GENERATED',
  'PAYMENT_METHOD_CANCELLED',
  'PAYMENT_METHOD_ERROR',
  'CONFIGURATION_REQUEST',
  'ROOT_METADATA_REQUEST',
  'ERROR',
  'WARNING',
  'UI_POPUP_DID_OPEN',
  'UI_POPUP_DID_CLOSE',
  'UI_POPUP_FORCE_CLOSE',
  'ASYNC_DEPENDENCY_INITIALIZING',
  'ASYNC_DEPENDENCY_READY',
  'USER_FORM_SUBMIT_REQUEST',
  'SEND_ANALYTICS_EVENTS'
];
var eventEnum = {};

for (i = 0; i < eventList.length; i++) {
  evnt = eventList[i];
  eventEnum[evnt] = evnt;
}

module.exports = eventEnum;

},{}],166:[function(require,module,exports){
'use strict';
/* eslint-disable consistent-return */

function convertToLegacyShippingAddress(address) {
  var prop;
  var legacyShippingAddress = {};

  if (!address) {
    return;
  }

  for (prop in address) {
    if (address.hasOwnProperty(prop)) {
      legacyShippingAddress[toSnakeCase(prop)] = address[prop];
    }
  }

  return legacyShippingAddress;
}

function toSnakeCase(string) {
  return string.replace(/([A-Z])/g, function ($1) {
    return '_' + $1.toLowerCase();
  });
}

module.exports = {convertToLegacyShippingAddress: convertToLegacyShippingAddress};

},{}],167:[function(require,module,exports){
'use strict';

module.exports = {
  ROOT_SUCCESS_CALLBACK: 'onPaymentMethodReceived',
  ROOT_ERROR_CALLBACK: 'onError',
  ROOT_READY_CALLBACK: 'onReady',
  TEARDOWN_STATE: {
    IN_PROGRESS: 'inProgress',
    COMPLETE: 'complete'
  }
};

},{}],168:[function(require,module,exports){
(function (global){
'use strict';

var clone = require(148);
var api = require(14);
var Bus = require(163);
var Destructor = require(85);
var bind = require(95);
var constants = require(167);
var sanitizePayload = require(178);
var lookupCallbackFor = require(176);
var fallbackErrorHandler = require(174);
var nodeType = require(177);
var isJQueryElement = nodeType.isJQueryElement;
var isHTMLElement = nodeType.isHTMLElement;
var dataCollector = require(192);

function noop() {}

function _handleDependencyInitializing() {
  this._dependenciesRemaining++;
}

function _handleDependencyReady() {
  this._dependenciesRemaining--;

  if (this._dependenciesRemaining === 0) {
    delete this._dependenciesRemaining;

    this.bus.off(Bus.events.ASYNC_DEPENDENCY_INITIALIZING, this._handleDependencyInitializing);
    this.bus.off(Bus.events.ASYNC_DEPENDENCY_READY, this._handleDependencyReady);

    this._onIntegrationReady();
  }
}

function BaseIntegration(configuration) {
  this.configuration = configuration;

  this.isReady = false;

  this.destructor = new Destructor();

  this.bus = new Bus({
    channel: this.configuration.channel,
    merchantUrl: global.location.href
  });
  this.apiClient = new api.Client(this.configuration);
  this._configureCallbacks();
  this._configureAnalytics();
  this._attachEvents();
  this._emitInitializing();
}

BaseIntegration.prototype._emitInitializing = function () {
  this.bus.emit(Bus.events.ASYNC_DEPENDENCY_INITIALIZING);
};

BaseIntegration.prototype._configureCallbacks = function () {
  var getCallback = lookupCallbackFor(this.configuration.merchantConfiguration);

  function successHandler(fn) {
    return function (payload) {
      fn(sanitizePayload(payload));
    };
  }

  this.onSuccess = successHandler(getCallback(constants.ROOT_SUCCESS_CALLBACK));
  this.onError = getCallback(constants.ROOT_ERROR_CALLBACK, fallbackErrorHandler);
  this.onReady = getCallback(constants.ROOT_READY_CALLBACK);
};

BaseIntegration.prototype._configureAnalytics = function () {
  var prefix = 'web.' + this.configuration.integrationType + '.';
  var apiClient = this.apiClient;

  this.bus.on(Bus.events.SEND_ANALYTICS_EVENTS, function (events, callback) {
    var i;

    if (!(events instanceof Array)) {
      events = [events];
    }

    for (i = 0; i < events.length; i++) {
      events[i] = prefix + events[i];
    }

    apiClient.sendAnalyticsEvents(events, callback);
  });
};

BaseIntegration.prototype._attachEvents = function () {
  var replyConfiguration = clone(this.configuration, function (value) {
    if (isJQueryElement(value) || isHTMLElement(value)) { return {}; }
  });

  this.bus.on(Bus.events.ERROR, this.onError);
  this.bus.on(Bus.events.PAYMENT_METHOD_RECEIVED, this.onSuccess);

  this.bus.on(Bus.events.WARNING, function (warning) {
    try { console.warn(warning); } catch (e) { /* ignored */ } // eslint-disable-line no-console
  });

  this.bus.on(Bus.events.CONFIGURATION_REQUEST, function (reply) {
    reply(replyConfiguration);
  });

  this._dependenciesRemaining = 0;
  this._handleDependencyInitializing = bind(_handleDependencyInitializing, this);
  this._handleDependencyReady = bind(_handleDependencyReady, this);
  this.bus.on(Bus.events.ASYNC_DEPENDENCY_INITIALIZING, this._handleDependencyInitializing);
  this.bus.on(Bus.events.ASYNC_DEPENDENCY_READY, this._handleDependencyReady);
};

BaseIntegration.prototype._addDeviceData = function (instance) {
  var dataCollectorInstance;

  if (this.configuration.merchantConfiguration.dataCollector == null) { return; }

  try {
    dataCollectorInstance = dataCollector.setup(this.configuration.merchantConfiguration.dataCollector);
  } catch (e) {
    this.bus.emit(Bus.events.ERROR, {
      type: 'CONFIGURATION',
      message: e.message
    });
  }

  if (dataCollectorInstance == null) { return; }

  this.destructor.registerFunctionForTeardown(function () {
    dataCollectorInstance.teardown();
  });

  instance.deviceData = dataCollectorInstance.deviceData;
};

BaseIntegration.prototype.teardown = function (merchantCallback) {
  if (this.teardownState === constants.TEARDOWN_STATE.IN_PROGRESS) {
    throw new Error('Cannot call teardown while in progress');
  }

  if (this.teardownState === constants.TEARDOWN_STATE.COMPLETE) {
    throw new Error('Cannot teardown integration more than once');
  }

  this.teardownMerchantCallback = merchantCallback || noop;

  this.teardownState = constants.TEARDOWN_STATE.IN_PROGRESS;

  this.destructor.teardown(bind(this._handleTeardown, this));
};

BaseIntegration.prototype._handleTeardown = function () {
  this.bus.teardown();

  this.teardownState = constants.TEARDOWN_STATE.COMPLETE;

  this.teardownMerchantCallback();
};

BaseIntegration.prototype._wrapWithTeardownReply = function (funcName, func) {
  var self = this;

  return function () {
    if (self.teardownState === constants.TEARDOWN_STATE.IN_PROGRESS) {
      throw new Error('Cannot call ' + funcName + ' while teardown is in progress');
    }

    if (self.teardownState === constants.TEARDOWN_STATE.COMPLETE) {
      throw new Error('Cannot call ' + funcName + ' after teardown has completed');
    }

    func();
  };
};

BaseIntegration.prototype._onIntegrationReady = function (instance) {
  this.returnedInstance = instance || {};

  this.returnedInstance.teardown = bind(this.teardown, this);

  this._addDeviceData(instance);
  this.isReady = true;
  this.onReady(this.returnedInstance);
};

module.exports = BaseIntegration;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"14":14,"148":148,"163":163,"167":167,"174":174,"176":176,"177":177,"178":178,"192":192,"85":85,"95":95}],169:[function(require,module,exports){
'use strict';

var assign = require(155);
var create = require(156);
var bind = require(95);
var coinbase = require(180);
var Bus = require(163);
var BaseIntegration = require(168);

function CoinbaseIntegration() {
  var coinbaseIntegration;

  BaseIntegration.apply(this, arguments);

  this._attachBusEvents();

  coinbaseIntegration = coinbase.create(assign({}, this.configuration, {
    apiClient: this.apiClient
  }));

  if (coinbaseIntegration != null) {
    this.destructor.registerFunctionForTeardown(function (done) {
      coinbaseIntegration.teardown(done);
    });
  }

  this.bus.emit(Bus.events.ASYNC_DEPENDENCY_READY);
}

CoinbaseIntegration.prototype = create(BaseIntegration.prototype, {
  constructor: CoinbaseIntegration
});

CoinbaseIntegration.prototype._attachBusEvents = function () {
  this.bus.on(Bus.events.PAYMENT_METHOD_GENERATED, bind(this._onPaymentMethodGenerated, this));
};

CoinbaseIntegration.prototype._onPaymentMethodGenerated = function (payload) {
  this.bus.emit(Bus.events.PAYMENT_METHOD_RECEIVED, payload);
};

module.exports = CoinbaseIntegration;

},{"155":155,"156":156,"163":163,"168":168,"180":180,"95":95}],170:[function(require,module,exports){
'use strict';

var clone = require(148);
var create = require(156);
var form = require(201);
var paypal = require(213);
var coinbase = require(180);
var bind = require(95);
var isFunction = require(151);
var hostedFields = require(207);
var FormNapper = require(88);
var constants = require(167);
var Bus = require(163);
var convertToLegacyShippingAddress = require(166).convertToLegacyShippingAddress;
var BaseIntegration = require(168);
var nodeType = require(177);
var isJQueryElement = nodeType.isJQueryElement;
var isHTMLElement = nodeType.isHTMLElement;
var NonceManager = require(175);

function CustomIntegration() {
  BaseIntegration.apply(this, arguments);

  if (this.configuration.merchantConfiguration.hostedFields != null) {
    this._setupHostedFields();
  } else {
    this._setupForm();
  }

  this._setupPayPal();
  this._setupCoinbase();

  this.bus.emit(Bus.events.ASYNC_DEPENDENCY_READY);
}

CustomIntegration.prototype = create(BaseIntegration.prototype, {
  constructor: CustomIntegration
});

CustomIntegration.prototype._setupHostedFields = function () {
  var submitRequestHandler;
  var merchantConfiguration = this.configuration.merchantConfiguration;
  var rootSuccessCallback = merchantConfiguration[constants.ROOT_SUCCESS_CALLBACK];
  var formNapper = new FormNapper(merchantConfiguration.id);
  var hostedFieldsIntegration = hostedFields.create(this.configuration);
  var nonceManager = new NonceManager({
    formNapper: formNapper,
    rootCallback: rootSuccessCallback,
    channel: this.configuration.channel
  });

  if (formNapper.htmlForm == null) {
    this.bus.emit(Bus.events.ERROR, {
      type: 'CONFIGURATION',
      message: 'options.id does not reference a valid DOM element'
    });
    return;
  }

  submitRequestHandler = bind(nonceManager.handleSubmitRequest, nonceManager);

  formNapper.hijack(submitRequestHandler);
  this.bus.on(Bus.events.USER_FORM_SUBMIT_REQUEST, submitRequestHandler);

  this.destructor.registerFunctionForTeardown(bind(function (done) {
    nonceManager.teardown();
    formNapper.detach();
    hostedFieldsIntegration.teardown(done);
  }, this));
};

CustomIntegration.prototype._setupForm = function () {
  var merchantConfiguration = this.configuration.merchantConfiguration;
  var formShouldAutoSubmit, successCallback, formIntegration;

  if (merchantConfiguration.id) {
    formIntegration = form.setup(this.apiClient, this.configuration);

    formShouldAutoSubmit = !isFunction(merchantConfiguration[constants.ROOT_SUCCESS_CALLBACK]);
    if (!formShouldAutoSubmit) {
      successCallback = this.onSuccess;
      formIntegration.onNonceReceived = bind(function (err, payload) {
        if (err) {
          this.bus.emit(Bus.events.ERROR, err); // eslint-disable-line no-invalid-this
        } else {
          successCallback(payload);
        }
      }, this);
    }

    this.destructor.registerFunctionForTeardown(function () {
      formIntegration.teardown();
    });
  } else {
    this.bus.on(Bus.events.PAYMENT_METHOD_GENERATED, bind(function (payload) {
      this.bus.emit(Bus.events.PAYMENT_METHOD_RECEIVED, payload); // eslint-disable-line no-invalid-this
    }, this));
  }
};

CustomIntegration.prototype._setupPayPal = function () {
  var configuration, paypalCallbackLookup, legacyPaypalSuccessCallback, legacyPaypalCancelledCallback, dummyInput, paypalConfiguration, merchantConfiguration;

  if (!this.configuration.merchantConfiguration.paypal) { return; }

  configuration = clone(this.configuration, function (value) {
    if (isJQueryElement(value)) {
      return value[0];
    } else if (isHTMLElement(value)) {
      return value;
    }
  });

  merchantConfiguration = configuration.merchantConfiguration;
  paypalConfiguration = merchantConfiguration.paypal;

  paypalCallbackLookup = getIntegrationCallbackLookup(merchantConfiguration, 'paypal');
  legacyPaypalSuccessCallback = paypalCallbackLookup('onSuccess');
  legacyPaypalCancelledCallback = paypalCallbackLookup('onCancelled');

  if (!paypalConfiguration.paymentMethodNonceInputField) {
    dummyInput = document.createElement('input');
    dummyInput.id = 'braintree-custom-integration-dummy-input';
    paypalConfiguration.paymentMethodNonceInputField = dummyInput;
  }

  paypalConfiguration.onSuccess = function (payload) {
    legacyPaypalSuccessCallback(
      payload.nonce,
      payload.details.email,
      convertToLegacyShippingAddress(payload.details.shippingAddress)
    );
  };

  paypalConfiguration.onCancelled = function () {
    legacyPaypalCancelledCallback();
  };

  if (merchantConfiguration.enableCORS) {
    paypalConfiguration.enableCORS = true;
  }

  this.paypalIntegration = paypal.create(configuration);

  if (this.paypalIntegration != null) {
    this.destructor.registerFunctionForTeardown(bind(function () {
      this.paypalIntegration.teardown(); // eslint-disable-line no-invalid-this
    }, this));
  }
};

CustomIntegration.prototype._setupCoinbase = function () {
  var coinbaseConfiguration, coinbaseIntegration;

  if (!this.configuration.merchantConfiguration.coinbase) { return; }

  if (navigator.userAgent.match(/MSIE 8\.0/)) { return; }

  coinbaseConfiguration = clone(this.configuration);
  coinbaseConfiguration.apiClient = this.apiClient;

  coinbaseIntegration = coinbase.create(coinbaseConfiguration);

  if (coinbaseIntegration != null) {
    this.destructor.registerFunctionForTeardown(function (done) {
      coinbaseIntegration.teardown(done);
    });
  }
};

CustomIntegration.prototype._onIntegrationReady = function () {
  var self = this;
  var returnedInstance = {};

  if (this.paypalIntegration) {
    returnedInstance.paypal = {
      initAuthFlow: this._wrapWithTeardownReply('initAuthFlow', function () {
        self.bus.emit(Bus.events.SEND_ANALYTICS_EVENTS, 'paypal.auth.init');
        self.paypalIntegration.initAuthFlow();
      }),
      closeAuthFlow: this._wrapWithTeardownReply('closeAuthFlow', function () {
        self.bus.emit(Bus.events.SEND_ANALYTICS_EVENTS, 'paypal.auth.close');
        self.paypalIntegration.closeAuthFlow();
      })
    };
  }

  BaseIntegration.prototype._onIntegrationReady.call(this, returnedInstance);
};

function getIntegrationCallbackLookup(options, integration) {
  return function (funcName) {
    if (integration in options && isFunction(options[integration][funcName])) {
      return options[integration][funcName];
    }
    return function noop() {};
  };
}

module.exports = CustomIntegration;

},{"148":148,"151":151,"156":156,"163":163,"166":166,"167":167,"168":168,"175":175,"177":177,"180":180,"201":201,"207":207,"213":213,"88":88,"95":95}],171:[function(require,module,exports){
'use strict';

var clone = require(148);
var create = require(156);
var dropin = require(199);
var bind = require(95);
var isFunction = require(151);
var Bus = require(163);
var constants = require(167);
var sanitizePayload = require(178);
var BaseIntegration = require(168);

function _getLegacyCallback(options) {
  if (isFunction(options.paymentMethodNonceReceived)) {
    return options.paymentMethodNonceReceived;
  }

  return null;
}

function _hasRootCallback(options) {
  return isFunction(options[constants.ROOT_SUCCESS_CALLBACK]);
}

function DropinIntegration() {
  var merchantConfiguration, legacyCallback, hasRootCallback, dropinIntegration, configuration;

  BaseIntegration.apply(this, arguments);

  configuration = clone(this.configuration);
  merchantConfiguration = configuration.merchantConfiguration;
  legacyCallback = _getLegacyCallback(merchantConfiguration);
  hasRootCallback = _hasRootCallback(merchantConfiguration);

  if (legacyCallback || hasRootCallback) {
    merchantConfiguration.paymentMethodNonceReceived = bind(function (payload) {
      if (legacyCallback) {
        legacyCallback(payload.originalEvent, payload.nonce);
      }

      this.bus.emit(Bus.events.PAYMENT_METHOD_RECEIVED, sanitizePayload(payload)); // eslint-disable-line no-invalid-this
    }, this);
  }

  dropinIntegration = dropin.create(configuration);
  this.destructor.registerFunctionForTeardown(function (done) {
    dropinIntegration.teardown(done);
  });

  this.bus.emit(Bus.events.ASYNC_DEPENDENCY_READY);
}

DropinIntegration.prototype = create(BaseIntegration.prototype, {
  constructor: DropinIntegration
});

module.exports = DropinIntegration;

},{"148":148,"151":151,"156":156,"163":163,"167":167,"168":168,"178":178,"199":199,"95":95}],172:[function(require,module,exports){
'use strict';

module.exports = {
  custom: require(170),
  dropin: require(171),
  paypal: require(173),
  coinbase: require(169)
};

},{"169":169,"170":170,"171":171,"173":173}],173:[function(require,module,exports){
'use strict';

var clone = require(148);
var create = require(156);
var paypal = require(213);
var bind = require(95);
var isFunction = require(151);
var constants = require(167);
var Bus = require(163);
var convertToLegacyShippingAddress = require(166).convertToLegacyShippingAddress;
var BaseIntegration = require(168);

function _getLegacyCallback(options) {
  if ('onSuccess' in options && isFunction(options.onSuccess)) {
    return options.onSuccess;
  } else if ('paypal' in options && isFunction(options.paypal.onSuccess)) {
    return options.paypal.onSuccess;
  }

  return null;
}

function _hasRootCallback(options) {
  return isFunction(options[constants.ROOT_SUCCESS_CALLBACK]);
}

function PayPalIntegration(configuration) {
  var merchantConfiguration, legacyCallback, hasRootCallback, key;

  configuration = clone(configuration);
  configuration.merchantConfiguration.paypal = configuration.merchantConfiguration.paypal || {};
  for (key in configuration.merchantConfiguration) {
    if (configuration.merchantConfiguration.hasOwnProperty(key) && key !== 'paypal') {
      configuration.merchantConfiguration.paypal[key] = configuration.merchantConfiguration[key];
    }
  }

  BaseIntegration.call(this, configuration);

  merchantConfiguration = this.configuration.merchantConfiguration;
  legacyCallback = _getLegacyCallback(merchantConfiguration);
  hasRootCallback = _hasRootCallback(merchantConfiguration);

  if (legacyCallback || hasRootCallback) {
    merchantConfiguration.paypal.onSuccess = bind(function (payload) {
      if (legacyCallback) {
        legacyCallback(
          payload.nonce,
          payload.details.email,
          convertToLegacyShippingAddress(payload.details.shippingAddress)
        );
      }

      this.bus.emit(Bus.events.PAYMENT_METHOD_RECEIVED, payload); // eslint-disable-line no-invalid-this
    }, this);
  }

  this.paypalIntegration = paypal.create(this.configuration);

  this.destructor.registerFunctionForTeardown(bind(function () {
    this.paypalIntegration.teardown(); // eslint-disable-line no-invalid-this
  }, this));

  this.bus.emit(Bus.events.ASYNC_DEPENDENCY_READY);
}

PayPalIntegration.prototype = create(BaseIntegration.prototype, {
  constructor: PayPalIntegration
});

PayPalIntegration.prototype._onIntegrationReady = function () {
  var self = this;
  var returnedInstance = {};

  if (this.paypalIntegration) {
    returnedInstance.paypal = {
      initAuthFlow: this._wrapWithTeardownReply('initAuthFlow', function () {
        self.bus.emit(Bus.events.SEND_ANALYTICS_EVENTS, 'paypal.auth.init');
        self.paypalIntegration.initAuthFlow();
      }),
      closeAuthFlow: this._wrapWithTeardownReply('closeAuthFlow', function () {
        self.bus.emit(Bus.events.SEND_ANALYTICS_EVENTS, 'paypal.auth.close');
        self.paypalIntegration.closeAuthFlow();
      })
    };
  }

  BaseIntegration.prototype._onIntegrationReady.call(this, returnedInstance);
};

module.exports = PayPalIntegration;

},{"148":148,"151":151,"156":156,"163":163,"166":166,"167":167,"168":168,"213":213,"95":95}],174:[function(require,module,exports){
'use strict';

module.exports = function fallbackError(error) {
  if (error.type === 'CONFIGURATION' || error.type === 'IMMEDIATE') {
    throw new Error(error.message);
  } else {
    try {
      if (navigator.userAgent.indexOf('MSIE') === -1) {
        console.error(error); // eslint-disable-line no-console
      } else {
        console.error(JSON.stringify(error, null, 2)); // eslint-disable-line no-console
      }
    } catch (e) { /* ignored */ }
  }
};

},{}],175:[function(require,module,exports){
'use strict';

var Bus = require(163);
var hostedFields = require(207);

var ANALYTICS_STRING = 'web.custom.hosted-fields.via.';
var INPUT_NAME = 'payment_method_nonce';

function NonceManager(configuration) {
  this.paymentMethod = null;
  this.nonceInputElement = null;

  this.bus = new Bus({channel: configuration.channel});
  this.formNapper = configuration.formNapper;
  this.rootCallback = configuration.rootCallback;

  this._attachEvents();
}

NonceManager.prototype._shouldStrictlyValidate = function (payload) {
  if (payload != null) { return false; }

  return this.paymentMethod == null || this.paymentMethod.type === 'CreditCard';
};

NonceManager.prototype._clearNonce = function () {
  this.paymentMethod = null;
  this.nonceInputElement = this.formNapper.inject(INPUT_NAME, '');
};

NonceManager.prototype._attachEvents = function () {
  var self = this;

  this.bus.on(Bus.events.PAYMENT_METHOD_CANCELLED, function () {
    self._clearNonce();
  });

  this.bus.on(Bus.events.PAYMENT_METHOD_GENERATED, function (payload) {
    self.paymentMethod = payload;
    self.nonceInputElement = self.formNapper.inject(INPUT_NAME, self.paymentMethod.nonce);
  });
};

NonceManager.prototype.handleSubmitRequest = function () {
  var self = this;

  this.bus.emit(hostedFields.events.TOKENIZATION_REQUEST, function (args) {
    var err = args[0];
    var payload = args[1];

    if (err) {
      self.bus.emit(Bus.events.ERROR, err);
      return;
    }

    self.paymentMethod = payload || self.paymentMethod;

    if (self._shouldStrictlyValidate(payload)) {
      self.bus.emit(hostedFields.events.VALIDATE_STRICT);
      self.bus.emit(Bus.events.ERROR, {
        type: 'VALIDATION',
        message: 'User did not enter a payment method'
      });
      return;
    }

    if (self.rootCallback) {
      self.bus.emit(Bus.events.SEND_ANALYTICS_EVENTS, ANALYTICS_STRING + 'callback.success', function () {
        self.rootCallback(self.paymentMethod);
      });
    } else {
      self.bus.emit(Bus.events.SEND_ANALYTICS_EVENTS, ANALYTICS_STRING + 'formsubmit.success', function () {
        self.nonceInputElement = self.formNapper.inject(INPUT_NAME, self.paymentMethod.nonce);
        self.formNapper.submit();
      });
    }
  });
};

NonceManager.prototype.teardown = function () {
  this._clearNonce();
};

module.exports = NonceManager;

},{"163":163,"207":207}],176:[function(require,module,exports){
'use strict';

var isFunction = require(151);

function noop() {}

module.exports = function lookupCallbackFor(model) {
  return function (callbackName, fallbackCallback) {
    if (isFunction(model[callbackName])) {
      return model[callbackName];
    } else if (isFunction(fallbackCallback)) {
      return fallbackCallback;
    }

    return noop;
  };
};

},{"151":151}],177:[function(require,module,exports){
'use strict';

function isJQueryElement(element) {
  return Boolean(element) && typeof element === 'object' && 'jquery' in element && element.length !== 0;
}

function isHTMLElement(element) {
  return Boolean(element) && element.nodeType === 1;
}

module.exports = {
  isJQueryElement: isJQueryElement,
  isHTMLElement: isHTMLElement
};

},{}],178:[function(require,module,exports){
'use strict';

module.exports = function sanitizePayload(payload) {
  return {
    nonce: payload.nonce,
    details: payload.details,
    type: payload.type
  };
};

},{}],179:[function(require,module,exports){
(function (global){
'use strict';

var VERSION = "2.17.2";
var api = require(14);
var paypal = require(213);
var dropin = require(199);
var integrations = require(172);
var constants = require(167);
var fallbackErrorHandler = require(174);
var lookupCallbackFor = require(176);
var utils = require(81);
var dataCollector = require(192);

function setup(authorization, integrationType, merchantConfiguration) {
  var channel;

  if (!integrations.hasOwnProperty(integrationType)) {
    throw new Error(integrationType + ' is an unsupported integration');
  }

  merchantConfiguration = merchantConfiguration || {};
  channel = utils.uuid();

  api._getConfiguration({
    enableCORS: merchantConfiguration.enableCORS || false,
    authorization: authorization,
    sessionId: channel
  }, function (err, gatewayConfiguration) {
    var errorFallback;

    if (err) {
      errorFallback = lookupCallbackFor(merchantConfiguration)(constants.ROOT_ERROR_CALLBACK, fallbackErrorHandler);
      errorFallback({message: err.errors});
      return;
    }

    new integrations[integrationType]({ // eslint-disable-line no-new
      channel: channel,
      authorization: authorization,
      gatewayConfiguration: gatewayConfiguration,
      integrationType: integrationType,
      merchantConfiguration: merchantConfiguration,
      analyticsConfiguration: {
        sdkVersion: 'braintree/web/' + VERSION,
        merchantAppId: global.location.host
      },
      isMerchantPageHttps: utils.isBrowserHttps()
    });
  });
}

module.exports = {
  api: api,
  data: dataCollector,
  cse: global.Braintree,
  paypal: paypal,
  dropin: dropin,
  hostedFields: {VERSION: require(207).VERSION},
  setup: setup,
  VERSION: VERSION
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"14":14,"167":167,"172":172,"174":174,"176":176,"192":192,"199":199,"207":207,"213":213,"81":81}],180:[function(require,module,exports){
'use strict';

var Coinbase = require(183);

function create(options) {
  var result = new Coinbase(options);

  return result.canCreateIntegration ? result : null;
}

module.exports = {create: create};

},{"183":183}],181:[function(require,module,exports){
(function (global){
'use strict';

function iOSSafariVersion(userAgent) {
  userAgent = userAgent || global.navigator.userAgent;
  if (!/AppleWebKit\//.test(userAgent)) {
    return null;
  }
  if (!/Mobile\//.test(userAgent)) {
    return null;
  }

  return userAgent.replace(/.* OS ([0-9_]+) like Mac OS X.*/, '$1').replace(/_/g, '.');
}

function ieVersion(UA) {
  var userAgent = UA || global.navigator.userAgent;
  var result = null;
  var match = /MSIE.(\d+)/.exec(userAgent);

  if (/Trident/.test(userAgent)) {
    result = 11;
  }

  if (match) {
    result = parseInt(match[1], 10);
  }

  return result;
}

function androidVersion(UA) {
  UA = UA || global.navigator.userAgent;
  if (!/Android/.test(UA)) { return null; }

  return UA.replace(/^.* Android ([0-9\.]+).*$/, '$1');
}

module.exports = {
  ieVersion: ieVersion,
  iOSSafariVersion: iOSSafariVersion,
  androidVersion: androidVersion
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],182:[function(require,module,exports){
'use strict';

var busEvents = require(163).events;

function tokenize(err, payload, coinbase) {
  if (err) {
    // TODO: make payload in line with onError()
    coinbase.bus.emit(busEvents.ERROR, err.error);
    coinbase.bus.emit(busEvents.SEND_ANALYTICS_EVENTS, 'coinbase.generate.nonce.failed');
    return;
  }

  coinbase.bus.emit(busEvents.PAYMENT_METHOD_GENERATED, payload);
  coinbase.bus.emit(busEvents.SEND_ANALYTICS_EVENTS, 'coinbase.generate.nonce.succeeded');
}

module.exports = {tokenize: tokenize};

},{"163":163}],183:[function(require,module,exports){
(function (global){
'use strict';

var bind = require(95);
var utils = require(81);
var Destructor = require(85);
var DOMComposer = require(187);
var urlComposer = require(190);
var callbacks = require(182);
var constants = require(184);
var detector = require(185);
var Bus = require(163);
var api = require(14);

function _getPopupParams(configuration) {
  return {
    clientId: configuration.gatewayConfiguration.coinbase.clientId,
    redirectUrl: configuration.gatewayConfiguration.coinbase.redirectUrl,
    scopes: configuration.gatewayConfiguration.coinbase.scopes || constants.SCOPES,
    meta: {
      authorizations_merchant_account: configuration.gatewayConfiguration.coinbase.merchantAccount || '' // eslint-disable-line camelcase
    }
  };
}

function _error(bus) {
  return function (message, type) {
    bus.emit(Bus.events.ERROR, {type: type, message: message});
  };
}

function _optionsAreValid(configuration, bus) {
  var cbOptions = (configuration.merchantConfiguration || {}).coinbase;
  var busError = _error(bus);

  if (configuration.apiClient == null) {
    busError('apiClient is required for coinbase', constants.CONFIGURATION_ERROR);
  } else if (!configuration.gatewayConfiguration.coinbaseEnabled) {
    busError('Coinbase is not enabled for your merchant account', constants.CONFIGURATION_ERROR);
  } else if (!cbOptions || !cbOptions.container && !cbOptions.button) {
    busError('Either options.coinbase.container or options.coinbase.button is required for Coinbase integrations', constants.CONFIGURATION_ERROR);
  } else if (cbOptions.container && cbOptions.button) {
    busError('options.coinbase.container and options.coinbase.button are mutually exclusive', constants.CONFIGURATION_ERROR);
  } else if (!detector.isSupportedBrowser()) {
    busError('Coinbase is not supported by your browser. Please consider upgrading', constants.UNSUPPORTED_BROWSER_ERROR);
  } else {
    return true;
  }

  return false;
}

function Coinbase(configuration) {
  var context, busOptions;
  var self = this;

  this.configuration = configuration;
  this.destructor = new Destructor();

  busOptions = {channel: configuration.channel};

  try {
    if (configuration.coinbase.container) {
      busOptions.merchantUrl = global.location.href;
    }
  } catch (e) { /* ignored */ }

  this.bus = configuration.bus || new Bus(busOptions);

  this.canCreateIntegration = _optionsAreValid(configuration, this.bus);
  if (!this.canCreateIntegration) {
    return;
  }

  this.buttonId = configuration.merchantConfiguration.coinbase.button || constants.BUTTON_ID;
  this.apiClient = configuration.apiClient || new api.Client(configuration);
  this._onOAuthSuccess = bind(this._onOAuthSuccess, this);
  this._handleButtonClick = bind(this._handleButtonClick, this);
  this.popupParams = _getPopupParams(configuration);
  this.redirectDoneInterval = null;

  if (configuration.merchantConfiguration.coinbase.container) {
    context = utils.normalizeElement(configuration.merchantConfiguration.coinbase.container);
    this._insertFrame(context);
  } else {
    global.braintreeCoinbasePopupCallback = this._onOAuthSuccess;

    context = document.body;
    utils.addEventListener(context, 'click', this._handleButtonClick);

    this.bus.emit(Bus.events.SEND_ANALYTICS_EVENTS, 'coinbase.initialized');

    this.destructor.registerFunctionForTeardown(function () {
      self._closePopup();
    });

    this.bus.on(constants.TEARDOWN_EVENT, bind(this.destructor.teardown, this.destructor));
  }
}

Coinbase.prototype._insertFrame = function (container) {
  var self = this;
  var frame = DOMComposer.createFrame({channel: this.configuration.channel});

  this.bus.emit(Bus.events.ASYNC_DEPENDENCY_INITIALIZING);

  container.appendChild(frame);
  this.destructor.registerFunctionForTeardown(function () {
    container.removeChild(frame);
  });

  // Delayed to make sure browser caches are busted.
  setTimeout(function () {
    frame.src = self.configuration.gatewayConfiguration.assetsUrl + '/coinbase/' + constants.VERSION + '/coinbase-frame.html#' + self.configuration.channel;
  }, 0);
};

Coinbase.prototype._onOAuthSuccess = function (data) {
  var self = this;

  if (!data.code) {
    this.bus.emit(Bus.events.SEND_ANALYTICS_EVENTS, 'coinbase.popup.denied');
    this._closePopup();
    return;
  }

  this.bus.emit('coinbase:view:navigate', 'loading');
  this.bus.emit(Bus.events.SEND_ANALYTICS_EVENTS, 'coinbase.popup.authorized');

  this.apiClient.tokenizeCoinbase({code: data.code, query: urlComposer.getQueryString()}, function (err, payload) {
    callbacks.tokenize.apply(null, [err, payload, self]);
  });

  this._closePopup();
};

Coinbase.prototype._clearPollForRedirectDone = function () {
  if (this.redirectDoneInterval) {
    clearInterval(this.redirectDoneInterval);
    this.redirectDoneInterval = null;
  }
};

Coinbase.prototype._closePopup = function (popup) {
  popup = popup || this.popup;

  if (popup == null) { return; }

  if (detector.shouldCloseFromParent()) {
    popup.close();
  }

  this._popupCleanup();
};

Coinbase.prototype._popupCleanup = function () {
  this._clearPollForRedirectDone();
  this.bus.emit(Bus.events.UI_POPUP_DID_CLOSE, {source: constants.INTEGRATION_NAME});
};

Coinbase.prototype._pollForRedirectDone = function (popup) {
  var self = this;
  var interval = setInterval(function () {
    var code;

    if (popup == null || popup.closed) {
      self.bus.emit(Bus.events.SEND_ANALYTICS_EVENTS, 'coinbase.popup.aborted');
      self._popupCleanup();
      return;
    }

    try {
      if (popup.location.href === 'about:blank') { throw new Error('Not finished loading'); }
      code = utils.decodeQueryString(popup.location.search.replace(/^\?/, '')).code;
    } catch (e) {
      return;
    }

    self._onOAuthSuccess({code: code});
  }, 100);

  this.redirectDoneInterval = interval;
  return interval;
};

Coinbase.prototype._openPopup = function () {
  var popup;

  this.bus.emit(Bus.events.SEND_ANALYTICS_EVENTS, 'coinbase.popup.started');

  popup = DOMComposer.createPopup(urlComposer.compose(this._getOAuthBaseUrl(), this.popupParams));
  popup.focus();

  this._pollForRedirectDone(popup);

  this.bus.emit(Bus.events.UI_POPUP_DID_OPEN, {source: constants.INTEGRATION_NAME});
  this.bus.on(Bus.events.UI_POPUP_FORCE_CLOSE, function (payload) {
    if (payload.target === constants.INTEGRATION_NAME) {
      popup.close();
    }
  });

  this.popup = popup;
};

Coinbase.prototype._getOAuthBaseUrl = function () {
  var baseUrl;

  if (this.configuration.gatewayConfiguration.coinbase.environment === 'shared_sandbox') {
    baseUrl = constants.SANDBOX_OAUTH_BASE_URL;
  } else {
    baseUrl = constants.PRODUCTION_OAUTH_BASE_URL;
  }

  return baseUrl;
};

Coinbase.prototype._handleButtonClick = function (event) {
  var target = event.target || event.srcElement;

  while (true) { // eslint-disable-line
    if (target == null) { return; }
    if (target === event.currentTarget) { return; }
    if (target.id === this.buttonId) { break; }

    target = target.parentNode;
  }

  if (event && event.preventDefault) {
    event.preventDefault();
  } else {
    event.returnValue = false;
  }

  this._openPopup();
};

Coinbase.prototype.teardown = function (done) {
  var self = this;

  if (!this.canCreateIntegration) {
    done(null);
    return;
  }

  this.bus.emit(constants.TEARDOWN_EVENT, function () {
    self.destructor.teardown(function (err) {
      if (err) { return done(err); }

      self.bus.teardown();
      done(null);
    });
  });
};

module.exports = Coinbase;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"14":14,"163":163,"182":182,"184":184,"185":185,"187":187,"190":190,"81":81,"85":85,"95":95}],184:[function(require,module,exports){
'use strict';

module.exports = {
  PRODUCTION_OAUTH_BASE_URL: 'https://coinbase.com',
  SANDBOX_OAUTH_BASE_URL: 'https://sandbox.coinbase.com',
  ORIGIN_URL: 'https://www.coinbase.com',
  FRAME_NAME: 'braintree-coinbase-frame',
  POPUP_NAME: 'coinbase',
  BUTTON_ID: 'bt-coinbase-button',
  SCOPES: 'send',
  VERSION: "2.17.2",
  INTEGRATION_NAME: 'Coinbase',
  CONFIGURATION_ERROR: 'CONFIGURATION',
  UNSUPPORTED_BROWSER_ERROR: 'UNSUPPORTED_BROWSER',
  TEARDOWN_EVENT: 'coinbase:TEARDOWN'
};

},{}],185:[function(require,module,exports){
'use strict';

var browser = require(181);

function isSupportedBrowser() {
  var version = browser.ieVersion();

  return !version || version > 8;
}

function shouldDisplayLollipopClose() {
  var version = browser.androidVersion();

  if (version == null) { return false; }

  return /^5/.test(version);
}

function shouldCloseFromParent() {
  return !(shouldDisplayLollipopClose() || shouldDisplayIOSClose());
}

function shouldDisplayIOSClose() {
  var version = browser.iOSSafariVersion();

  if (version == null) { return false; }

  return /^8\.0/.test(version) || /^8\.1$/.test(version);
}

module.exports = {
  isSupportedBrowser: isSupportedBrowser,
  shouldCloseFromParent: shouldCloseFromParent,
  shouldDisplayIOSClose: shouldDisplayIOSClose,
  shouldDisplayLollipopClose: shouldDisplayLollipopClose
};

},{"181":181}],186:[function(require,module,exports){
'use strict';

function createButton(config) {
  var button = document.createElement('button');

  config = config || {};

  button.id = config.id || 'coinbase-button';
  button.style.backgroundColor = config.backgroundColor || '#EEE';
  button.style.color = config.color || '#4597C3';
  button.style.border = config.border || '0';
  button.style.borderRadius = config.borderRadius || '6px';
  button.style.padding = config.padding || '12px';
  button.innerHTML = config.innerHTML || 'coinbase';

  return button;
}

module.exports = {create: createButton};

},{}],187:[function(require,module,exports){
'use strict';

var popup = require(189);
var button = require(186);
var frame = require(188);

module.exports = {
  createButton: button.create,
  createPopup: popup.create,
  createFrame: frame.create
};

},{"186":186,"188":188,"189":189}],188:[function(require,module,exports){
'use strict';

var constants = require(184);
var iframer = require(90);

function createFrame() {
  return iframer({
    name: constants.FRAME_NAME,
    height: '70px',
    width: '100%',
    style: {
      padding: 0,
      margin: 0,
      border: 0,
      outline: 'none'
    }
  });
}

module.exports = {create: createFrame};

},{"184":184,"90":90}],189:[function(require,module,exports){
(function (global){
'use strict';

var constants = require(184);

function _stringifyParams(payload) {
  var param;
  var params = [];

  for (param in payload) {
    if (payload.hasOwnProperty(param)) {
      params.push([param, payload[param]].join('='));
    }
  }

  return params.join(',');
}

function _getParams() {
  var baseWidth = 580;
  var baseHeight = 810;

  return _stringifyParams({
    width: baseWidth,
    height: baseHeight,
    left: (screen.width - baseWidth) / 2,
    top: (screen.height - baseHeight) / 4
  });
}

function createPopup(url) {
  return global.open(url, constants.POPUP_NAME, _getParams());
}

module.exports = {create: createPopup};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"184":184}],190:[function(require,module,exports){
'use strict';

var constants = require(184);

function getQueryString() {
  return 'version=' + constants.VERSION;
}

function compose(baseUrl, params) {
  var key;
  var url = baseUrl + '/oauth/authorize?response_type=code';
  var redirectUri = params.redirectUrl + '?' + getQueryString();

  url += '&redirect_uri=' + encodeURIComponent(redirectUri);
  url += '&client_id=' + params.clientId;

  if (params.scopes) {
    url += '&scope=' + encodeURIComponent(params.scopes);
  }

  if (params.meta) {
    for (key in params.meta) {
      if (params.meta.hasOwnProperty(key)) {
        url += '&meta[' + encodeURIComponent(key) + ']=' + encodeURIComponent(params.meta[key]);
      }
    }
  }

  return url;
}

module.exports = {
  compose: compose,
  getQueryString: getQueryString
};

},{"184":184}],191:[function(require,module,exports){
'use strict';

function setup() {
  return new Fraudnet();
}

function Fraudnet() {
  this.sessionId = _generateSessionId();
  this._beaconId = _generateBeaconId(this.sessionId);

  this._parameterBlock = _createParameterBlock(this.sessionId, this._beaconId);
  this._thirdPartyBlock = _createThirdPartyBlock();
}

Fraudnet.prototype.teardown = function () {
  this._thirdPartyBlock.parentNode.removeChild(this._thirdPartyBlock);
};

function _generateSessionId() {
  var i;
  var id = '';

  for (i = 0; i < 32; i++) {
    id += Math.floor(Math.random() * 16).toString(16);
  }

  return id;
}

function _generateBeaconId(sessionId) {
  var timestamp = new Date().getTime() / 1000;

  return 'https://b.stats.paypal.com/counter.cgi' +
    '?i=127.0.0.1' +
    '&p=' + sessionId +
    '&t=' + timestamp +
    '&a=14';
}

function _createParameterBlock(sessionId, beaconId) {
  var el = document.body.appendChild(document.createElement('script'));

  el.type = 'application/json';
  el.setAttribute('fncls', 'fnparams-dede7cc5-15fd-4c75-a9f4-36c430ee3a99');
  el.text = JSON.stringify({
    f: sessionId,
    s: 'BRAINTREE_SIGNIN',
    b: beaconId
  });

  return el;
}

function _createThirdPartyBlock() {
  var dom, doc;
  var scriptBaseURL = 'https://www.paypalobjects.com/webstatic/r/fb/';
  var iframe = document.createElement('iframe');

  iframe.src = 'about:blank';
  iframe.title = '';
  iframe.role = 'presentation'; // a11y
  (iframe.frameElement || iframe).style.cssText = 'width: 0; height: 0; border: 0';
  document.body.appendChild(iframe);

  try {
    doc = iframe.contentWindow.document;
  } catch (e) {
    dom = document.domain;
    iframe.src = 'javascript:var d=document.open();d.domain="' + dom + '";void(0);'; // eslint-disable-line
    doc = iframe.contentWindow.document;
  }

  doc.open()._l = function () {
    var js = this.createElement('script');

    if (dom) {
      this.domain = dom;
    }
    js.id = 'js-iframe-async';
    js.src = scriptBaseURL + 'fb-all-prod.pp.min.js';
    this.body.appendChild(js);
  };

  function listener() { doc._l(); }

  if (iframe.addEventListener) {
    iframe.addEventListener('load', listener, false);
  } else if (iframe.attachEvent) {
    iframe.attachEvent('onload', listener);
  } else {
    doc.write('<body onload="document._l();">');
  }

  doc.close();

  return iframe;
}

module.exports = {
  setup: setup
};

},{}],192:[function(require,module,exports){
'use strict';
/* eslint-disable camelcase */

var kount = require(193);
var fraudnet = require(191);

function setup(options) {
  var data, kountInstance, fraudnetInstance;
  var instances = [];

  function teardown() {
    var i;

    for (i = 0; i < instances.length; i++) {
      instances[i].teardown();
    }
  }

  if (options.kount != null) {
    kountInstance = kount.setup(options.kount);
    data = kountInstance.deviceData;
    instances.push(kountInstance);
  } else {
    data = {};
  }

  if (options.paypal === true) {
    fraudnetInstance = fraudnet.setup();
    data.correlation_id = fraudnetInstance.sessionId;
    instances.push(fraudnetInstance);
  }

  return {
    deviceData: JSON.stringify(data),
    teardown: teardown
  };
}

module.exports = {
  setup: setup
};

},{"191":191,"193":193}],193:[function(require,module,exports){
(function (global){
'use strict';
/* eslint-disable camelcase */

var sjcl = global.Braintree.sjcl;
var IFRAME_ID = 'braintreeDataFrame';
var BRAINTREE_KOUNT_ID = '600000';
var environmentUrls = {
  qa: 'https://assets.qa.braintreepayments.com/data',
  sandbox: 'https://assets.braintreegateway.com/sandbox/data',
  production: 'https://assets.braintreegateway.com/data'
};

function setup(o) {
  var options = o != null ? o : {};

  return new Kount(options);
}

function Kount(options) {
  sjcl.random.startCollectors();

  this._currentEnvironment = this._initializeEnvironment(options);
  this._deviceSessionId = this._generateDeviceSessionId();
  this.deviceData = this._getDeviceData();

  this._iframe = this._setupIFrame();
}

Kount.prototype.teardown = function () {
  sjcl.random.stopCollectors();
  this._removeIframe();
};

Kount.prototype._removeIframe = function () {
  this._iframe.parentNode.removeChild(this._iframe);
};

Kount.prototype._getDeviceData = function () {
  return {
    device_session_id: this._deviceSessionId,
    fraud_merchant_id: this._currentEnvironment.id
  };
};

Kount.prototype._generateDeviceSessionId = function () {
  var bits, hexString;

  bits = sjcl.random.randomWords(4, 0);
  hexString = sjcl.codec.hex.fromBits(bits);

  return hexString;
};

Kount.prototype._setupIFrame = function () {
  var params;
  var self = this;
  var iframe = document.getElementById(IFRAME_ID);

  if (iframe != null) {
    return iframe;
  }

  params = '?m=' + this._currentEnvironment.id + '&s=' + this._deviceSessionId;

  iframe = document.createElement('iframe');
  iframe.width = 1;
  iframe.id = IFRAME_ID;
  iframe.height = 1;
  iframe.frameBorder = 0;
  iframe.scrolling = 'no';

  document.body.appendChild(iframe);
  setTimeout(function () {
    iframe.src = self._currentEnvironment.url + '/logo.htm' + params;
    iframe.innerHTML = '<img src="' + self._currentEnvironment.url + '/logo.gif' + params + '" />';
  }, 10);

  return iframe;
};

Kount.prototype._initializeEnvironment = function (options) {
  var url = environmentUrls[options.environment];

  if (url == null) {
    throw new Error(options.environment + ' is not a valid environment for kount.environment');
  }

  return {
    url: url,
    name: options.environment,
    id: options.merchantId == null ? BRAINTREE_KOUNT_ID : options.merchantId
  };
};

module.exports = {
  setup: setup,
  Kount: Kount,
  environmentUrls: environmentUrls
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],194:[function(require,module,exports){
'use strict';

var RPC_METHOD_NAMES = ['unlockCreditCard'];

function APIProxyServer(apiClient) {
  this.apiClient = apiClient;
}

APIProxyServer.prototype.attach = function (rpcServer) {
  var self = this;
  var i = 0;
  var len = RPC_METHOD_NAMES.length;

  function attachDefine(name) {
    rpcServer.define(name, function () {
      self.apiClient[name].apply(self.apiClient, arguments);
    });
  }

  for (i; i < len; i++) {
    attachDefine(RPC_METHOD_NAMES[i]);
  }
};

module.exports = APIProxyServer;

},{}],195:[function(require,module,exports){
(function (global){
'use strict';

var htmlNode, bodyNode;
var api = require(14);
var BraintreeBus = require(163);
var Destructor = require(85);
var rpc = require(63);
var utils = require(81);
var normalizeElement = utils.normalizeElement;
var bind = require(95);
var APIProxyServer = require(194);
var MerchantFormManager = require(198);
var FrameContainer = require(197);
var constants = require(200);
var version = "2.17.2";
var PayPalModalView = require(217);

function getElementStyle(element, style) {
  var computedStyle = window.getComputedStyle ? getComputedStyle(element) : element.currentStyle;

  return computedStyle[style];
}

function getMerchantPageDefaultStyles() {
  return {
    html: {
      height: htmlNode.style.height || '',
      overflow: getElementStyle(htmlNode, 'overflow'),
      position: getElementStyle(htmlNode, 'position')
    },
    body: {
      height: bodyNode.style.height || '',
      overflow: getElementStyle(bodyNode, 'overflow')
    }
  };
}

function isMobile() {
  var isMobileUserAgent = /Android|iPhone|iPod|iPad/i.test(window.navigator.userAgent);

  return isMobileUserAgent;
}

function Client(configuration) {
  var inlineFramePath, modalFramePath, formElement;
  var self = this;

  this.configuration = configuration;
  this.destructor = new Destructor();
  this.container = null;
  this.merchantFormManager = null;
  this.configurationRequests = [];
  this.braintreeApiClient = new api.Client(this.configuration);

  this.braintreeBus = new BraintreeBus({
    merchantUrl: global.location.href,
    channel: this.configuration.channel
  });

  this.bus = new rpc.MessageBus(this.configuration.root, this.configuration.channel);
  this.rpcServer = new rpc.RPCServer(this.bus);
  this.apiProxyServer = new APIProxyServer(this.braintreeApiClient);

  this.apiProxyServer.attach(this.rpcServer);

  inlineFramePath = this.configuration.inlineFramePath || this.configuration.gatewayConfiguration.assetsUrl + '/dropin/' + version + '/inline-frame.html';
  modalFramePath = this.configuration.modalFramePath || this.configuration.gatewayConfiguration.assetsUrl + '/dropin/' + version + '/modal-frame.html';
  htmlNode = document.documentElement;
  bodyNode = document.body;

  this.frames = {
    inline: this._createFrame(inlineFramePath, constants.INLINE_FRAME_NAME),
    modal: this._createFrame(modalFramePath, constants.MODAL_FRAME_NAME)
  };

  this.container = normalizeElement(this.configuration.merchantConfiguration.container, 'Unable to find valid container.');
  formElement = normalizeElement(this.configuration.merchantConfiguration.form || this._findClosest(this.container, 'form'));

  this.merchantFormManager = new MerchantFormManager({
    form: formElement,
    frames: this.frames,
    onSubmit: this.configuration.merchantConfiguration.paymentMethodNonceReceived,
    apiClient: this.braintreeApiClient
  }).initialize();

  this.destructor.registerFunctionForTeardown(function () {
    self.merchantFormManager.teardown();
  });

  if (this.configuration.gatewayConfiguration.paypalEnabled) {
    this._configurePayPal();
  }

  this.braintreeApiClient.sendAnalyticsEvents('dropin.web.initialized');
}

Client.prototype.initialize = function () {
  var i;
  var self = this;

  this._initializeModal();

  this.braintreeBus.emit(BraintreeBus.events.ASYNC_DEPENDENCY_INITIALIZING);
  this.container.appendChild(this.frames.inline.element);
  bodyNode.appendChild(this.frames.modal.element);

  this.destructor.registerFunctionForTeardown(function (done) {
    self._hideModal(function () {
      self.container.removeChild(self.frames.inline.element);
      bodyNode.removeChild(self.frames.modal.element);

      done();
    });
  });

  this.rpcServer.define('receiveSharedCustomerIdentifier', function (sharedCustomerIdentifier) {
    self.braintreeApiClient.attrs.sharedCustomerIdentifier = sharedCustomerIdentifier;
    self.braintreeApiClient.attrs.sharedCustomerIdentifierType = 'browser_session_cookie_store';

    for (i = 0; i < self.configurationRequests.length; i++) {
      self.configurationRequests[i](self.encodedClientToken);
    }

    self.configurationRequests = [];
  });

  this.braintreeBus.on(BraintreeBus.events.PAYMENT_METHOD_GENERATED, bind(this._handleAltPayData, this));

  this.rpcServer.define('getConfiguration', function (reply) {
    reply(self.configuration);
  });

  this.rpcServer.define('selectPaymentMethod', function (paymentMethods) {
    self.frames.modal.rpcClient.invoke('selectPaymentMethod', [paymentMethods]);
    self._showModal();
  });

  this.rpcServer.define('sendAddedPaymentMethod', function (paymentMethod) {
    self.merchantFormManager.setNoncePayload(paymentMethod);

    self.frames.inline.rpcClient.invoke('receiveNewPaymentMethod', [paymentMethod]);
  });

  this.rpcServer.define('sendUsedPaymentMethod', function (paymentMethod) {
    self.frames.inline.rpcClient.invoke('selectPaymentMethod', [paymentMethod]);
  });

  this.rpcServer.define('sendUnlockedNonce', function (paymentMethod) {
    self.merchantFormManager.setNoncePayload(paymentMethod);
  });

  this.rpcServer.define('clearNonce', function () {
    self.merchantFormManager.clearNoncePayload();
  });

  this.rpcServer.define('closeDropInModal', function () {
    self._hideModal();
  });

  this.rpcServer.define('setInlineFrameHeight', function (height) {
    self.frames.inline.element.style.height = height + 'px';
  });

  this.bus.register('ready', function (message) {
    if (message.source === self.frames.inline.element.contentWindow) {
      self.frames.inline.rpcClient = new rpc.RPCClient(self.bus, message.source);
    } else if (message.source === self.frames.modal.element.contentWindow) {
      self.frames.modal.rpcClient = new rpc.RPCClient(self.bus, message.source);
    }
  });
};

Client.prototype._createFrame = function (endpoint, name) {
  return new FrameContainer(endpoint, name, this.braintreeBus);
};

Client.prototype._initializeModal = function () {
  this.frames.modal.element.style.display = 'none';
  this.frames.modal.element.style.position = isMobile() ? 'absolute' : 'fixed';
  this.frames.modal.element.style.top = '0';
  this.frames.modal.element.style.left = '0';
  this.frames.modal.element.style.height = '100%';
  this.frames.modal.element.style.width = '100%';
};

Client.prototype._lockMerchantWindowSize = function () {
  setTimeout(function () {
    htmlNode.style.overflow = 'hidden';
    bodyNode.style.overflow = 'hidden';
    bodyNode.style.height = '100%';

    if (isMobile()) {
      htmlNode.style.position = 'relative';
      htmlNode.style.height = window.innerHeight + 'px';
    }
  }, 160);
};

Client.prototype._unlockMerchantWindowSize = function () {
  var defaultStyles = this.merchantPageDefaultStyles;

  if (!defaultStyles) { return; }

  bodyNode.style.height = defaultStyles.body.height;
  bodyNode.style.overflow = defaultStyles.body.overflow;

  htmlNode.style.overflow = defaultStyles.html.overflow;

  if (isMobile()) {
    htmlNode.style.height = defaultStyles.html.height;
    htmlNode.style.position = defaultStyles.html.position;
  }

  delete this.merchantPageDefaultStyles;
};

Client.prototype._showModal = function () {
  var self = this;
  var el = this.frames.modal.element;

  this.merchantPageDefaultStyles = getMerchantPageDefaultStyles();

  el.style.display = 'block';

  this.frames.modal.rpcClient.invoke('open', [], function () {
    setTimeout(function () {
      self._lockMerchantWindowSize();
      el.contentWindow.focus();
    }, 200);
  });
};

Client.prototype._hideModal = function (done) {
  this._unlockMerchantWindowSize();
  this.frames.modal.element.style.display = 'none';

  if (done) {
    done();
  }
};

Client.prototype._configurePayPal = function () {
  var paypalOptions = this.configuration.merchantConfiguration.paypal || {};

  this.paypalModalView = new PayPalModalView({
    channel: this.configuration.channel,
    insertFrameFunction: paypalOptions.insertFrame,
    paypalAssetsUrl: this.configuration.gatewayConfiguration.paypal.assetsUrl,
    isHermes: Boolean(paypalOptions.singleUse) && Boolean(paypalOptions.amount) && Boolean(paypalOptions.currency)
  });
};

Client.prototype._handleAltPayData = function (payload) {
  this.merchantFormManager.setNoncePayload(payload);
  this.frames.inline.rpcClient.invoke('receiveNewPaymentMethod', [payload]);
  this.frames.modal.rpcClient.invoke('modalViewClose');
};

Client.prototype._findClosest = function (node, tagName) {
  tagName = tagName.toUpperCase();

  do {
    if (node.nodeName === tagName) {
      return node;
    }
    node = node.parentNode;
  } while (node);

  throw new Error('Unable to find a valid ' + tagName);
};

Client.prototype.teardown = function (done) {
  var self = this;

  if (this.paypalModalView) {
    this.paypalModalView.teardown();
  }

  this.braintreeBus.emit(constants.MODAL_FRAME_TEARDOWN_EVENT, function () {
    self.braintreeBus.emit(constants.INLINE_FRAME_TEARDOWN_EVENT, function () {
      self.destructor.teardown(function (err) {
        if (err) { return done(err); }

        self.braintreeBus.teardown();
        done();
      });
    });
  });
};

module.exports = Client;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"14":14,"163":163,"194":194,"197":197,"198":198,"200":200,"217":217,"63":63,"81":81,"85":85,"95":95}],196:[function(require,module,exports){
'use strict';

var Client = require(195);
var VERSION = "2.17.2";

function create(options) {
  var client = new Client(options);

  client.initialize();

  return client;
}

module.exports = {
  create: create,
  VERSION: VERSION
};

},{"195":195}],197:[function(require,module,exports){
'use strict';

var BraintreeBus = require(163);
var constants = require(200);
var iFramer = require(90);

// TODO: move to shared and deduplicate from src/internal/util/dropin-util.js
var TRANSITION_END_EVENT_NAMES = {
  transition: 'transitionend',
  '-o-transition': 'otransitionEnd',
  '-moz-transition': 'transitionend',
  '-webkit-transition': 'webkitTransitionEnd'
};

function getTransitionEndEventName() {
  var eventName;
  var fakeEl = document.createElement('fakeelement');

  for (eventName in TRANSITION_END_EVENT_NAMES) {
    if (typeof fakeEl.style[eventName] !== 'undefined') {
      return TRANSITION_END_EVENT_NAMES[eventName];
    }
  }
  return null;
}

function listenForReady(el, braintreeBus) {
  var transitionEndEvent = getTransitionEndEventName();

  function handler(event) {
    if (event.target === el && event.propertyName === 'height') {
      braintreeBus.emit(BraintreeBus.events.ASYNC_DEPENDENCY_READY);
      el.removeEventListener(transitionEndEvent, handler);
    }
  }

  if (transitionEndEvent) {
    el.addEventListener(transitionEndEvent, handler);
  } else {
    setTimeout(function () {
      braintreeBus.emit(BraintreeBus.events.ASYNC_DEPENDENCY_READY);
    }, 500);
  }
}

function FrameContainer(endpoint, name, braintreeBus) {
  var transition = 'height 210ms cubic-bezier(0.390, 0.575, 0.565, 1.000)';
  var element = iFramer({
    name: name,
    width: '100%',
    height: '68',
    style: {
      transition: transition,
      WebkitTransition: transition,
      MozTransition: transition,
      msTransition: transition,
      OTransition: transition,
      border: '0',
      zIndex: '9999'
    }
  });

  this.element = element;

  // Delayed so that browsers won't cache iframe URLs.
  setTimeout(function () {
    element.src = endpoint + '#' + braintreeBus.channel;
  }, 0);

  if (name === constants.INLINE_FRAME_NAME) {
    listenForReady(element, braintreeBus);
  }
}

module.exports = FrameContainer;

},{"163":163,"200":200,"90":90}],198:[function(require,module,exports){
'use strict';

var bind = require(95);
var FormNapper = require(88);

function MerchantFormManager(options) {
  this.formNapper = new FormNapper(options.form);
  this.frames = options.frames;
  this.onSubmit = options.onSubmit;
  this.apiClient = options.apiClient;
}

MerchantFormManager.prototype.initialize = function () {
  if (this._isSubmitBased()) {
    this._setElements();
  }

  this._setEvents();

  return this;
};

MerchantFormManager.prototype.setNoncePayload = function (payload) {
  this.noncePayload = payload;
};

MerchantFormManager.prototype.clearNoncePayload = function () {
  this.noncePayload = null;
};

MerchantFormManager.prototype._isSubmitBased = function () {
  return !this.onSubmit;
};

MerchantFormManager.prototype._isCallbackBased = function () {
  return Boolean(this.onSubmit);
};

MerchantFormManager.prototype._setElements = function () {
  this.nonceInput = this.formNapper.inject('payment_method_nonce', '');
};

MerchantFormManager.prototype._setEvents = function () {
  this.formNapper.hijack(bind(this._handleFormSubmit, this));
};

MerchantFormManager.prototype._handleFormSubmit = function (event) {
  var self = this;

  if (this.noncePayload && this.noncePayload.nonce) {
    this._handleNonceReply(event);
  } else {
    this.frames.inline.rpcClient.invoke('requestNonce', [], function (payload) {
      self.setNoncePayload(payload);
      self._handleNonceReply(event);
    });
  }
};

MerchantFormManager.prototype._handleNonceReply = function (event) {
  var self = this;

  if (this._isCallbackBased()) {
    this.apiClient.sendAnalyticsEvents('dropin.web.end.callback', function () {
      var payload = self.noncePayload;

      payload.originalEvent = event;

      self.onSubmit(payload);

      setTimeout(function () {
        delete payload.originalEvent;

        self.frames.inline.rpcClient.invoke('clearLoadingState');
        self.frames.inline.rpcClient.invoke('receiveNewPaymentMethod', [payload]);
      }, 200);
    });
  } else {
    this._triggerFormSubmission();
  }
};

MerchantFormManager.prototype._triggerFormSubmission = function () {
  var self = this;

  this.nonceInput = this.formNapper.inject('payment_method_nonce', this.noncePayload.nonce);

  this.apiClient.sendAnalyticsEvents('dropin.web.end.auto-submit', function () {
    self.formNapper.submit();
  });
};

MerchantFormManager.prototype.teardown = function () {
  var form;

  if (this.nonceInput) {
    form = this.formNapper.htmlForm;
    form.removeChild(this.nonceInput);
  }

  this.formNapper.detach();
};

module.exports = MerchantFormManager;

},{"88":88,"95":95}],199:[function(require,module,exports){
'use strict';

module.exports = require(196);

},{"196":196}],200:[function(require,module,exports){
module.exports={
  "PAYPAL_INTEGRATION_NAME": "PayPal",
  "INLINE_FRAME_NAME": "braintree-dropin-frame",
  "MODAL_FRAME_NAME": "braintree-dropin-modal-frame",
  "PAYMENT_METHOD_TYPES": ["CoinbaseAccount", "PayPalAccount", "CreditCard"],
  "cssClassMap": {
    "American Express": "american-express",
    "Diners Club": "diners-club",
    "DinersClub": "diners-club",
    "Discover": "discover",
    "JCB": "jcb",
    "Maestro": "maestro",
    "MasterCard": "master-card",
    "Solo": "solo",
    "Switch": "switch",
    "UKMaestro": "maestro",
    "UnionPay": "unionpay",
    "Visa": "visa"
  },
  "INLINE_FRAME_TEARDOWN_EVENT": "dropin:TEARDOWN_INLINE_FRAME",
  "MODAL_FRAME_TEARDOWN_EVENT": "dropin:TEARDOWN_MODAL_FRAME"
}

},{}],201:[function(require,module,exports){
'use strict';

var Form = require(203);
var validateAnnotations = require(206);

function setup(apiClient, configuration) {
  var merchantConfiguration = configuration.merchantConfiguration || {};
  var htmlForm = document.getElementById(merchantConfiguration.id);
  var isCreditCardForm = merchantConfiguration.useCreditCard !== false;

  if (!htmlForm) {
    throw new Error('Unable to find form with id: "' + merchantConfiguration.id + '"');
  }

  if (isCreditCardForm) {
    validateAnnotations(htmlForm);
  }

  return new Form(apiClient, configuration);
}

module.exports = {setup: setup};

},{"203":203,"206":206}],202:[function(require,module,exports){
(function (global){
'use strict';

var ELEMENT_NODE = global.Node ? global.Node.ELEMENT_NODE : 1;

function extractValues(node, results) {
  var child, i, dataAttr;
  var children = node.children;

  results = results || {};

  for (i = 0; i < children.length; i++) {
    child = children[i];

    if (isBraintreeNode(child)) {
      dataAttr = child.getAttribute('data-braintree-name');

      if (dataAttr === 'postal_code') {
        results.billingAddress = {
          postalCode: child.value
        };
      } else {
        results[dataAttr] = child.value;
      }

      scrubAttributes(child);
    } else if (child.children && child.children.length > 0) {
      extractValues(child, results);
    }
  }

  return results;
}

function scrubAttributes(node) {
  try {
    node.attributes.removeNamedItem('name');
  } catch (e) { /* ignored */ }
}

function scrubAllAttributes(node) {
  extractValues(node);
}

function isBraintreeNode(node) {
  return node.nodeType === ELEMENT_NODE && node.attributes['data-braintree-name'];
}

module.exports = {
  extractValues: extractValues,
  scrubAllAttributes: scrubAllAttributes,
  scrubAttributes: scrubAttributes,
  isBraintreeNode: isBraintreeNode
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],203:[function(require,module,exports){
(function (global){
'use strict';

var bind = require(95);
var util = require(81);
var fields = require(202);
var Destructor = require(85);
var Bus = require(163);
var PaymentMethodModel = require(205);
var getNonceInput = require(204);
var ERROR_PAYLOAD = {
  message: 'Unable to process payments at this time',
  type: 'IMMEDIATE'
};

function Form(apiClient, configuration) {
  var merchantConfiguration = configuration.merchantConfiguration;
  var hasExistingInput = typeof merchantConfiguration.paymentMethodNonceInputField === 'object';
  var self = this;

  this.destructor = new Destructor();

  this.apiClient = apiClient;

  this.isCreditCardForm = merchantConfiguration.useCreditCard !== false;

  this.htmlForm = document.getElementById(merchantConfiguration.id);

  this.paymentMethodNonceInput = getNonceInput(merchantConfiguration.paymentMethodNonceInputField);
  this.htmlForm.appendChild(this.paymentMethodNonceInput);
  this.destructor.registerFunctionForTeardown(function () {
    if (hasExistingInput) {
      self.paymentMethodNonceInput.value = '';
    } else {
      self.htmlForm.removeChild(self.paymentMethodNonceInput);
    }
  });

  this.model = new PaymentMethodModel();

  this.bus = new Bus({
    merchantUrl: global.location.href,
    channel: configuration.channel
  });

  this.setEvents();
  this.destructor.registerFunctionForTeardown(function () {
    self.bus.teardown();
  });
}

Form.prototype.setEvents = function () {
  var self = this;

  this.onSubmitHandler = bind(this.handleSubmit, this);
  this.onExternalNonceReceived = bind(this.onExternalNonceReceived, this);
  this.clearExternalNonce = bind(this.clearExternalNonce, this);

  util.addEventListener(this.htmlForm, 'submit', this.onSubmitHandler);
  this.destructor.registerFunctionForTeardown(function () {
    util.removeEventListener(self.htmlForm, 'submit', self.onSubmitHandler);
  });

  this.bus.on(Bus.events.PAYMENT_METHOD_GENERATED, this.onExternalNonceReceived);
  this.bus.on(Bus.events.PAYMENT_METHOD_CANCELLED, this.clearExternalNonce);
};

Form.prototype.handleSubmit = function (event) {
  var type;
  var self = this;

  if (event.preventDefault) {
    event.preventDefault();
  } else {
    event.returnValue = false;
  }

  if (!this.isCreditCardForm) {
    this.onNonceReceived(null, this.model.attributes);
    return;
  }

  type = this.model.get('type');

  if (type && type !== 'CreditCard') {
    fields.scrubAllAttributes(this.htmlForm);
    this.onNonceReceived(null, this.model.attributes);
    return;
  }

  this.apiClient.tokenizeCard(fields.extractValues(this.htmlForm), function (err, nonce, payload) {
    if (err) {
      self.onNonceReceived(ERROR_PAYLOAD, null);
    } else {
      self.model.set({
        nonce: nonce,
        type: payload.type,
        details: payload.details
      });

      self.onNonceReceived(null, self.model.attributes);
    }
  });
};

Form.prototype.writeNonceToDOM = function () {
  this.paymentMethodNonceInput.value = this.model.get('nonce');
};

Form.prototype.onExternalNonceReceived = function (payload) {
  this.model.set(payload);
  this.writeNonceToDOM();
};

Form.prototype.clearExternalNonce = function () {
  this.model.reset();
};

Form.prototype.onNonceReceived = function (err) {
  var form = this.htmlForm;

  if (err) {
    this.bus.emit(Bus.events.ERROR, ERROR_PAYLOAD);
    return;
  }

  util.removeEventListener(form, 'submit', this.onSubmitHandler);

  this.writeNonceToDOM();

  if (form.submit && (typeof form.submit === 'function' || form.submit.call)) {
    form.submit();
  } else {
    setTimeout(function () {
      form.querySelector('[type="submit"]').click();
    }, 1);
  }
};

Form.prototype.teardown = function () {
  this.destructor.teardown();
};

module.exports = Form;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"163":163,"202":202,"204":204,"205":205,"81":81,"85":85,"95":95}],204:[function(require,module,exports){
'use strict';

module.exports = function getNonceInput(paymentMethodNonceInputField) {
  var nonceInputName, nonceInput;

  if (typeof paymentMethodNonceInputField === 'object') {
    return paymentMethodNonceInputField;
  }

  nonceInputName = 'payment_method_nonce';

  if (typeof paymentMethodNonceInputField === 'string') {
    nonceInputName = paymentMethodNonceInputField;
  }

  nonceInput = document.createElement('input');
  nonceInput.name = nonceInputName;
  nonceInput.type = 'hidden';

  return nonceInput;
};

},{}],205:[function(require,module,exports){
'use strict';

function PaymentMethodModel() {
  this.reset();
}

PaymentMethodModel.prototype.get = function (key) {
  return this.attributes[key];
};

PaymentMethodModel.prototype.set = function (payload) {
  this.attributes = payload || {};
};

PaymentMethodModel.prototype.reset = function () {
  this.attributes = {};
};

module.exports = PaymentMethodModel;

},{}],206:[function(require,module,exports){
'use strict';

module.exports = function validateAnnotations(htmlForm) {
  var i, field;
  var inputs = htmlForm.getElementsByTagName('*');
  var valid = {};

  for (i = 0; i < inputs.length; i++) {
    field = inputs[i].getAttribute('data-braintree-name');
    valid[field] = true;
  }

  if (!valid.number) {
    throw new Error('Unable to find an input with data-braintree-name="number" in your form. Please add one.');
  }

  if (valid.expiration_date) {
    if (valid.expiration_month || valid.expiration_year) {
      throw new Error('You have inputs with data-braintree-name="expiration_date" AND data-braintree-name="expiration_(year|month)". Please use either "expiration_date" or "expiration_year" and "expiration_month".');
    }
  } else {
    if (!valid.expiration_month && !valid.expiration_year) {
      throw new Error('Unable to find an input with data-braintree-name="expiration_date" in your form. Please add one.');
    }

    if (!valid.expiration_month) {
      throw new Error('Unable to find an input with data-braintree-name="expiration_month" in your form. Please add one.');
    }

    if (!valid.expiration_year) {
      throw new Error('Unable to find an input with data-braintree-name="expiration_year" in your form. Please add one.');
    }
  }
};

},{}],207:[function(require,module,exports){
'use strict';

var HostedFields = require(209);
var events = require(211).events;
var VERSION = "2.17.2";

module.exports = {
  create: function (configuration) {
    return new HostedFields(configuration);
  },
  events: events,
  VERSION: VERSION
};

},{"209":209,"211":211}],208:[function(require,module,exports){
'use strict';

var constants = require(211);

module.exports = function composeUrl(assetsUrl, channel) {
  return assetsUrl +
    '/hosted-fields/' +
    constants.VERSION +
    '/hosted-fields-frame.html#' +
    channel;
};

},{"211":211}],209:[function(require,module,exports){
'use strict';

var Destructor = require(85);
var classListManager = require(82);
var iFramer = require(90);
var Bus = require(163);
var composeUrl = require(208);
var constants = require(211);
var nodeListToArray = require(162);
var utils = require(81);
var findParentTags = require(212);
var shouldUseLabelFocus = require(210);
var events = constants.events;

function injectFrame(frame, container) {
  var clearboth = document.createElement('div');

  clearboth.style.clear = 'both';

  container = container || document.body;

  container.appendChild(frame);
  container.appendChild(clearboth);

  return {
    parent: container,
    children: [frame, clearboth]
  };
}

function inputEventHandler(fields, onFieldEvent) {
  return function (eventData) {
    var container = fields[eventData.fieldKey].containerElement;
    var classList = classListManager(container);

    eventData.target = {
      fieldKey: eventData.fieldKey,
      container: container
    };

    classList
      .toggle(constants.externalClasses.FOCUSED, eventData.isFocused)
      .toggle(constants.externalClasses.VALID, eventData.isValid);
    if (eventData.isStrictlyValidating) {
      classList.toggle(constants.externalClasses.INVALID, !eventData.isValid);
    } else {
      classList.toggle(constants.externalClasses.INVALID, !eventData.isPotentiallyValid);
    }

    delete eventData.fieldKey;
    delete eventData.isStrictlyValidating;

    if (onFieldEvent) {
      onFieldEvent(eventData);
    }
  };
}

function HostedFieldsIntegration(configuration) {
  var field, container, frame, key, msg;
  var self = this;
  var fields = {};
  var fieldCount = 0;

  this.injectedNodes = [];
  this.destructor = new Destructor();

  this.bus = new Bus({
    channel: configuration.channel,
    merchantUrl: location.href
  });

  this.destructor.registerFunctionForTeardown(function () {
    self.bus.teardown();
  });

  this.bus.emit(Bus.events.ASYNC_DEPENDENCY_INITIALIZING);
  this.bus.emit(Bus.events.SEND_ANALYTICS_EVENTS, 'hosted-fields.initialized');

  for (key in constants.whitelistedFields) {
    if (constants.whitelistedFields.hasOwnProperty(key)) {
      field = configuration.merchantConfiguration.hostedFields[key];

      if (!field) { continue; }

      container = document.querySelector(field.selector);

      if (!container) {
        msg = 'Unable to find element with selector "' + field.selector + '" for hostedFields.' + key;
        this.bus.emit(Bus.events.ERROR, {
          message: msg
        });
        continue;
      } else if (container.querySelector('iframe[name^="braintree-"]')) {
        this.bus.emit(Bus.events.ERROR, {
          message: 'Cannot place two elements in "' + field.selector + '"'
        });
        continue;
      }

      frame = iFramer({
        type: key,
        name: 'braintree-hosted-field-' + key,
        style: constants.defaultIFrameStyle
      });

      this.injectedNodes.push(injectFrame(frame, container));
      this.setupLabelFocus(key, container);
      fields[key] = {
        frameElement: frame,
        containerElement: container
      };
      fieldCount++;

      /* eslint-disable no-loop-func */
      setTimeout((function (f) {
        return function () {
          f.src = composeUrl(
            configuration.gatewayConfiguration.assetsUrl,
            configuration.channel
          );
        };
      })(frame), 0);
    }
  } /* eslint-enable no-loop-func */

  this.bus.on(events.FRAME_READY, function (reply) {
    fieldCount--;
    if (fieldCount === 0) {
      reply(true);
    } else {
      reply(false);
    }
  });

  this.bus.on(
    events.INPUT_EVENT,
    inputEventHandler(fields, configuration.merchantConfiguration.hostedFields.onFieldEvent)
  );

  this.destructor.registerFunctionForTeardown(function () {
    var j, k, nodeGroup;

    for (j = 0; j < self.injectedNodes.length; j++) {
      nodeGroup = self.injectedNodes[j];

      for (k = 0; k < nodeGroup.children.length; k++) {
        nodeGroup.parent.removeChild(nodeGroup.children[k]);
      }

      classListManager(nodeGroup.parent).remove(
        constants.externalClasses.FOCUSED,
        constants.externalClasses.INVALID,
        constants.externalClasses.VALID
      );
    }
  });
}

HostedFieldsIntegration.prototype.setupLabelFocus = function (type, container) {
  var labels, i;
  var bus = this.bus;

  if (!shouldUseLabelFocus()) { return; }
  if (container.id == null) { return; }

  function triggerFocus() {
    bus.emit(events.TRIGGER_INPUT_FOCUS, type);
  }

  labels = nodeListToArray(document.querySelectorAll('label[for="' + container.id + '"]'));
  labels = labels.concat(findParentTags(container, 'label'));

  for (i = 0; i < labels.length; i++) {
    utils.addEventListener(labels[i], 'click', triggerFocus, false);
  }

  this.destructor.registerFunctionForTeardown(function () {
    for (i = 0; i < labels.length; i++) {
      utils.removeEventListener(labels[i], 'click', triggerFocus, false);
    }
  });
};

HostedFieldsIntegration.prototype.teardown = function (done) {
  this.destructor.teardown(done);
};

module.exports = HostedFieldsIntegration;

},{"162":162,"163":163,"208":208,"210":210,"211":211,"212":212,"81":81,"82":82,"85":85,"90":90}],210:[function(require,module,exports){
'use strict';

module.exports = function shouldUseLabelFocus() {
  return !/(iPad|iPhone|iPod)/i.test(navigator.userAgent);
};

},{}],211:[function(require,module,exports){
'use strict';
/* eslint-disable no-reserved-keys */

var VERSION = "2.17.2";

module.exports = {
  VERSION: VERSION,
  events: {
    FRAME_READY: 'hosted-fields:FRAME_READY',
    VALIDATE_STRICT: 'hosted-fields:VALIDATE_STRICT',
    CONFIGURATION: 'hosted-fields:CONFIGURATION',
    TOKENIZATION_REQUEST: 'hosted-fields:TOKENIZATION_REQUEST',
    INPUT_EVENT: 'hosted-fields:INPUT_EVENT',
    TRIGGER_INPUT_FOCUS: 'hosted-fields:TRIGGER_INPUT_FOCUS'
  },
  externalEvents: {
    FOCUS: 'focus',
    BLUR: 'blur',
    FIELD_STATE_CHANGE: 'fieldStateChange'
  },
  defaultMaxLengths: {
    number: 19,
    postalCode: 8,
    expirationDate: 7,
    expirationMonth: 2,
    expirationYear: 4,
    cvv: 3
  },
  externalClasses: {
    FOCUSED: 'braintree-hosted-fields-focused',
    INVALID: 'braintree-hosted-fields-invalid',
    VALID: 'braintree-hosted-fields-valid'
  },
  defaultIFrameStyle: {
    border: 'none',
    width: '100%',
    height: '100%',
    'float': 'left'
  },
  whitelistedStyles: [
    '-moz-osx-font-smoothing',
    '-moz-transition',
    '-webkit-font-smoothing',
    '-webkit-transition',
    'color',
    'font',
    'font-family',
    'font-size',
    'font-size-adjust',
    'font-stretch',
    'font-style',
    'font-variant',
    'font-variant-alternates',
    'font-variant-caps',
    'font-variant-east-asian',
    'font-variant-ligatures',
    'font-variant-numeric',
    'font-weight',
    'line-height',
    'opacity',
    'outline',
    'text-shadow',
    'transition'
  ],
  whitelistedFields: {
    number: {
      name: 'credit-card-number',
      label: 'Credit Card Number'
    },
    cvv: {
      name: 'cvv',
      label: 'CVV'
    },
    expirationDate: {
      name: 'expiration',
      label: 'Expiration Date'
    },
    expirationMonth: {
      name: 'expiration-month',
      label: 'Expiration Month'
    },
    expirationYear: {
      name: 'expiration-year',
      label: 'Expiration Year'
    },
    postalCode: {
      name: 'postal-code',
      label: 'Postal Code'
    }
  }
};

},{}],212:[function(require,module,exports){
'use strict';

function findParentTags(element, tag) {
  var parent = element.parentNode;
  var parents = [];

  while (parent != null) {
    if (parent.tagName != null && parent.tagName.toLowerCase() === tag) {
      parents.push(parent);
    }

    parent = parent.parentNode;
  }

  return parents;
}

module.exports = findParentTags;

},{}],213:[function(require,module,exports){
'use strict';

module.exports = require(215);

},{"215":215}],214:[function(require,module,exports){
(function (global){
'use strict';

var braintreeUtil = require(81);
var bind = require(95);
var isFunction = require(151);
var Destructor = require(85);
var Bus = require(163);
var AppView = require(217);
var LoggedInView = require(219);
var LoggedOutView = require(220);
var OverlayView = require(223);
var MerchantPageView = require(221);
var PaymentMethodNonceInputFieldView = require(224);
var BridgeIframeView = require(218);
var browser = require(234);
var constants = require(226);
var util = require(236);
var bindAll = require(96);

function Client(configuration) {
  this.configuration = configuration;

  this.destructor = new Destructor();

  this.bus = new Bus({
    merchantUrl: global.location.href,
    channel: this.configuration.channel
  });

  this.container = braintreeUtil.normalizeElement(this.configuration.merchantConfiguration.paypal.container || document.body);

  this.loggedInView = null;
  this.loggedOutView = null;
  this.appView = null;
  this.merchantPageView = null;
  this.paymentMethodNonceInputFieldView = null;
  this.overlayView = null;
  this.bridgeIframeView = null;

  bindAll(this, ['initAuthFlow', 'closeAuthFlow']);
}

Client.prototype.initialize = function () {
  var clickLoginHandler = bind(this._handleClickLogin, this);

  this._createViews();

  this.bus.on(
    Bus.events.PAYMENT_METHOD_CANCELLED,
    bind(this._handlePaymentMethodCancelled, this)
  );

  if (this.configuration.integrationType !== 'dropin') {
    this.bus.on(
      Bus.events.PAYMENT_METHOD_GENERATED,
      bind(this._handlePaymentMethodGenerated, this)
    );
  }

  braintreeUtil.addEventListener(document.body, 'click', clickLoginHandler);

  this.destructor.registerFunctionForTeardown(function () {
    braintreeUtil.removeEventListener(document.body, 'click', clickLoginHandler);
  });
};

Client.prototype._createViews = function () {
  var i;
  var views = [];
  var self = this;
  var isDropin = this.configuration.integrationType === 'dropin';

  if (browser.isBridgeIframeRequired()) {
    this.bridgeIframeView = new BridgeIframeView({
      container: this.container,
      paypalAssetsUrl: this.configuration.gatewayConfiguration.paypal.assetsUrl,
      channel: this.configuration.channel
    });
    views.push(this.bridgeIframeView);
  }

  this.appView = new AppView({
    insertFrameFunction: this.configuration.merchantConfiguration.paypal.insertFrameFunction,
    paypalAssetsUrl: this.configuration.gatewayConfiguration.paypal.assetsUrl,
    isHermes: util.isHermesConfiguration(this.configuration),
    isDropin: isDropin,
    channel: this.configuration.channel
  });
  views.push(this.appView);

  if (!isDropin) {
    this.merchantPageView = new MerchantPageView({
      channel: this.configuration.channel
    });
    views.push(this.merchantPageView);

    if (browser.isPopupSupported() && browser.isOverlaySupported()) {
      this.overlayView = new OverlayView({
        paypalAssetsUrl: this.configuration.gatewayConfiguration.paypal.assetsUrl,
        onFocus: function () { self.bus.emit(constants.events.FOCUS_APP); },
        onClose: function () { self.bus.emit(constants.events.CLOSE_APP); },
        locale: this.configuration.merchantConfiguration.paypal.locale,
        channel: this.configuration.channel
      });
      views.push(this.overlayView);
    }
  }

  if (!(isDropin || this.configuration.merchantConfiguration.paypal.headless)) {
    this.paymentMethodNonceInputFieldView = new PaymentMethodNonceInputFieldView({
      container: this.container,
      el: this.configuration.merchantConfiguration.paypal.paymentMethodNonceInputField,
      channel: this.configuration.channel
    });
    views.push(this.paymentMethodNonceInputFieldView);

    this.loggedInView = new LoggedInView({
      paypalAssetsUrl: this.configuration.gatewayConfiguration.paypal.assetsUrl,
      container: this.container,
      locale: this.configuration.merchantConfiguration.paypal.locale,
      channel: this.configuration.channel
    });
    views.push(this.loggedInView);

    this.loggedOutView = new LoggedOutView({
      paypalAssetsUrl: this.configuration.gatewayConfiguration.paypal.assetsUrl,
      container: this.container,
      enablePayPalButton: util.isOnetimeHermesConfiguration(this.configuration),
      locale: this.configuration.merchantConfiguration.paypal.locale,
      channel: this.configuration.channel
    });
    views.push(this.loggedOutView);
  }

  this.destructor.registerFunctionForTeardown(function () {
    for (i = 0; i < views.length; i++) {
      views[i].teardown();
    }
  });
};

Client.prototype._handleClickLogin = function (event) {
  var target = event.target || event.srcElement;

  while (true) { // eslint-disable-line no-constant-condition
    if (target == null) { return; }
    if (target === event.currentTarget) { return; }
    if (this._isButton(target)) { break; }

    target = target.parentNode;
  }

  util.preventDefault(event);

  this.initAuthFlow();
};

Client.prototype.initAuthFlow = function () {
  this.appView.open();
};

Client.prototype.closeAuthFlow = function () {
  this.appView.close();
};

Client.prototype._isButton = function (node) {
  var isPayPalButton = node.id === 'braintree-paypal-button';
  var isHermesButton = util.isOnetimeHermesConfiguration(this.configuration) &&
    node.className.match(/paypal-button(?!-widget)/);

  return isPayPalButton || isHermesButton;
};

Client.prototype._handlePaymentMethodGenerated = function (bundle) {
  var onSuccess = this.configuration.merchantConfiguration.paypal.onSuccess;

  if (bundle.type === constants.NONCE_TYPE && isFunction(onSuccess)) {
    onSuccess(bundle);
  }
};

Client.prototype._handlePaymentMethodCancelled = function (payload) {
  var onCancelled = this.configuration.merchantConfiguration.paypal.onCancelled;

  if (payload.source === constants.PAYPAL_INTEGRATION_NAME && isFunction(onCancelled)) {
    onCancelled();
  }
};

Client.prototype.teardown = function () {
  var self = this;

  this.destructor.teardown(function () {
    self.bus.teardown();
  });
};

module.exports = Client;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"151":151,"163":163,"217":217,"218":218,"219":219,"220":220,"221":221,"223":223,"224":224,"226":226,"234":234,"236":236,"81":81,"85":85,"95":95,"96":96}],215:[function(require,module,exports){
'use strict';

var Client = require(214);
var browser = require(234);
var constants = require(226);
var getLocale = require(228);
var util = require(236);
var VERSION = "2.17.2";
var braintreeUtil = require(81);

function create(configuration) {
  var client, onUnsupported;

  onUnsupported = configuration.merchantConfiguration.onUnsupported;

  if (typeof onUnsupported !== 'function') {
    onUnsupported = function (error) {
      try {
        console.log(error); // eslint-disable-line no-console
      } catch (e) {} // eslint-disable-line
    };
  }

  if (!configuration.gatewayConfiguration.paypalEnabled) {
    onUnsupported(new Error('PayPal is not enabled'));
    return null;
  }

  if (!browser.detectedPostMessage()) {
    onUnsupported(new Error('unsupported browser detected'));
    return null;
  }

  if (!configuration.merchantConfiguration.paypal.container && !configuration.merchantConfiguration.paypal.headless) {
    onUnsupported(new Error('Please supply a container for the PayPal button to be appended to'));
    return null;
  }

  if (!isBrowserSecure(configuration)) {
    onUnsupported(new Error('unsupported protocol detected'));
    return null;
  }

  if (isMisconfiguredUnvettedMerchant(configuration)) {
    onUnsupported(new Error('Unvetted merchant client token does not include a payee email'));
    return null;
  }

  if (util.isHermesConfiguration(configuration)) {
    if (!isHermesSupportedCountry(configuration.merchantConfiguration.paypal.locale)) {
      onUnsupported(new Error('This PayPal integration does not support this country'));
      return null;
    }
  }

  if (util.isOnetimeHermesConfiguration(configuration)) {
    if (!isHermesSupportedCurrency(configuration.merchantConfiguration.paypal.currency)) {
      onUnsupported(new Error('This PayPal integration does not support this currency'));
      return null;
    }

    if (!isValidAmount(configuration.merchantConfiguration.paypal.amount)) {
      onUnsupported(new Error('Amount must be a number'));
      return null;
    }
  }

  client = new Client(configuration);
  client.initialize();

  return client;
}

function isSupportedOption(option, supported) {
  var i;
  var supportedLength = supported.length;
  var isSupported = false;

  for (i = 0; i < supportedLength; i++) {
    if (option.toLowerCase() === supported[i].toLowerCase()) {
      isSupported = true;
    }
  }

  return isSupported;
}

function isHermesSupportedCurrency(currency) {
  return isSupportedOption(currency, constants.HERMES_SUPPORTED_CURRENCIES);
}

function isHermesSupportedCountry(locale) {
  return isSupportedOption(getLocale(locale).split('_')[1], constants.HERMES_SUPPORTED_COUNTRIES);
}

function isValidAmount(amount) {
  amount = parseFloat(amount);
  return typeof amount === 'number' && !isNaN(amount) && amount >= 0;
}

function isMisconfiguredUnvettedMerchant(configuration) {
  return configuration.gatewayConfiguration.paypal.unvettedMerchant && (!util.isHermesConfiguration(configuration) || !configuration.gatewayConfiguration.paypal.payeeEmail);
}

function isBrowserSecure(configuration) {
  if (configuration.gatewayConfiguration.paypal.allowHttp) { return true; }
  if (browser.isPopupSupported()) { return true; }
  if ('isMerchantPageHttps' in configuration) { return configuration.isMerchantPageHttps; }

  return braintreeUtil.isBrowserHttps();
}

module.exports = {
  create: create,
  VERSION: VERSION
};

},{"214":214,"226":226,"228":228,"234":234,"236":236,"81":81}],216:[function(require,module,exports){
module.exports={
  "en_us": {
    "cancel": "Cancel",
    "overlay_text": "Don't see the secure PayPal browser? We'll help you re-launch the window to complete your purchase.",
    "continue_link": "Continue"
  },
  "en_uk": {
    "cancel":  "Cancel",
    "overlay_text": "Don't see the secure PayPal browser? We'll help you re-launch the window to complete your purchase.",
    "continue_link": "Continue"
  },
  "en_au": {
    "cancel": "Cancel",
    "overlay_text": "Don't see the secure PayPal browser? We'll help you re-launch the window to complete your purchase.",
    "continue_link": "Continue"
  },
  "sv_se": {
    "cancel": "Avbryt",
    "overlay_text": "Ser du inte den säkra PayPal-webbl&auml;saren? Vi hj&auml;lper dig att starta om f&ouml;nstret f&ouml;r att slutf&ouml;ra k&ouml;pet.",
    "continue_link": "Forts&auml;tt"
  },
  "de_de": {
    "cancel": "Abbrechen",
    "overlay_text": "Sie sehen das sichere Browserfenster von PayPal nicht? Das Fenster wird neu ge&ouml;ffnet, damit Sie Ihren Einkauf abschlie&szlig;en k&ouml;nnen.",
    "continue_link": "Weiter"
  },
  "fr_fr": {
    "cancel": "Annuler",
    "overlay_text": "Vous ne voyez pas le navigateur s&eacute;curis&eacute; PayPal ? Nous allons vous aider &agrave; relancer la fen&ecirc;tre pour effectuer votre achat.",
    "continue_link": "Continuer"
  },
  "en_ca": {
    "cancel": "Cancel",
    "overlay_text": "Don't see the secure PayPal browser? We'll help you re-launch the window to complete your purchase.",
    "continue_link": "Continue"
  },
  "fr_ca": {
    "cancel": "Annuler",
    "overlay_text": "Vous ne voyez pas le navigateur s&eacute;curis&eacute; de PayPal ? Nous vous aiderons &agrave; relancer la fen&ecirc;tre afin d'effectuer votre achat.",
    "continue_link": "Continuer"
  },
  "es_es": {
    "cancel": "Cancelar",
    "overlay_text": "&iquest;No ves el s&iacute;mbolo de navegaci&oacute;n segura de PayPal? Te ayudaremos a abrir de nuevo la ventana para completar la compra.",
    "continue_link": "Continuar"
  },
  "es_xc": {
    "cancel": "Cancelar",
    "overlay_text": "&iquest;No ve el s&iacute;mbolo de navegaci&oacute;n segura de PayPal? Abriremos la ventana nuevamente para que pueda completar su compra.",
    "continue_link": "Continuar"
  },
  "fr_xc": {
    "cancel": "Annuler",
    "overlay_text": "Le navigateur s&eacute;curis&eacute; de PayPal n'appara&icirc;t pas ? Nous allons vous aider &agrave; rouvrir la fen&ecirc;tre pour finaliser votre achat.",
    "continue_link": "Continuer"
  },
  "nl_nl": {
    "cancel": "Annuleren",
    "overlay_text": "Ziet u de beveiligde PayPal-browser niet? We helpen u het venster opnieuw te openen zodat u uw aankoop kunt voltooien.",
    "continue_link": "Doorgaan"
  },
  "pt_pt": {
    "cancel": "Cancelar",
    "overlay_text": "N&atilde;o est&aacute; a ver a indica&ccedil;&atilde;o de liga&ccedil;&atilde;o segura PayPal no browser? Vamos ent&atilde;o voltar a abrir a janela para concluir a sua compra.",
    "continue_link": "Continuar"
  },
  "ru_ru": {
    "cancel": "Отмена",
    "overlay_text": "Не отображается безопасная страница PayPal в браузере? Мы поможем вам повторно загрузить окно, чтобы завершить покупку.",
    "continue_link": "Продолжить"
  },
  "da_dk": {
    "cancel": "Annuller",
    "overlay_text": "Kan du ikke se PayPals sikre browser? Vi hj&aelig;lper dig med at &aring;bne vinduet igen, s&aring; du kan betale.",
    "continue_link": "Forts&aelig;t"
  },
  "it_it": {
    "cancel": "Annulla",
    "overlay_text": "Non vedi il browser sicuro di PayPal? Ti aiuteremo a riavviare la pagina per completare l'acquisto.",
    "continue_link": "Continua"
  },
  "no_no": {
    "cancel": "Avbryt",
    "overlay_text": "Ser du ikke den sikre PayPal-nettleseren? Vi hjelper deg med &aring; &aring;pne vinduet p&aring; nytt s&aring; du kan fullf&oslash;re kj&oslash;pet.",
    "continue_link": "Fortsett"
  },
  "pl_pl": {
    "cancel": "Anuluj",
    "overlay_text": "Nie widzisz bezpiecznej przeglądarki PayPal? Pomożemy Ci ponownie uruchomić to okno w celu dokonania zakupu.",
    "continue_link": "Kontynuuj"
  },
  "tr_tr": {
    "cancel": "İptal",
    "overlay_text": "G&uuml;venli PayPal tarayıcısını g&ouml;rm&uuml;yor musunuz? Alışverişinizi tamamlamak i&ccedil;in pencereyi yeniden başlatmanıza yardımcı olacağız.",
    "continue_link": "Devam"
  },
  "zh_xc": {
    "cancel": "取消",
    "overlay_text": "没有看到安全的PayPal浏览器？我们将帮助您重启窗口以完成购物。",
    "continue_link": "继续"
  },
  "en_hk": {
    "cancel": "Cancel",
    "overlay_text": "Don't see the secure PayPal browser? We'll help you re-launch the window to complete your purchase.",
    "continue_link": "Continue"
  },
  "zh_hk": {
    "cancel": "取消",
    "overlay_text": "看不到安全的 PayPal 瀏覽器視窗？我們會助你重新啟動視窗，以完成購物。",
    "continue_link": "繼續"
  },
  "en_my": {
    "cancel": "Cancel",
    "overlay_text": "Don't see the secure PayPal browser? We'll help you re-launch the window to complete your purchase.",
    "continue_link": "Continue"
  },
  "en_nz": {
    "cancel": "Cancel",
    "overlay_text": "Don't see the secure PayPal browser? We'll help you re-launch the window to complete your purchase.",
    "continue_link": "Continue"
  },
  "en_sg": {
    "cancel": "Cancel",
    "overlay_text": "Don't see the secure PayPal browser? We'll help you re-launch the window to complete your purchase.",
    "continue_link": "Continue"
  }
}

},{}],217:[function(require,module,exports){
(function (global){
'use strict';

var bind = require(95);
var isFunction = require(151);
var browser = require(234);
var Destructor = require(85);
var Bus = require(163);
var constants = require(226);
var PopupView = require(225);
var ModalView = require(222);

function AppView(options) {
  var self = this;

  this.options = options || {};

  this.destructor = new Destructor();

  this.bus = new Bus({
    merchantUrl: global.location.href,
    channel: this.options.channel
  });

  this.destructor.registerFunctionForTeardown(function () {
    self.bus.teardown();
  });

  this._initialize();
}

AppView.prototype._initialize = function () {
  var self = this;

  if (browser.isPopupSupported()) {
    this.app = new PopupView({
      src: this._buildUrl(),
      isHermes: this.options.isHermes,
      channel: this.options.channel
    });
  } else {
    this.app = new ModalView({
      src: this._buildUrl(),
      isDropin: this.options.isDropin,
      isHermes: this.options.isHermes,
      insertFrameFunction: this.options.insertFrameFunction,
      channel: this.options.channel
    });
  }

  this.destructor.registerFunctionForTeardown(function () {
    self.app.teardown();
  });

  this.bus.on(constants.events.CLOSE_APP, bind(this.close, this));
  this.bus.on(constants.events.FOCUS_APP, bind(this.focus, this));
  this.bus.on(Bus.events.PAYMENT_METHOD_GENERATED, bind(this._handlePaymentMethodGenerated, this));
  this.bus.on(Bus.events.UI_POPUP_FORCE_CLOSE, bind(this._handleForceClose, this));
};

AppView.prototype._buildUrl = function () {
  var url = this.options.paypalAssetsUrl;

  url += '/pwpp/';
  url += constants.VERSION;
  url += '/html/braintree-frame.html';
  url += '#' + this.options.channel;

  return url;
};

AppView.prototype.open = function () {
  this.focus();
  this.app.open();
  this.poll();
};

AppView.prototype._handleForceClose = function (event) {
  if (event.target === constants.PAYPAL_INTEGRATION_NAME) {
    this.close();
  }
};

AppView.prototype.close = function () {
  this.app.close();
};

AppView.prototype.focus = function () {
  if (isFunction(this.app.focus)) {
    this.app.focus();
  }
};

AppView.prototype.isClosed = function () {
  return this.app.isClosed();
};

AppView.prototype.stopPolling = function () {
  clearInterval(this.pollId);
};

AppView.prototype.poll = function () {
  var self = this;

  this.pollId = setInterval(function () {
    if (self.isClosed()) {
      self._handleClosed();
    }
  }, 100);
};

AppView.prototype._handlePaymentMethodGenerated = function (bundle) {
  if (bundle.type === constants.NONCE_TYPE) {
    this.close();
  }
};

AppView.prototype._handleClosed = function () {
  this.stopPolling();

  this.close();

  if (browser.isPopupSupported()) {
    this.app.el = null;
  }
};

AppView.prototype.teardown = function () {
  this.destructor.teardown();
};

module.exports = AppView;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"151":151,"163":163,"222":222,"225":225,"226":226,"234":234,"85":85,"95":95}],218:[function(require,module,exports){
'use strict';

var constants = require(226);
var iframer = require(90);

function BridgeIframeView(options) {
  this.options = options || {};

  this.el = iframer({
    src: this._buildUrl(),
    name: constants.BRIDGE_FRAME_NAME,
    height: 1,
    width: 1,
    style: {
      position: 'static',
      top: 0,
      left: 0,
      bottom: 0,
      padding: 0,
      margin: 0,
      border: 0,
      outline: 'none',
      background: 'transparent'
    }
  });

  this.options.container.appendChild(this.el);
}

BridgeIframeView.prototype._buildUrl = function () {
  var url = this.options.paypalAssetsUrl;

  url += '/pwpp/';
  url += constants.VERSION;
  url += '/html/bridge-frame.html';
  url += '#' + this.options.channel;

  return url;
};

BridgeIframeView.prototype.teardown = function () {
  this.options.container.removeChild(this.el);
};

module.exports = BridgeIframeView;

},{"226":226,"90":90}],219:[function(require,module,exports){
(function (global){
'use strict';

var braintreeUtil = require(81);
var bind = require(95);
var Destructor = require(85);
var Bus = require(163);
var util = require(236);
var dom = require(235);
var constants = require(226);
var getLocalizationData = require(229);
var translations = require(216);

function LoggedInView(options) {
  var localizationData;

  this.options = options || {};
  this.wrapper = this.options.container || document.body;

  this.destructor = new Destructor();

  this.bus = new Bus({
    merchantUrl: global.location.href,
    channel: options.channel
  });

  localizationData = getLocalizationData(this.options.locale, translations);
  this.translation = localizationData.translation;

  this._initialize();
}

LoggedInView.prototype._initialize = function () {
  var self = this;
  var clickLogoutHandler = bind(this._handleClickLogout, this);

  this._createViewContainer();
  this._createPayPalName();
  this._createEmailNode();
  this._createLogoutNode();

  braintreeUtil.addEventListener(this.logoutNode, 'click', clickLogoutHandler);

  this.destructor.registerFunctionForTeardown(function () {
    braintreeUtil.removeEventListener(self.logoutNode, 'click', clickLogoutHandler);
  });

  this.bus.on(Bus.events.PAYMENT_METHOD_GENERATED, bind(this._handlePaymentMethodGenerated, this));
  this.bus.on(Bus.events.PAYMENT_METHOD_CANCELLED, bind(this._handlePaymentMethodCancelled, this));
};

LoggedInView.prototype._createViewContainer = function () {
  var cssStyles = [
    'display: none',
    'max-width: 500px',
    'overflow: hidden',
    'padding: 16px',
    'background-image: url(' + this.options.paypalAssetsUrl + '/pwpp/' + constants.VERSION + '/images/paypal-small.png)',
    'background-image: url(' + this.options.paypalAssetsUrl + '/pwpp/' + constants.VERSION + '/images/paypal-small.svg), none',
    'background-position: 20px 50%',
    'background-repeat: no-repeat',
    'background-size: 13px 15px',
    'border-top: 1px solid #d1d4d6',
    'border-bottom: 1px solid #d1d4d6'
  ].join(';');

  this.container = document.createElement('div');
  this.container.id = 'braintree-paypal-loggedin';
  this.container.style.cssText = cssStyles;

  this.wrapper.appendChild(this.container);
};

LoggedInView.prototype._createPayPalName = function () {
  var cssStyles = [
    'color: #283036',
    'font-size: 13px',
    'font-weight: 800',
    'font-family: "Helvetica Neue", Helvetica, Arial, sans-serif',
    'margin-left: 36px',
    '-webkit-font-smoothing: antialiased',
    '-moz-font-smoothing: antialiased',
    '-ms-font-smoothing: antialiased',
    'font-smoothing: antialiased'
  ].join(';');

  this.payPalName = document.createElement('span');
  this.payPalName.id = 'bt-pp-name';
  this.payPalName.innerHTML = 'PayPal';
  this.payPalName.style.cssText = cssStyles;

  return this.container.appendChild(this.payPalName);
};

LoggedInView.prototype._createEmailNode = function () {
  var cssStyles = [
    'color: #6e787f',
    'font-size: 13px',
    'font-family: "Helvetica Neue", Helvetica, Arial, sans-serif',
    'margin-left: 5px',
    '-webkit-font-smoothing: antialiased',
    '-moz-font-smoothing: antialiased',
    '-ms-font-smoothing: antialiased',
    'font-smoothing: antialiased'
  ].join(';');

  this.emailNode = document.createElement('span');
  this.emailNode.id = 'bt-pp-email';
  this.emailNode.style.cssText = cssStyles;

  this.container.appendChild(this.emailNode);
};

LoggedInView.prototype._createLogoutNode = function () {
  var cssStyles = [
    'color: #3d95ce',
    'font-size: 11px',
    'font-family: "Helvetica Neue", Helvetica, Arial, sans-serif',
    'line-height: 20px',
    'margin: 0 0 0 25px',
    'padding: 0',
    'background-color: transparent',
    'border: 0',
    'cursor: pointer',
    'text-decoration: underline',
    'float: right',
    '-webkit-font-smoothing: antialiased',
    '-moz-font-smoothing: antialiased',
    '-ms-font-smoothing: antialiased',
    'font-smoothing: antialiased'
  ].join(';');

  this.logoutNode = document.createElement('button');
  this.logoutNode.id = 'bt-pp-cancel';
  this.logoutNode.innerHTML = this.translation.cancel;
  this.logoutNode.style.cssText = cssStyles;

  this.container.appendChild(this.logoutNode);
};

LoggedInView.prototype.show = function (email) {
  this.container.style.display = 'block';
  dom.setTextContent(this.emailNode, email);
};

LoggedInView.prototype.hide = function () {
  this.container.style.display = 'none';
};

LoggedInView.prototype._handleClickLogout = function (event) {
  util.preventDefault(event);

  this.bus.emit(Bus.events.PAYMENT_METHOD_CANCELLED, {source: constants.PAYPAL_INTEGRATION_NAME});
};

LoggedInView.prototype._handlePaymentMethodGenerated = function (bundle) {
  var email;

  if (bundle.type === constants.NONCE_TYPE) {
    email = bundle && bundle.details && bundle.details.email ? bundle.details.email : '';
    this.show(email);
  }
};

LoggedInView.prototype._handlePaymentMethodCancelled = function (event) {
  if (event.source === constants.PAYPAL_INTEGRATION_NAME) {
    this.hide();
  }
};

LoggedInView.prototype.teardown = function () {
  this.wrapper.removeChild(this.container);
  this.destructor.teardown();
  this.bus.teardown();
};

module.exports = LoggedInView;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"163":163,"216":216,"226":226,"229":229,"235":235,"236":236,"81":81,"85":85,"95":95}],220:[function(require,module,exports){
(function (global){
'use strict';

var bind = require(95);
var Bus = require(163);
var constants = require(226);
var getLocale = require(228);

function LoggedOutView(options) {
  this.options = options;
  this.wrapper = this.options.container || document.body;

  this.bus = new Bus({
    merchantUrl: global.location.href,
    channel: options.channel
  });

  this._initialize();
}

LoggedOutView.prototype._initialize = function () {
  this.createViewContainer();

  if (this.options.enablePayPalButton) {
    this.createCheckoutWithPayPalButton();
  } else {
    this.createPayWithPayPalButton();
  }

  this.bus.on(Bus.events.PAYMENT_METHOD_GENERATED, bind(this._handlePaymentMethodGenerated, this));
  this.bus.on(Bus.events.PAYMENT_METHOD_CANCELLED, bind(this._handlePaymentMethodCancelled, this));
};

LoggedOutView.prototype.createViewContainer = function () {
  this.container = document.createElement('div');
  this.container.id = 'braintree-paypal-loggedout';

  this.wrapper.appendChild(this.container);
  this.loginNode = this.container;
};

LoggedOutView.prototype.createPayWithPayPalButton = function () {
  var element = document.createElement('a');
  var image = new Image();
  var imageCssText = [
    'max-width: 100%',
    'display: block',
    'width: 100%',
    'height: 100%',
    'outline: none',
    'border: 0'
  ].join(';');
  var cssStyles = [
    'display: block',
    'width: 115px',
    'height: 44px',
    'overflow: hidden'
  ].join(';');

  element.id = 'braintree-paypal-button';
  element.href = '#';
  element.style.cssText = cssStyles;

  image.src = this.options.paypalAssetsUrl + '/pwpp/' + constants.VERSION + '/images/pay-with-paypal.png';
  image.setAttribute('alt', 'Pay with PayPal');
  image.style.cssText = imageCssText;

  element.appendChild(image);
  this.container.appendChild(element);
};

LoggedOutView.prototype.createCheckoutWithPayPalButton = function () {
  var script = document.createElement('script');
  var attr;
  var scriptAttrs = {
    'data-merchant': 'merchant-id',
    'data-button': 'checkout',
    'data-type': 'button',
    'data-color': 'blue',
    'data-lc': getLocale(this.options.locale)
  };

  script.src = '//www.paypalobjects.com/api/button.js';
  script.async = true;

  for (attr in scriptAttrs) {
    if (scriptAttrs.hasOwnProperty(attr)) {
      script.setAttribute(attr, scriptAttrs[attr]);
    }
  }

  this.container.appendChild(script);
};

LoggedOutView.prototype.show = function () {
  this.container.style.display = 'block';
};

LoggedOutView.prototype.hide = function () {
  this.container.style.display = 'none';
};

LoggedOutView.prototype._handlePaymentMethodGenerated = function (bundle) {
  if (bundle.type === constants.NONCE_TYPE) {
    this.hide();
  }
};

LoggedOutView.prototype._handlePaymentMethodCancelled = function (event) {
  if (event.source === constants.PAYPAL_INTEGRATION_NAME) {
    this.show();
  }
};

LoggedOutView.prototype.teardown = function () {
  this.wrapper.removeChild(this.container);
  this.bus.teardown();
};

module.exports = LoggedOutView;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"163":163,"226":226,"228":228,"95":95}],221:[function(require,module,exports){
(function (global){
'use strict';

var Bus = require(163);
var bind = require(95);
var constants = require(226);

function MerchantPageView(options) {
  this.options = options;

  this.bus = new Bus({
    merchantUrl: global.location.href,
    channel: options.channel
  });

  this.bus.on(constants.events.UI_MODAL_DID_OPEN, bind(this.lockWindowSize, this));
  this.bus.on(constants.events.UI_MODAL_DID_CLOSE, bind(this.unlockWindowSize, this));
}

MerchantPageView.prototype.lockWindowSize = function () {
  this.defaultStyles = getMerchantPageDefaultStyles();
  document.documentElement.style.height = '100%';
  document.documentElement.style.overflow = 'hidden';
  document.body.style.height = '100%';
  document.body.style.overflow = 'hidden';
};

MerchantPageView.prototype.unlockWindowSize = function () {
  if (this.defaultStyles) {
    document.documentElement.style.height = this.defaultStyles.html.styles.height;
    document.documentElement.style.overflow = this.defaultStyles.html.styles.overflow;
    document.body.style.height = this.defaultStyles.body.styles.height;
    document.body.style.overflow = this.defaultStyles.body.styles.overflow;
    delete this.defaultStyles;
  }
};

MerchantPageView.prototype._handleUIModalDidOpen = function (event) {
  if (event.source === constants.PAYPAL_INTEGRATION_NAME) {
    this.lockWindowSize();
  }
};

MerchantPageView.prototype._handleUIModalDidClose = function (event) {
  if (event.source === constants.PAYPAL_INTEGRATION_NAME) {
    this.unlockWindowSize();
  }
};

MerchantPageView.prototype.teardown = function () {
  this.unlockWindowSize();
  this.bus.teardown();
};

function getStyles(element) {
  var computedStyles = window.getComputedStyle ? getComputedStyle(element) : element.currentStyle;

  return {
    overflow: computedStyles.overflow || '',
    height: element.style.height || ''
  };
}

function getMerchantPageDefaultStyles() {
  return {
    html: {
      node: document.documentElement,
      styles: getStyles(document.documentElement)
    },
    body: {
      node: document.body,
      styles: getStyles(document.body)
    }
  };
}

module.exports = MerchantPageView;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"163":163,"226":226,"95":95}],222:[function(require,module,exports){
(function (global){
'use strict';

var bind = require(95);
var isFunction = require(151);
var browser = require(234);
var constants = require(226);
var Bus = require(163);
var iframer = require(90);

function ModalView(options) {
  this.options = options || {};
  this.container = document.body;

  this.bus = new Bus({
    merchantUrl: global.location.href,
    channel: options.channel
  });

  if (this.options.isDropin) {
    this._open = this._openHeadless;
  } else {
    this._attachBusEvents();
  }

  this._initialize();
}

ModalView.prototype._attachBusEvents = function () {
  this.bus.on(constants.events.OPEN_MODAL, bind(this.open, this));
};

ModalView.prototype._initialize = function () {
  var name = this.options.isHermes ? constants.HERMES_FRAME_NAME : constants.FRAME_NAME;

  this.el = iframer({
    src: this.options.src,
    name: name,
    height: this.options.height || '100%',
    width: this.options.width || '100%',
    style: {
      position: browser.isMobile() ? 'absolute' : 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      padding: 0,
      margin: 0,
      border: 0,
      outline: 'none',
      zIndex: 20001,
      background: '#FFFFFF'
    }
  });
};

ModalView.prototype.isClosed = function () {
  return !this.container.contains(this.el);
};

ModalView.prototype._openHeadless = function () {
  this.bus.emit(constants.events.OPEN_MODAL);
};

ModalView.prototype._open = function () {
  if (isFunction(this.options.insertFrameFunction)) {
    this.options.insertFrameFunction(this.el.src);
  } else {
    this.container.appendChild(this.el);
  }

  this.bus.emit(constants.events.UI_MODAL_DID_OPEN, {source: constants.PAYPAL_INTEGRATION_NAME});
};

ModalView.prototype.open = function () {
  if (this.isClosed()) {
    this._open();
  }
};

ModalView.prototype.close = function () {
  if (!this.isClosed()) {
    this.container.removeChild(this.el);

    this.bus.emit(constants.events.UI_MODAL_DID_CLOSE, {source: constants.PAYPAL_INTEGRATION_NAME});
  }
};

ModalView.prototype.teardown = function () {
  this.close();
  this.bus.teardown();
};

module.exports = ModalView;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"151":151,"163":163,"226":226,"234":234,"90":90,"95":95}],223:[function(require,module,exports){
(function (global){
'use strict';

var braintreeUtil = require(81);
var bind = require(95);
var isFunction = require(151);
var Destructor = require(85);
var Bus = require(163);
var constants = require(226);
var getLocalizationData = require(229);
var translations = require(216);

function OverlayView(options) {
  var localizationData;

  this.options = options;
  this.spriteSrc = this.options.paypalAssetsUrl + '/pwpp/' + constants.VERSION + '/images/pp_overlay_sprite.png';

  this.bus = new Bus({
    merchantUrl: global.location.href,
    channel: options.channel
  });

  this.destructor = new Destructor();

  localizationData = getLocalizationData(this.options.locale, translations);
  this.translation = localizationData.translation;

  this._create();
  this._setupEvents();

  this.bus.on(Bus.events.UI_POPUP_DID_OPEN, bind(this._handleUIPopupDidOpen, this));
  this.bus.on(Bus.events.UI_POPUP_DID_CLOSE, bind(this._handleUIPopupDidClose, this));
}

OverlayView.prototype.open = function () {
  if (document.body.contains(this.el)) {
    return;
  }

  document.body.appendChild(this.el);
};

OverlayView.prototype.close = function () {
  if (document.body.contains(this.el)) {
    document.body.removeChild(this.el);
  }
};

OverlayView.prototype._handleUIPopupDidClose = function (event) {
  if (event.source === constants.PAYPAL_INTEGRATION_NAME) {
    this.close();
  }
};

OverlayView.prototype._handleUIPopupDidOpen = function (event) {
  if (event.source === constants.PAYPAL_INTEGRATION_NAME) {
    this.open();
  }
};

OverlayView.prototype._create = function () {
  this.el = document.createElement('div');

  this.el.className = 'bt-overlay';

  this._setStyles(this.el, [
    'z-index: 20001',
    'position: fixed',
    'top: 0',
    'left: 0',
    'height: 100%',
    'width: 100%',
    'text-align: center',
    'background: #000',
    'background: rgba(0,0,0,0.7)',
    '-ms-filter: "progid:DXImageTransform.Microsoft.Alpha(Opacity=52)"'
  ]);

  this.el.appendChild(this._createCloseIcon());
  this.el.appendChild(this._createMessage());
};

OverlayView.prototype._createCloseIcon = function () {
  this.closeIcon = document.createElement('div');

  this.closeIcon.className = 'bt-close-overlay';

  this._setStyles(this.closeIcon, [
    'position: absolute',
    'top: 10px',
    'right: 10px',
    'cursor: pointer',
    'background: url(' + this.spriteSrc + ') no-repeat 0 -67px',
    'height: 14px',
    'width: 14px'
  ]);

  return this.closeIcon;
};

OverlayView.prototype._createMessage = function () {
  var message = document.createElement('div');

  this._setStyles(message, [
    'position: relative',
    'top: 50%',
    'max-width: 350px',
    'font-family: "HelveticaNeue", "HelveticaNeue-Light", "Helvetica Neue Light", helvetica, arial, sans-serif',
    'font-size: 14px',
    'line-height: 20px',
    'margin: -70px auto 0'
  ]);

  message.appendChild(this._createLogo());
  message.appendChild(this._createExplanation());
  message.appendChild(this._createFocusLink());

  return message;
};

OverlayView.prototype._createExplanation = function () {
  this.explanation = document.createElement('div');

  this._setStyles(this.explanation, [
    'color: #FFF',
    'margin-bottom: 20px'
  ]);

  this.explanation.innerHTML = this.translation.overlay_text;

  return this.explanation;
};

OverlayView.prototype._createLogo = function () {
  var logo = document.createElement('div');

  this._setStyles(logo, [
    'background: url(' + this.spriteSrc + ') no-repeat 0 0',
    'width: 94px',
    'height: 25px',
    'margin: 0 auto 26px auto'
  ]);

  return logo;
};

OverlayView.prototype._createFocusLink = function () {
  this.focusLink = document.createElement('a');

  this._setStyles(this.focusLink, [
    'color: #009be1',
    'cursor: pointer'
  ]);

  this.focusLink.innerHTML = this.translation.continue_link;

  return this.focusLink;
};

OverlayView.prototype._setStyles = function (el, styles) {
  var cssStyles = styles.join(';');

  el.style.cssText = cssStyles;
};

OverlayView.prototype._setupEvents = function () {
  var self = this;
  var clickCloseHandler = bind(this._handleClose, this);
  var clickFocusHandler = bind(this._handleFocus, this);

  braintreeUtil.addEventListener(this.closeIcon, 'click', clickCloseHandler);
  braintreeUtil.addEventListener(this.focusLink, 'click', clickFocusHandler);

  this.destructor.registerFunctionForTeardown(function () {
    braintreeUtil.removeEventListener(self.closeIcon, 'click', clickCloseHandler);
    braintreeUtil.removeEventListener(self.focusLink, 'click', clickFocusHandler);
  });
};

OverlayView.prototype._handleClose = function (event) {
  event.preventDefault();
  this.close();

  if (isFunction(this.options.onClose)) {
    this.options.onClose();
  }
};

OverlayView.prototype._handleFocus = function (event) {
  event.preventDefault();

  if (isFunction(this.options.onFocus)) {
    this.options.onFocus();
  }
};

OverlayView.prototype.teardown = function () {
  this.bus.teardown();
  this.destructor.teardown();
  this.close();
};

module.exports = OverlayView;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"151":151,"163":163,"216":216,"226":226,"229":229,"81":81,"85":85,"95":95}],224:[function(require,module,exports){
(function (global){
'use strict';

var braintreeUtil = require(81);
var bind = require(95);
var isFunction = require(151);
var Destructor = require(85);
var Bus = require(163);
var constants = require(226);

function PaymentMethodNonceInputFieldView(options) {
  this.options = options || {};
  this.container = this.options.container || document.body;
  this.el = this.options.el;

  this.destructor = new Destructor();

  this.bus = new Bus({
    merchantUrl: global.location.href,
    channel: options.channel
  });

  this._initialize();
}

PaymentMethodNonceInputFieldView.prototype._initialize = function () {
  var self = this;

  if (!isFunction(this.el)) {
    if (this.el != null) {
      this.el = braintreeUtil.normalizeElement(this.el);

      this.destructor.registerFunctionForTeardown(function () {
        self.clear();
      });
    } else {
      this.el = this.create();
    }
  }

  this.bus.on(Bus.events.PAYMENT_METHOD_GENERATED, bind(this._handlePaymentMethodGenerated, this));
  this.bus.on(Bus.events.PAYMENT_METHOD_CANCELLED, bind(this._handlePaymentMethodCancelled, this));
};

PaymentMethodNonceInputFieldView.prototype.create = function () {
  var self = this;
  var input = document.createElement('input');

  input.name = 'payment_method_nonce';
  input.type = 'hidden';
  this.container.appendChild(input);

  this.destructor.registerFunctionForTeardown(function () {
    self.container.removeChild(input);
  });

  return input;
};

PaymentMethodNonceInputFieldView.prototype.value = function (value) {
  if (isFunction(this.el)) {
    this.el(value);
  } else {
    this.el.value = value;
  }
};

PaymentMethodNonceInputFieldView.prototype.clear = function () {
  this.value('');
};

PaymentMethodNonceInputFieldView.prototype._handlePaymentMethodCancelled = function (event) {
  if (event.source === constants.PAYPAL_INTEGRATION_NAME) {
    this.clear();
  }
};

PaymentMethodNonceInputFieldView.prototype._handlePaymentMethodGenerated = function (bundle) {
  if (bundle.type === constants.NONCE_TYPE) {
    this.value(bundle.nonce);
  }
};

PaymentMethodNonceInputFieldView.prototype.teardown = function () {
  this.destructor.teardown();
  this.bus.teardown();
};

module.exports = PaymentMethodNonceInputFieldView;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"151":151,"163":163,"226":226,"81":81,"85":85,"95":95}],225:[function(require,module,exports){
(function (global){
'use strict';

var constants = require(226);
var Bus = require(163);
var browser = require(230);

function PopupView(options) {
  this.options = options;

  this.bus = new Bus({
    merchantUrl: global.location.href,
    channel: this.options.channel
  });

  if (options.isHermes) {
    this.name = constants.HERMES_POPUP_NAME;
    this.popupHeight = constants.HERMES_POPUP_HEIGHT;
    this.popupWidth = constants.HERMES_POPUP_WIDTH;
  } else {
    this.name = constants.POPUP_NAME;
    this.popupHeight = constants.POPUP_HEIGHT;
    this.popupWidth = constants.POPUP_WIDTH;
  }
}

PopupView.prototype._getPopupOptions = function () {
  return [
    'height=' + this.popupHeight,
    'width=' + this.popupWidth,
    'top=' + this._getTopPosition(),
    'left=' + this._getLeftPosition(),
    constants.POPUP_OPTIONS
  ].join(',');
};

PopupView.prototype._centerPosition = function (windowMetric, popupMetric, offset) {
  return (windowMetric - popupMetric) / 2 + offset;
};

PopupView.prototype._getTopPosition = function () {
  var windowHeight = window.outerHeight || document.documentElement.clientHeight;
  var windowTop = typeof window.screenY === 'undefined' ? window.screenTop : window.screenY;

  return this._centerPosition(windowHeight, this.popupHeight, windowTop);
};

PopupView.prototype._getLeftPosition = function () {
  var windowWidth = window.outerWidth || document.documentElement.clientWidth;
  var windowLeft = typeof window.screenX === 'undefined' ? window.screenLeft : window.screenX;

  return this._centerPosition(windowWidth, this.popupWidth, windowLeft);
};

PopupView.prototype.isClosed = function () {
  if (this.el) {
    return this.el.closed;
  }
};

PopupView.prototype.open = function () {
  if (!this.el) {
    this.el = window.open(this.options.src, this.name, this._getPopupOptions());
    this.focus();

    this.bus.emit(Bus.events.UI_POPUP_DID_OPEN, {source: constants.PAYPAL_INTEGRATION_NAME});
  }
};

PopupView.prototype.close = function () {
  if (this.el) {
    if (browser.isIE8() && !this.isClosed() || !browser.isIE8()) {
      this.el.close();
    }

    this.bus.emit(Bus.events.UI_POPUP_DID_CLOSE, {source: constants.PAYPAL_INTEGRATION_NAME});
  }
};

PopupView.prototype.focus = function () {
  if (this.el) {
    this.el.focus();
  }
};

PopupView.prototype.teardown = function () {
  this.close();
  this.bus.teardown();
};

module.exports = PopupView;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"163":163,"226":226,"230":230}],226:[function(require,module,exports){
'use strict';

var i;
var version = "2.17.2";
var events = [
  'GET_CLIENT_TOKEN',
  'GET_CLIENT_OPTIONS',
  'OPEN_MODAL',
  'CLOSE_APP',
  'FOCUS_APP',
  'UI_MODAL_DID_OPEN',
  'UI_MODAL_DID_CLOSE'
];

var configurationTypes = {
  LEGACY_ONETIME: 'Legacy Onetime',
  HERMES_ONETIME: 'Hermes Onetime',
  LEGACY_FUTURE_PAYMENTS: 'Legacy Future Payments',
  HERMES_BILLING_AGREEMENTS: 'Hermes Billing Agreements'
};

exports.VERSION = version;
exports.POPUP_NAME = 'braintree_paypal_popup';
exports.HERMES_POPUP_NAME = 'PPFrameRedirect';
exports.FRAME_NAME = 'braintree-paypal-frame';
exports.HERMES_FRAME_NAME = 'PPFrameRedirect';
exports.POPUP_PATH = '/pwpp/' + version + '/html/braintree-frame.html';
exports.POPUP_OPTIONS = 'resizable,scrollbars';
exports.POPUP_HEIGHT = 470;
exports.POPUP_WIDTH = 410;
exports.HERMES_POPUP_HEIGHT = 535;
exports.HERMES_POPUP_WIDTH = 450;
exports.BRIDGE_FRAME_NAME = 'bt-proxy-frame';
exports.HERMES_SUPPORTED_CURRENCIES = ['USD', 'GBP', 'EUR', 'AUD', 'CAD', 'DKK', 'NOK', 'PLN', 'SEK', 'CHF', 'TRY', 'BRL'];
exports.HERMES_SUPPORTED_COUNTRIES = ['US', 'GB', 'AU', 'CA', 'ES', 'FR', 'DE', 'IT', 'NL', 'NO', 'PL', 'CH', 'TR', 'DK', 'BE', 'AT'];
exports.NONCE_TYPE = 'PayPalAccount';
exports.PAYPAL_INTEGRATION_NAME = 'PayPal';
exports.ILLEGAL_XHR_ERROR = 'Illegal XHR request attempted';
exports.CONFIGURATION_TYPES = configurationTypes;
exports.events = {};

for (i = 0; i < events.length; i++) {
  exports.events[events[i]] = 'paypal:' + events[i];
}

},{}],227:[function(require,module,exports){
'use strict';

module.exports = {
  us: 'en_us',
  gb: 'en_uk',
  uk: 'en_uk',
  de: 'de_de',
  fr: 'fr_fr',
  it: 'it_it',
  es: 'es_es',
  ca: 'en_ca',
  au: 'en_au',
  at: 'de_de',
  be: 'en_us',
  ch: 'de_de',
  dk: 'da_dk',
  nl: 'nl_nl',
  no: 'no_no',
  pl: 'pl_pl',
  se: 'sv_se',
  tr: 'tr_tr',
  bg: 'en_us',
  cy: 'en_us',
  hr: 'en_us',
  is: 'en_us',
  kh: 'en_us',
  mt: 'en_us',
  my: 'en_us',
  ru: 'ru_ru'
};

},{}],228:[function(require,module,exports){
'use strict';

var countryCodeLookupTable = require(227);

function isFormatted(code) {
  return code.indexOf('_') !== -1 && code.length === 5;
}

function queryTable(code) {
  var key, match;

  for (key in countryCodeLookupTable) {
    if (countryCodeLookupTable.hasOwnProperty(key)) {
      if (key === code) {
        match = countryCodeLookupTable[key];
      } else if (countryCodeLookupTable[key] === code) {
        match = countryCodeLookupTable[key];
      }
    }
  }

  return match;
}

function getLocale(code) {
  var match, pieces;

  code = code ? code.toLowerCase() : 'us';
  code = code.replace(/-/g, '_');

  match = isFormatted(code) ? code : queryTable(code);

  if (match) {
    pieces = match.split('_');
    return [pieces[0], pieces[1].toUpperCase()].join('_');
  }

  return 'en_US';
}

module.exports = getLocale;

},{"227":227}],229:[function(require,module,exports){
'use strict';

var countryCodeLookupTable = require(227);
var getLocale = require(228);

function getCountry(code) {
  var country = code ? code.toLowerCase().replace(/-/g, '_') : 'us';

  if (country.indexOf('_') !== -1) {
    country = country.split('_')[1];
  }

  country = countryCodeLookupTable[country] ? country : 'us';

  if (country === 'uk') {
    country = 'gb';
  }

  return country;
}

function getTranslation(locale, translations) {
  locale = locale.toLowerCase();

  return translations[locale] ? translations[locale] : translations.en_us;
}

function getLocalizationData(code, translations) {
  var country = getCountry(code);
  var locale = getLocale(code);
  var translation = getTranslation(locale, translations);

  return {
    country: country,
    locale: locale,
    translation: translation
  };
}

module.exports = getLocalizationData;

},{"227":227,"228":228}],230:[function(require,module,exports){
'use strict';

var userAgent = require(233);
var platform = require(232);

function isAndroid() {
  return userAgent.matchUserAgent('Android') && !isChrome();
}

function isChrome() {
  return userAgent.matchUserAgent('Chrome') || userAgent.matchUserAgent('CriOS');
}

function isFirefox() {
  return userAgent.matchUserAgent('Firefox');
}

function isIE() {
  return userAgent.matchUserAgent('Trident') || userAgent.matchUserAgent('MSIE');
}

function isIE8() {
  return userAgent.matchUserAgent(/MSIE 8\.0/);
}

function isOpera() {
  return userAgent.matchUserAgent('Opera') || userAgent.matchUserAgent('OPR');
}

function isOperaMini() {
  return isOpera() && Object.prototype.toString.call(window.operamini) === '[object OperaMini]';
}

function isSafari() {
  return userAgent.matchUserAgent('Safari') && !isChrome() && !isAndroid();
}

function isIosWebView() {
  return platform.isIos() && !isChrome() && !isSafari();
}

function isAndroidWebView() {
  var androidWebviewRegExp = /Version\/[\w\.]+ Chrome\/[\w\.]+ Mobile/;

  return platform.isAndroid() && userAgent.matchUserAgent(androidWebviewRegExp);
}

module.exports = {
  isAndroid: isAndroid,
  isChrome: isChrome,
  isFirefox: isFirefox,
  isIE: isIE,
  isIE8: isIE8,
  isOpera: isOpera,
  isOperaMini: isOperaMini,
  isSafari: isSafari,
  isIosWebView: isIosWebView,
  isAndroidWebView: isAndroidWebView
};

},{"232":232,"233":233}],231:[function(require,module,exports){
'use strict';

var userAgent = require(233);
var platform = require(232);

function isMobile() {
  return !isTablet() &&
      (platform.isAndroid() || platform.isIpod() || platform.isIphone() ||
       userAgent.matchUserAgent('IEMobile'));
}

function isTablet() {
  return platform.isIpad() || platform.isAndroid() &&
      !userAgent.matchUserAgent('Mobile');
}

function isDesktop() {
  return !isMobile() && !isTablet();
}

module.exports = {
  isMobile: isMobile,
  isTablet: isTablet,
  isDesktop: isDesktop
};

},{"232":232,"233":233}],232:[function(require,module,exports){
'use strict';

var userAgent = require(233);

function isAndroid() {
  return userAgent.matchUserAgent('Android');
}

function isIpad() {
  return userAgent.matchUserAgent('iPad');
}

function isIpod() {
  return userAgent.matchUserAgent('iPod');
}

function isIphone() {
  return userAgent.matchUserAgent('iPhone') && !isIpod();
}

function isIos() {
  return isIpad() || isIpod() || isIphone();
}

module.exports = {
  isAndroid: isAndroid,
  isIpad: isIpad,
  isIpod: isIpod,
  isIphone: isIphone,
  isIos: isIos
};

},{"233":233}],233:[function(require,module,exports){
'use strict';

var nativeUserAgent = window.navigator.userAgent;

function getNativeUserAgent() {
  return nativeUserAgent;
}

function matchUserAgent(pattern) {
  var userAgent = exports.getNativeUserAgent();
  var matches = userAgent.match(pattern);

  if (matches) {
    return true;
  }
  return false;
}

exports.getNativeUserAgent = getNativeUserAgent;
exports.matchUserAgent = matchUserAgent;

},{}],234:[function(require,module,exports){
'use strict';
/* globals ActiveXObject */

var browser = require(230);
var device = require(231);
var platform = require(232);
var userAgent = require(233);

var uaString = window.navigator.userAgent;
var mobileRe = /[Mm]obi|tablet|iOS|Android|IEMobile|Windows\sPhone/;

function isMobile() {
  return isMobileDevice() && window.outerWidth < 600;
}

function isMobileDevice() {
  return mobileRe.test(uaString);
}

function detectedPostMessage() {
  return Boolean(window.postMessage);
}

function isPopupSupported() {
  if (browser.isOperaMini()) {
    return false;
  }

  if (device.isDesktop()) {
    return true;
  }

  if (device.isMobile() || device.isTablet()) {
    if (browser.isIE()) {
      return false;
    }

    if (platform.isAndroid()) {
      if (browser.isAndroidWebView()) {
        return false;
      }

      return true;
    }

    if (platform.isIos()) {
      // Chrome, Safari Versions 8.0-8.1, or WebViews
      if (browser.isChrome()) {
        return false;
      }

      if (browser.isSafari() && userAgent.matchUserAgent(/OS (?:8_1|8_0|8)(?!_\d)/i)) {
        return false;
      }

      if (browser.isIosWebView()) {
        return false;
      }

      return true;
    }
  }

  return false;
}

function isOverlaySupported() {
  if (browser.isIE8()) {
    return false;
  }

  try {
    return window.self === window.top;
  } catch (e) {
    return false;
  }
}

function isBridgeIframeRequired() {
  return browser.isIE();
}

function isMetroBrowser() {
  var supported = null;
  var errorName = '';

  try {
    new ActiveXObject(''); // eslint-disable-line
  } catch (e) {
    errorName = e.name;
  }

  try {
    supported = Boolean(new ActiveXObject('htmlfile'));
  } catch (e) {
    supported = false;
  }

  if (errorName !== 'ReferenceError' && supported === false) {
    supported = false;
  } else {
    supported = true;
  }
  return !supported;
}

module.exports = {
  isMobile: isMobile,
  isMobileDevice: isMobileDevice,
  detectedPostMessage: detectedPostMessage,
  isPopupSupported: isPopupSupported,
  isOverlaySupported: isOverlaySupported,
  isBridgeIframeRequired: isBridgeIframeRequired,
  isMetroBrowser: isMetroBrowser
};

},{"230":230,"231":231,"232":232,"233":233}],235:[function(require,module,exports){
'use strict';

function setTextContent(element, content) {
  var property = 'innerText';

  if (document && document.body) {
    if ('textContent' in document.body) {
      property = 'textContent';
    }
  }
  element[property] = content;
}

module.exports = {
  setTextContent: setTextContent
};

},{}],236:[function(require,module,exports){
'use strict';

var constants = require(226);

var trim = typeof String.prototype.trim === 'function' ?
  function (str) { return str.trim(); } :
  function (str) { return str.replace(/^\s+|\s+$/, ''); };

var b2a = typeof window.btoa === 'function' ?
  function (str) { return window.btoa(str); } :
  function (str) {
    var keyStr =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    var output = '';
    var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
    var i = 0;

    while (i < str.length) {
      chr1 = str.charCodeAt(i++);
      chr2 = str.charCodeAt(i++);
      chr3 = str.charCodeAt(i++);

      enc1 = chr1 >> 2;
      enc2 = (chr1 & 3) << 4 | chr2 >> 4;
      enc3 = (chr2 & 15) << 2 | chr3 >> 6;
      enc4 = chr3 & 63;

      if (isNaN(chr2)) {
        enc3 = enc4 = 64;
      } else if (isNaN(chr3)) {
        enc4 = 64;
      }

      output = output + keyStr.charAt(enc1) + keyStr.charAt(enc2) +
          keyStr.charAt(enc3) + keyStr.charAt(enc4);
    }

    return output;
  };

function generateUid() {
  var i, r;
  var uid = '';

  for (i = 0; i < 32; i++) {
    r = Math.floor(Math.random() * 16);
    uid += r.toString(16);
  }

  return uid;
}

function castToBoolean(value) {
  return /^(true|1)$/i.test(value);
}

function htmlEscape(str) {
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\"/g, '&quot;')
            .replace(/\'/g, '&apos;');
}

function parseUrlParams(url) {
  var arr, i, n, parts, index, key, value, encodedValue;
  var startIndex = url.indexOf('?');
  var values = {};

  if (startIndex >= 0) {
    url = url.substr(startIndex + 1);
  }

  if (url.length === 0) {
    return null;
  }

  arr = url.split('&');
  for (i = 0, n = arr.length; i < n; i++) {
    parts = arr[i];
    index = parts.indexOf('=');
    key = parts.substr(0, index);
    encodedValue = parts.substr(index + 1);
    value = decodeURIComponent(encodedValue);
    value = value.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    if (value === 'false') {
      value = false;
    }
    if (value == null || value === 'true') {
      value = true;
    }
    values[key] = value;
  }

  return values;
}

function preventDefault(event) {
  if (event.preventDefault) {
    event.preventDefault();
  } else {
    event.returnValue = false;
  }
}

function getOnetimeConfigurationType(configuration) {
  var configurationType;

  if (Boolean(configuration.merchantConfiguration.paypal.amount) && Boolean(configuration.merchantConfiguration.paypal.currency)) {
    configurationType = constants.CONFIGURATION_TYPES.HERMES_ONETIME;
  } else {
    configurationType = constants.CONFIGURATION_TYPES.LEGACY_ONETIME;
  }

  return configurationType;
}

function getFuturePaymentsConfigurationType(configuration) {
  var configurationType;

  if (Boolean(configuration.gatewayConfiguration.paypal.billingAgreementsEnabled)) {
    configurationType = constants.CONFIGURATION_TYPES.HERMES_BILLING_AGREEMENTS;
  } else {
    configurationType = constants.CONFIGURATION_TYPES.LEGACY_FUTURE_PAYMENTS;
  }

  return configurationType;
}

function getConfigurationType(configuration) {
  var configurationType;

  if (Boolean(configuration.merchantConfiguration.paypal.singleUse)) {
    configurationType = getOnetimeConfigurationType(configuration);
  } else {
    configurationType = getFuturePaymentsConfigurationType(configuration);
  }

  return configurationType;
}

function isHermesConfiguration(configuration) {
  var configurationType = getConfigurationType(configuration);

  return configurationType === constants.CONFIGURATION_TYPES.HERMES_ONETIME || configurationType === constants.CONFIGURATION_TYPES.HERMES_BILLING_AGREEMENTS;
}

function isOnetimeHermesConfiguration(configuration) {
  var configurationType = getConfigurationType(configuration);

  return configurationType === constants.CONFIGURATION_TYPES.HERMES_ONETIME;
}

module.exports = {
  trim: trim,
  btoa: b2a,
  generateUid: generateUid,
  castToBoolean: castToBoolean,
  htmlEscape: htmlEscape,
  parseUrlParams: parseUrlParams,
  preventDefault: preventDefault,
  isHermesConfiguration: isHermesConfiguration,
  isOnetimeHermesConfiguration: isOnetimeHermesConfiguration,
  getConfigurationType: getConfigurationType
};

},{"226":226}]},{},[179])(179)
});