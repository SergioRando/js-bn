/**
 * Original work Copyright (c) 2003-2005 Tom Wu <tjw@cs.Stanford.EDU>
 * Modified work Copyright (c) 2020 Sergei Sovik <sergeisovik@yahoo.com>
 */

"use strict";

// All Rights Reserved.
// See "LICENSE" for details.

import { SecureRandom } from "./rng.js"

// Basic JavaScript BN library - subset useful for RSA encryption.

// JavaScript engine analysis
let canary = 0xdeadbeefcafe;
let j_lm = ((canary&0xffffff)==0xefcafe);

// Digit conversions
let BI_RM = "0123456789abcdefghijklmnopqrstuvwxyz";
/** @type {Array<number>} */ let BI_RC = /** @type {Array<number>} */ (new (typeof Int32Array !== 'undefined' ? Int32Array : Array)([
	-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,	-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,	-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
	0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
	-1, -1, -1, -1, -1, -1, -1,
	10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35,
	-1, -1, -1, -1, -1, -1,
	10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35
]));

/*
	BI_RC = [];
	let rr
	let vv;
	rr = "0".charCodeAt(0);
	for(vv = 0; vv <= 9; ++vv) BI_RC[rr++] = vv;
	rr = "a".charCodeAt(0);
	for(vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;
	rr = "A".charCodeAt(0);
	for(vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;
*/

/**
 * @param {number} n
 * @returns {string}
 */
export function int2char(n) { return BI_RM.charAt(n); }

/**
 * @param {string} s 
 * @param {number} i 
 * @returns {number}
 */
export function intAt(s,i) {
	let c = BI_RC[s.charCodeAt(i)];
	return (c==null)?-1:c;
}

/**
 * returns bit length of the integer x
 * @param {number} x
 * @returns {number}
 */
export function nbits(x) {
	let r = 1, t;
	if((t=x>>>16) != 0) { x = t; r += 16; }
	if((t=x>>8) != 0) { x = t; r += 8; }
	if((t=x>>4) != 0) { x = t; r += 4; }
	if((t=x>>2) != 0) { x = t; r += 2; }
	if((t=x>>1) != 0) { x = t; r += 1; }
	return r;
}

/**
 * @param {number} x 
 * @param {number} y 
 * @returns {number}
 */
function op_and(x,y) { return x&y; }

/**
 * @param {number} x 
 * @param {number} y 
 * @returns {number}
 */
function op_or(x,y) { return x|y; }

/**
 * @param {number} x 
 * @param {number} y 
 * @returns {number}
 */
function op_xor(x,y) { return x^y; }

/**
 * @param {number} x 
 * @param {number} y 
 * @returns {number}
 */
function op_andnot(x,y) { return x&~y; }

/**
 * return index of lowest 1-bit in x, x < 2^31
 * @param {number} x 
 * @returns {number}
 */
function lbit(x) {
	if(x == 0) return -1;
	let r = 0;
	if((x&0xffff) == 0) { x >>= 16; r += 16; }
	if((x&0xff) == 0) { x >>= 8; r += 8; }
	if((x&0xf) == 0) { x >>= 4; r += 4; }
	if((x&3) == 0) { x >>= 2; r += 2; }
	if((x&1) == 0) ++r;
	return r;
}

/**
 * return number of 1 bits in x
 * @param {number} x 
 * @returns {number}
 */
function cbit(x) {
	let r = 0;
	while(x != 0) { x &= x-1; ++r; }
	return r;
}

const lowprimes = /** @type {Array<number>} */ (new (typeof Int32Array !== 'undefined' ? Int32Array : Array)([
	2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97,101,103,107,109,113,127,131,137,139,149,151,157,163,167,173,179,181,191,193,197,199,211,223,227,229,233,239,241,251,257,263,269,271,277,281,283,293,307,311,313,317,331,337,347,349,353,359,367,373,379,383,389,397,401,409,419,421,431,433,439,443,449,457,461,463,467,479,487,491,499,503,509,521,523,541,547,557,563,569,571,577,587,593,599,601,607,613,617,619,631,641,643,647,653,659,661,673,677,683,691,701,709,719,727,733,739,743,751,757,761,769,773,787,797,809,811,821,823,827,829,839,853,857,859,863,877,881,883,887,907,911,919,929,937,941,947,953,967,971,977,983,991,997
]));

const lplim = (1<<26)/lowprimes[lowprimes.length-1];

/**
 * am: Compute w_j += (x*this_i), propagate carries,
 * c is initial carry, returns final carry.
 * c < 3*dvalue, x < 2*dvalue, this_i < dvalue
 * We need to select the fastest one that works in this environment.

 * am1: use a single mult and divide to get the high bits,
 * max digit bits should be 26 because
 * max internal value = 2*dvalue^2-2*dvalue (< 2^53)
 * 
 * @param {BigInteger} r
 * @param {number} i 
 * @param {number} x 
 * @param {BigInteger} w 
 * @param {number} j 
 * @param {number} c 
 * @param {number} n 
 * @returns {number}
 */
function am1(r,i,x,w,j,c,n) {
	while(--n >= 0) {
		let v = x*r.a[i++]+w.a[j]+c;
		c = Math.floor(v/0x4000000);
		w.a[j++] = v&0x3ffffff;
	}
	return c;
}

/**
 * am2 avoids a big mult-and-extract completely.
 * Max digit bits should be <= 30 because we do bitwise ops
 * on values up to 2*hdvalue^2-hdvalue-1 (< 2^31)
 *
 * @param {BigInteger} r
 * @param {number} i 
 * @param {number} x 
 * @param {BigInteger} w 
 * @param {number} j 
 * @param {number} c 
 * @param {number} n 
 * @returns {number}
 */
function am2(r,i,x,w,j,c,n) {
	let xl = x&0x7fff, xh = x>>15;
	while(--n >= 0) {
		let l = r.a[i]&0x7fff;
		let h = r.a[i++]>>15;
		let m = xh*l+h*xl;
		l = xl*l+((m&0x7fff)<<15)+w.a[j]+(c&0x3fffffff);
		c = (l>>>30)+(m>>>15)+xh*h+(c>>>30);
		w.a[j++] = l&0x3fffffff;
	}
	return c;
}

/**
 * Alternately, set max digit bits to 28 since some
 * browsers slow down when dealing with 32-bit numbers.
 * 
 * @param {BigInteger} r
 * @param {number} i 
 * @param {number} x 
 * @param {BigInteger} w 
 * @param {number} j 
 * @param {number} c 
 * @param {number} n 
 * @returns {number}
 */
function am3(r,i,x,w,j,c,n) {
	let xl = x&0x3fff, xh = x>>14;
	while(--n >= 0) {
		let l = r.a[i]&0x3fff;
		let h = r.a[i++]>>14;
		let m = xh*l+h*xl;
		l = xl*l+((m&0x3fff)<<14)+w.a[j]+c;
		c = (l>>28)+(m>>14)+xh*h;
		w.a[j++] = l&0xfffffff;
	}
	return c;
}

// Bits per digit
/** @type {number} */
const dbits = ((j_lm && (platform['navigator'] !== undefined && navigator.appName == "Microsoft Internet Explorer")) ? 30 : ((j_lm && (platform['navigator'] !== undefined && navigator.appName != "Netscape")) ? 26 : 28));

// Mozilla/Netscape seems to prefer am3
const am = (dbits === 30 ? am2 : (dbits === 26 ? am1 : am3));

const DB = dbits;
const DM = ((1<<dbits)-1);
const DV = (1<<dbits);

const BI_FP = 52;
const FV = Math.pow(2,BI_FP);
const F1 = BI_FP-dbits;
const F2 = 2*dbits-BI_FP;

export class BigInteger {
	/**
	 * @param {string | number | Array<number> | null} a 
	 * @param {(SecureRandom | number)=} b 
	 * @param {SecureRandom=} c 
	 */
	constructor(a,b,c) {
		/** @type {Array<number>} */ this.a = [];

		/** @type {number} */ this.t;
		/** @type {number} */ this.s;

		if (a != null)
			if("number" == typeof a) {
				if (b != null) {
					this.fromNumber(a,b,c);
				} else {
					this.fromString("" + a, 256);
				}
			}
			else if (b == null && "string" != typeof a) this.fromString(a, 256);
			else this.fromString(a, b | 0);
	}

	/**
	 * @protected copy this to r
	 * @param {BigInteger} r 
	 */
	copyTo(r) {
		for(let i = this.t-1; i >= 0; --i) r.a[i] = this.a[i];
		r.t = this.t;
		r.s = this.s;
	}

	/**
	 * @protected set from integer value x, -DV <= x < DV
	 * @param {number} x 
	 */
	fromInt(x) {
		this.t = 1;
		this.s = (x<0)?-1:0;
		if(x > 0) this.a[0] = x;
		else if(x < -1) this.a[0] = x+DV;
		else this.t = 0;
	}

	/**
	 * @protected set from string and radix
	 * @param {string | Array<number>} s 
	 * @param {number} b 
	 */
	fromString(s,b) {
		/** @type {number} */ let k;
		if(b == 16) k = 4;
		else if(b == 8) k = 3;
		else if(b == 256) k = 8; // byte array
		else if(b == 2) k = 1;
		else if(b == 32) k = 5;
		else if(b == 4) k = 2;
		else { this.fromRadix(s,b); return; }
		this.t = 0;
		this.s = 0;
		let i = s.length, mi = false, sh = 0;
		if ('string' == typeof s) {
			while(--i >= 0) {
				let x = (k==8)?s[i]&0xff:intAt(s,i);
				if(x < 0) {
					if(s.charAt(i) == "-") mi = true;
					continue;
				}
				mi = false;
				if(sh == 0)
					this.a[this.t++] = x;
				else if(sh+k > DB) {
					this.a[this.t-1] |= (x&((1<<(DB-sh))-1))<<sh;
					this.a[this.t++] = (x>>(DB-sh));
				}
				else
					this.a[this.t-1] |= x<<sh;
				sh += k;
				if(sh >= DB) sh -= DB;
			}
		} else {
			while(--i >= 0) {
				let x = s[i];
				if(sh == 0)
					this.a[this.t++] = x;
				else if(sh+k > DB) {
					this.a[this.t-1] |= (x&((1<<(DB-sh))-1))<<sh;
					this.a[this.t++] = (x>>(DB-sh));
				}
				else
					this.a[this.t-1] |= x<<sh;
				sh += k;
				if(sh >= DB) sh -= DB;
			}
		}
		if(k == 8 && (s[0]&0x80) != 0) {
			this.s = -1;
			if(sh > 0) this.a[this.t-1] |= ((1<<(DB-sh))-1)<<sh;
		}
		this.clamp();
		if(mi) BigInteger.ZERO().subTo(this,this);
	}

	/**
	 * @protected clamp off excess high words
	 */
	clamp() {
		let c = this.s&DM;
		while(this.t > 0 && this.a[this.t-1] == c) --this.t;
	}

	/**
	 * @override
	 * @param {number=} b
	 * @returns {string} string representation in given radix
	 */
	toString(b) {
		if(this.s < 0) return "-"+this.negate().toString(b);
		/** @type {number} */ let k;
		if(b == 16) k = 4;
		else if(b == 8) k = 3;
		else if(b == 2) k = 1;
		else if(b == 32) k = 5;
		else if(b == 4) k = 2;
		else return this.toRadix(b);
		let km = (1<<k)-1, d, m = false, r = "", i = this.t;
		let p = DB-(i*DB)%k;
		if(i-- > 0) {
			if(p < DB && (d = this.a[i]>>p) > 0) { m = true; r = int2char(d); }
			while(i >= 0) {
				if(p < k) {
					d = (this.a[i]&((1<<p)-1))<<(k-p);
					d |= this.a[--i]>>(p+=DB-k);
				}
				else {
					d = (this.a[i]>>(p-=k))&km;
					if(p <= 0) { p += DB; --i; }
				}
				if(d > 0) m = true;
				if(m) r += int2char(d);
			}
		}
		return m?r:"0";
	}

	/**
	 * @returns {BigInteger} -this
	 */
	negate() { let r = nbi(); BigInteger.ZERO().subTo(this,r); return r; }

	/**
	 * @returns {BigInteger} |this|
	 */
	abs() { return (this.s<0)?this.negate():this; }

	/**
	 * @param {BigInteger} a
	 * @returns {number} + if this > a, - if this < a, 0 if equal
	 */
	compareTo(a) {
		let r = this.s-a.s;
		if(r != 0) return r;
		let i = this.t;
		r = i-a.t;
		if(r != 0) return (this.s<0)?-r:r;
		while(--i >= 0) if((r=this.a[i]-a.a[i]) != 0) return r;
		return 0;
	}

	/**
	 * @returns {number} the number of bits in "this"
	 */
	bitLength() {
		if(this.t <= 0) return 0;
		return DB*(this.t-1)+nbits(this.a[this.t-1]^(this.s&DM));
	}

	/**
	 * @protected r = this << n*DB
	 * @param {number} n 
	 * @param {BigInteger} r 
	 */
	dlShiftTo(n,r) {
		/** @type {number} */ let i;
		for(i = this.t-1; i >= 0; --i) r.a[i+n] = this.a[i];
		for(i = n-1; i >= 0; --i) r.a[i] = 0;
		r.t = this.t+n;
		r.s = this.s;
	}

	/**
	 * @protected r = this >> n*DB
	 * @param {number} n 
	 * @param {BigInteger} r 
	 */
	drShiftTo(n,r) {
		for(let i = n; i < this.t; ++i) r.a[i-n] = this.a[i];
		r.t = Math.max(this.t-n,0);
		r.s = this.s;
	}

	/**
	 * @protected r = this << n
	 * @param {number} n 
	 * @param {BigInteger} r 
	 */
	lShiftTo(n,r) {
		let bs = n%DB;
		let cbs = DB-bs;
		let bm = (1<<cbs)-1;
		let ds = Math.floor(n/DB), c = (this.s<<bs)&DM, i;
		for(i = this.t-1; i >= 0; --i) {
			r.a[i+ds+1] = (this.a[i]>>cbs)|c;
			c = (this.a[i]&bm)<<bs;
		}
		for(i = ds-1; i >= 0; --i) r.a[i] = 0;
		r.a[ds] = c;
		r.t = this.t+ds+1;
		r.s = this.s;
		r.clamp();
	}

	/**
	 * @protected r = this >> n
	 * @param {number} n 
	 * @param {BigInteger} r 
	 */
	rShiftTo(n,r) {
		r.s = this.s;
		let ds = Math.floor(n/DB);
		if(ds >= this.t) { r.t = 0; return; }
		let bs = n%DB;
		let cbs = DB-bs;
		let bm = (1<<bs)-1;
		r.a[0] = this.a[ds]>>bs;
		for(let i = ds+1; i < this.t; ++i) {
			r.a[i-ds-1] |= (this.a[i]&bm)<<cbs;
			r.a[i-ds] = this.a[i]>>bs;
		}
		if(bs > 0) r.a[this.t-ds-1] |= (this.s&bm)<<cbs;
		r.t = this.t-ds;
		r.clamp();
	}

	/**
	 * @protected r = this - a
	 * @param {BigInteger} a 
	 * @param {BigInteger} r 
	 */
	subTo(a,r) {
		let i = 0, c = 0, m = Math.min(a.t,this.t);
		while(i < m) {
			c += this.a[i]-a.a[i];
			r.a[i++] = c&DM;
			c >>= DB;
		}
		if(a.t < this.t) {
			c -= a.s;
			while(i < this.t) {
				c += this.a[i];
				r.a[i++] = c&DM;
				c >>= DB;
			}
			c += this.s;
		}
		else {
			c += this.s;
			while(i < a.t) {
				c -= a.a[i];
				r.a[i++] = c&DM;
				c >>= DB;
			}
			c -= a.s;
		}
		r.s = (c<0)?-1:0;
		if(c < -1) r.a[i++] = DV+c;
		else if(c > 0) r.a[i++] = c;
		r.t = i;
		r.clamp();
	}

	/**
	 * @protected r = this * a, r != this,a (HAC 14.12)
	 * "this" should be the larger one if appropriate.
	 * @param {BigInteger} a 
	 * @param {BigInteger} r 
	 */
	multiplyTo(a,r) {
		let x = this.abs(), y = a.abs();
		let i = x.t;
		r.t = i+y.t;
		while(--i >= 0) r.a[i] = 0;
		for(i = 0; i < y.t; ++i) r.a[i+x.t] = am(x,0,y.a[i],r,i,0,x.t);
		r.s = 0;
		r.clamp();
		if(this.s != a.s) BigInteger.ZERO().subTo(r,r);
	}

	/**
	 * @protected r = this^2, r != this (HAC 14.16)
	 * @param {BigInteger} r 
	 */
	squareTo(r) {
		let x = this.abs();
		let i = r.t = 2*x.t;
		while(--i >= 0) r.a[i] = 0;
		for(i = 0; i < x.t-1; ++i) {
			let c = am(x,i,x.a[i],r,2*i,0,1);
			if((r.a[i+x.t]+=am(x,i+1,2*x.a[i],r,2*i+1,c,x.t-i-1)) >= DV) {
				r.a[i+x.t] -= DV;
				r.a[i+x.t+1] = 1;
			}
		}
		if(r.t > 0) r.a[r.t-1] += am(x,i,x.a[i],r,2*i,0,1);
		r.s = 0;
		r.clamp();
	}

	/**
	 * @protected divide this by m, quotient and remainder to q, r (HAC 14.20)
	 * r != q, this != m.	q or r may be null.
	 * @param {BigInteger} m 
	 * @param {BigInteger | null} q 
	 * @param {BigInteger | null} r 
	 */
	divRemTo(m,q,r) {
		let pm = m.abs();
		if(pm.t <= 0) return;
		let pt = this.abs();
		if(pt.t < pm.t) {
			if(q != null) q.fromInt(0);
			if(r != null) this.copyTo(r);
			return;
		}
		if(r == null) r = nbi();
		let y = nbi(), ts = this.s, ms = m.s;
		let nsh = DB-nbits(pm.a[pm.t-1]);	// normalize modulus
		if(nsh > 0) { pm.lShiftTo(nsh,y); pt.lShiftTo(nsh,r); }
		else { pm.copyTo(y); pt.copyTo(r); }
		let ys = y.t;
		let y0 = y.a[ys-1];
		if(y0 == 0) return;
		let yt = y0*(1<<F1)+((ys>1)?y.a[ys-2]>>F2:0);
		let d1 = FV/yt, d2 = (1<<F1)/yt, e = 1<<F2;
		let i = r.t, j = i-ys, t = (q==null)?nbi():q;
		y.dlShiftTo(j,t);
		if(r.compareTo(t) >= 0) {
			r.a[r.t++] = 1;
			r.subTo(t,r);
		}
		BigInteger.ONE().dlShiftTo(ys,t);
		t.subTo(y,y);	// "negative" y so we can replace sub with am later
		while(y.t < ys) y.a[y.t++] = 0;
		while(--j >= 0) {
			// Estimate quotient digit
			let qd = (r.a[--i]==y0)?DM:Math.floor(r.a[i]*d1+(r.a[i-1]+e)*d2);
			if((r.a[i]+=am(y,0,qd,r,j,0,ys)) < qd) {	// Try it out
				y.dlShiftTo(j,t);
				r.subTo(t,r);
				while(r.a[i] < --qd) r.subTo(t,r);
			}
		}
		if(q != null) {
			r.drShiftTo(ys,q);
			if(ts != ms) BigInteger.ZERO().subTo(q,q);
		}
		r.t = ys;
		r.clamp();
		if(nsh > 0) r.rShiftTo(nsh,r);	// Denormalize remainder
		if(ts < 0) BigInteger.ZERO().subTo(r,r);
	}

	/**
	 * this mod a
	 * @param {BigInteger} a 
	 * @returns {BigInteger}
	 */
	mod(a) {
		let r = nbi();
		this.abs().divRemTo(a,null,r);
		if(this.s < 0 && r.compareTo(BigInteger.ZERO()) > 0) a.subTo(r,r);
		return r;
	}

	/**
	 * @protected
	 * justification:
	 *				 xy == 1 (mod m)
	 *				 xy =	1+km
	 *	 xy(2-xy) = (1+km)(1-km)
	 * x[y(2-xy)] = 1-k^2m^2
	 * x[y(2-xy)] == 1 (mod m^2)
	 * if y is 1/x mod m, then y(2-xy) is 1/x mod m^2
	 * should reduce x and y(2-xy) by m^2 at each step to keep size bounded.
	 * JS multiply "overflows" differently from C/C++, so care is needed here.
	 * @returns {number} "-1/this % 2^DB"; useful for Mont. reduction
	 */
	invDigit() {
		if(this.t < 1) return 0;
		let x = this.a[0];
		if((x&1) == 0) return 0;
		let y = x&3;		// y == 1/x mod 2^2
		y = (y*(2-(x&0xf)*y))&0xf;	// y == 1/x mod 2^4
		y = (y*(2-(x&0xff)*y))&0xff;	// y == 1/x mod 2^8
		y = (y*(2-(((x&0xffff)*y)&0xffff)))&0xffff;	// y == 1/x mod 2^16
		// last step - calculate inverse mod DV directly;
		// assumes 16 < DB <= 32 and assumes ability to handle 48-bit ints
		y = (y*(2-x*y%DV))%DV;		// y == 1/x mod 2^dbits
		// we really want the negative inverse, and -DV < y < DV
		return (y>0)?DV-y:-y;
	}

	/**
	 * @returns {boolean} true iff this is even
	 */
	isEven() { return ((this.t>0)?(this.a[0]&1):this.s) == 0; }

	/**
	 * @protected this^e, e < 2^32, doing sqr and mul with "r" (HAC 14.79)
	 * @param {number} e 
	 * @param {Reduction} z 
	 * @returns {BigInteger}
	 */
	exp(e,z) {
		if(e > 0xffffffff || e < 1) return BigInteger.ONE();
		let r = nbi(), r2 = nbi(), g = z.convert(this), i = nbits(e)-1;
		g.copyTo(r);
		while(--i >= 0) {
			z.sqrTo(r,r2);
			if((e&(1<<i)) > 0) z.mulTo(r2,g,r);
			else { let t = r; r = r2; r2 = t; }
		}
		return z.revert(r);
	}

	/**
	 * @param {number} e 
	 * @param {BigInteger} m 
	 * @returns {BigInteger} this^e % m, 0 <= e < 2^32
	 */
	modPowInt(e,m) {
		/** @type {Reduction} */ let z;
		if(e < 256 || m.isEven()) z = new Classic(m); else z = new Montgomery(m);
		return this.exp(e,z);
	}

	/**
	 * @returns {BigInteger}
	 */
	clone() { let r = nbi(); this.copyTo(r); return r; }

	/**
	 * @returns {number} value as integer
	 */
	intValue() {
		if(this.s < 0) {
			if(this.t == 1) return this.a[0]-DV;
			else if(this.t == 0) return -1;
		}
		else if(this.t == 1) return this.a[0];
		else if(this.t == 0) return 0;
		// assumes 16 < DB < 32
		return ((this.a[1]&((1<<(32-DB))-1))<<DB)|this.a[0];
	}

	/**
	 * @returns {number} value as byte
	 */
	byteValue() { return (this.t==0)?this.s:(this.a[0]<<24)>>24; }

	/**
	 * @returns {number} value as short (assumes DB>=16)
	 */
	shortValue() { return (this.t==0)?this.s:(this.a[0]<<16)>>16; }

	/**
	 * @protected
	 * @param {number} r 
	 * @return {number} x s.t. r^x < DV
	 */
	chunkSize(r) { return Math.floor(Math.LN2*DB/Math.log(r)); }

	/**
	 * @returns {number} 0 if this == 0, 1 if this > 0
	 */
	signum() {
		if(this.s < 0) return -1;
		else if(this.t <= 0 || (this.t == 1 && this.a[0] <= 0)) return 0;
		else return 1;
	}

	/**
	 * @protected convert to radix string
	 * @param {number=} b 
	 * @return {string}
	 */
	toRadix(b) {
		if(b == null) b = 10;
		if(this.signum() == 0 || b < 2 || b > 36) return "0";
		let cs = this.chunkSize(b);
		let a = Math.pow(b,cs);
		let d = nbv(a), y = nbi(), z = nbi(), r = "";
		this.divRemTo(d,y,z);
		while(y.signum() > 0) {
			r = (a+z.intValue()).toString(b).substr(1) + r;
			y.divRemTo(d,y,z);
		}
		return z.intValue().toString(b) + r;
	}

	/**
	 * @protected convert from radix string
	 * @param {string | Array<number>} s 
	 * @param {number=} b 
	 */
	fromRadix(s,b) {
		this.fromInt(0);
		if(b == null) b = 10;
		let cs = this.chunkSize(b);
		let d = Math.pow(b,cs), mi = false, j = 0, w = 0;
		if ('string' == typeof s) {
			for(let i = 0; i < s.length; ++i) {
				let x = intAt(s,i);
				if(x < 0) {
					if(s.charAt(i) == "-" && this.signum() == 0) mi = true;
					continue;
				}
				w = b*w+x;
				if(++j >= cs) {
					this.dMultiply(d);
					this.dAddOffset(w,0);
					j = 0;
					w = 0;
				}
			}
		} else {
			for(let i = 0; i < s.length; ++i) {
				let x = s[i];
				w = b*w+x;
				if(++j >= cs) {
					this.dMultiply(d);
					this.dAddOffset(w,0);
					j = 0;
					w = 0;
				}
			}
		}
		if(j > 0) {
			this.dMultiply(Math.pow(b,j));
			this.dAddOffset(w,0);
		}
		if(mi) BigInteger.ZERO().subTo(this,this);
	}

	/**
	 * @protected alternate constructor
	 * @param {number} a
	 * @param {number | SecureRandom} b
	 * @param {SecureRandom=} c
	 */
	fromNumber(a,b,c) {
		if("number" == typeof b) {
			// new BigInteger(int,int,RNG)
			if(a < 2) this.fromInt(1);
			else if (c !== undefined) {
				this.fromNumber(a,c);
				if(!this.testBit(a-1))	// force MSB set
					this.bitwiseTo(BigInteger.ONE().shiftLeft(a-1),op_or,this);
				if(this.isEven()) this.dAddOffset(1,0); // force odd
				while(!this.isProbablePrime(b)) {
					this.dAddOffset(2,0);
					if(this.bitLength() > a) this.subTo(BigInteger.ONE().shiftLeft(a-1),this);
				}
			}
		}
		else {
			// new BigInteger(int,RNG)
			let x = new Array(), t = a&7;
			x.length = (a>>3)+1;
			b.nextBytes(x);
			if(t > 0) x[0] &= ((1<<t)-1); else x[0] = 0;
			this.fromString(x,256);
		}
	}

	/**
	 * @returns {Array<number>} convert to bigendian byte array
	 */
	toByteArray() {
		let i = this.t;
		/** @type {Array<number>} */ let r = new Array();
		r[0] = this.s;
		let p = DB-(i*DB)%8, d, k = 0;
		if(i-- > 0) {
			if(p < DB && (d = this.a[i]>>p) != (this.s&DM)>>p)
				r[k++] = d|(this.s<<(DB-p));
			while(i >= 0) {
				if(p < 8) {
					d = (this.a[i]&((1<<p)-1))<<(8-p);
					d |= this.a[--i]>>(p+=DB-8);
				}
				else {
					d = (this.a[i]>>(p-=8))&0xff;
					if(p <= 0) { p += DB; --i; }
				}
				if((d&0x80) != 0) d |= -256;
				if(k == 0 && (this.s&0x80) != (d&0x80)) ++k;
				if(k > 0 || d != this.s) r[k++] = d;
			}
		}
		return r;
	}

	/**
	 * @param {BigInteger} a 
	 * @returns {boolean}
	 */
	equals(a) { return(this.compareTo(a)==0); }

	/**
	 * @param {BigInteger} a 
	 * @returns {BigInteger}
	 */
	min(a) { return(this.compareTo(a)<0)?this:a; }

	/**
	 * @param {BigInteger} a 
	 * @returns {BigInteger}
	 */
	max(a) { return(this.compareTo(a)>0)?this:a; }

	// @protected r = this op a (bitwise)
	/**
	 * @param {BigInteger} a 
	 * @param {function(number,number):number} op 
	 * @param {BigInteger} r 
	 */
	bitwiseTo(a,op,r) {
		/** @type {number} */ let i;
		/** @type {number} */ let f;
		let m = Math.min(a.t,this.t);
		for(i = 0; i < m; ++i) r.a[i] = op(this.a[i],a.a[i]);
		if(a.t < this.t) {
			f = a.s&DM;
			for(i = m; i < this.t; ++i) r.a[i] = op(this.a[i],f);
			r.t = this.t;
		}
		else {
			f = this.s&DM;
			for(i = m; i < a.t; ++i) r.a[i] = op(f,a.a[i]);
			r.t = a.t;
		}
		r.s = op(this.s,a.s);
		r.clamp();
	}

	/**
	 * @param {BigInteger} a 
	 * @returns {BigInteger} this & a
	 */
	and(a) { let r = nbi(); this.bitwiseTo(a,op_and,r); return r; }

	/**
	 * @param {BigInteger} a 
	 * @returns {BigInteger} this | a
	 */
	or(a) { let r = nbi(); this.bitwiseTo(a,op_or,r); return r; }

	/**
	 * @param {BigInteger} a 
	 * @returns {BigInteger} this ^ a
	 */
	xor(a) { let r = nbi(); this.bitwiseTo(a,op_xor,r); return r; }

	/**
	 * @param {BigInteger} a 
	 * @returns {BigInteger} this & ~a
	 */
	andNot(a) { let r = nbi(); this.bitwiseTo(a,op_andnot,r); return r; }

	/**
	 * @returns {BigInteger} ~this
	 */
	not() {
		let r = nbi();
		for(let i = 0; i < this.t; ++i) r.a[i] = DM&~this.a[i];
		r.t = this.t;
		r.s = ~this.s;
		return r;
	}

	/**
	 * @param {number} n 
	 * @returns {BigInteger} this << n
	 */
	shiftLeft(n) {
		let r = nbi();
		if(n < 0) this.rShiftTo(-n,r); else this.lShiftTo(n,r);
		return r;
	}

	/**
	 * @param {number} n 
	 * @returns {BigInteger} this >> n
	 */
	shiftRight(n) {
		let r = nbi();
		if(n < 0) this.lShiftTo(-n,r); else this.rShiftTo(n,r);
		return r;
	}

	/**
	 * @returns {number} index of lowest 1-bit (or -1 if none)
	 */
	getLowestSetBit() {
		for(let i = 0; i < this.t; ++i)
			if(this.a[i] != 0) return i*DB+lbit(this.a[i]);
		if(this.s < 0) return this.t*DB;
		return -1;
	}

	/**
	 * @returns {number} number of set bits
	 */
	bitCount() {
		let r = 0, x = this.s&DM;
		for(let i = 0; i < this.t; ++i) r += cbit(this.a[i]^x);
		return r;
	}

	/**
	 * @param {number} n 
	 * @returns {boolean} true iff nth bit is set
	 */
	testBit(n) {
		let j = Math.floor(n/DB);
		if(j >= this.t) return(this.s!=0);
		return((this.a[j]&(1<<(n%DB)))!=0);
	}

	/**
	 * @protected
	 * @param {number} n 
	 * @param {function(number,number):number} op 
	 * @returns {BigInteger} this op (1<<n)
	 */
	changeBit(n,op) {
		let r = BigInteger.ONE().shiftLeft(n);
		this.bitwiseTo(r,op,r);
		return r;
	}

	/**
	 * @param {number} n 
	 * @returns {BigInteger} this | (1<<n)
	 */
	setBit(n) { return this.changeBit(n,op_or); }

	/**
	 * @param {number} n 
	 * @returns {BigInteger} this & ~(1<<n)
	 */
	clearBit(n) { return this.changeBit(n,op_andnot); }

	/**
	 * @param {number} n 
	 * @returns {BigInteger} this ^ (1<<n)
	 */
	flipBit(n) { return this.changeBit(n,op_xor); }

	/**
	 * @protected r = this + a
	 * @param {BigInteger} a 
	 * @param {BigInteger} r 
	 */
	addTo(a,r) {
		let i = 0, c = 0, m = Math.min(a.t,this.t);
		while(i < m) {
			c += this.a[i]+a.a[i];
			r.a[i++] = c&DM;
			c >>= DB;
		}
		if(a.t < this.t) {
			c += a.s;
			while(i < this.t) {
				c += this.a[i];
				r.a[i++] = c&DM;
				c >>= DB;
			}
			c += this.s;
		}
		else {
			c += this.s;
			while(i < a.t) {
				c += a.a[i];
				r.a[i++] = c&DM;
				c >>= DB;
			}
			c += a.s;
		}
		r.s = (c<0)?-1:0;
		if(c > 0) r.a[i++] = c;
		else if(c < -1) r.a[i++] = DV+c;
		r.t = i;
		r.clamp();
	}

	/**
	 * @param {BigInteger} a 
	 * @returns {BigInteger} this + a
	 */
	add(a) { let r = nbi(); this.addTo(a,r); return r; }

	/**
	 * @param {BigInteger} a 
	 * @returns {BigInteger} this - a
	 */
	subtract(a) { let r = nbi(); this.subTo(a,r); return r; }

	/**
	 * @param {BigInteger} a 
	 * @returns {BigInteger} this * a
	 */
	multiply(a) { let r = nbi(); this.multiplyTo(a,r); return r; }

	/**
	 * @returns {BigInteger} this ^ 2
	 */
	square() { let r = nbi(); this.squareTo(r); return r; }

	/**
	 * @param {BigInteger} a 
	 * @returns {BigInteger} this / a
	 */
	divide(a) { let r = nbi(); this.divRemTo(a,r,null); return r; }

	/**
	 * @param {BigInteger} a 
	 * @returns {BigInteger} this % a
	 */
	remainder(a) { let r = nbi(); this.divRemTo(a,null,r); return r; }

	/**
	 * @param {BigInteger} a 
	 * @returns {Array<BigInteger>} [this/a,this%a]
	 */
	divideAndRemainder(a) {
		let q = nbi(), r = nbi();
		this.divRemTo(a,q,r);
		return new Array(q,r);
	}

	/**
	 * @protected this *= n, this >= 0, 1 < n < DV
	 * @param {number} n 
	 */
	dMultiply(n) {
		this.a[this.t] = am(this,0,n-1,this,0,0,this.t);
		++this.t;
		this.clamp();
	}

	//
	/**
	 * @protected this += n << w words, this >= 0
	 * @param {number} n 
	 * @param {number} w 
	 */
	dAddOffset(n,w) {
		if(n == 0) return;
		while(this.t <= w) this.a[this.t++] = 0;
		this.a[w] += n;
		while(this.a[w] >= DV) {
			this.a[w] -= DV;
			if(++w >= this.t) this.a[this.t++] = 0;
			++this.a[w];
		}
	}

	/**
	 * @param {number} e 
	 * @returns {BigInteger} this^e
	 */
	pow(e) { return this.exp(e,new NullExp()); }

	/**
	 * @protected r = lower n words of "this * a", a.t <= n
	 * "this" should be the larger one if appropriate.
	 * @param {BigInteger} a 
	 * @param {number} n 
	 * @param {BigInteger} r 
	 */
	multiplyLowerTo(a,n,r) {
		let i = Math.min(this.t+a.t,n);
		r.s = 0; // assumes a,this >= 0
		r.t = i;
		while(i > 0) r.a[--i] = 0;
		let j;
		for(j = r.t-this.t; i < j; ++i) r.a[i+this.t] = am(this,0,a.a[i],r,i,0,this.t);
		for(j = Math.min(a.t,n); i < j; ++i) am(this,0,a.a[i],r,i,0,n-i);
		r.clamp();
	}

	/**
	 * @protected r = "this * a" without lower n words, n > 0
	 * "this" should be the larger one if appropriate.
	 * @param {BigInteger} a 
	 * @param {number} n 
	 * @param {BigInteger} r 
	 */
	multiplyUpperTo(a,n,r) {
		--n;
		let i = r.t = this.t+a.t-n;
		r.s = 0; // assumes a,this >= 0
		while(--i >= 0) r.a[i] = 0;
		for(i = Math.max(n-this.t,0); i < a.t; ++i)
			r.a[this.t+i-n] = am(this,n-i,a.a[i],r,0,0,this.t+i-n);
		r.clamp();
		r.drShiftTo(1,r);
	}

	/**
	 * @param {BigInteger} e 
	 * @param {BigInteger} m 
	 * @returns {BigInteger} this^e % m (HAC 14.85)
	 */
	modPow(e,m) {
		let i = e.bitLength(), k, r = nbv(1), z;
		if(i <= 0) return r;
		else if(i < 18) k = 1;
		else if(i < 48) k = 3;
		else if(i < 144) k = 4;
		else if(i < 768) k = 5;
		else k = 6;
		if(i < 8)
			z = new Classic(m);
		else if(m.isEven())
			z = new Barrett(m);
		else
			z = new Montgomery(m);

		// precomputation
		/** @type {Array<BigInteger>} */ let g = new Array();
		let n = 3, k1 = k-1, km = (1<<k)-1;
		g[1] = z.convert(this);
		if(k > 1) {
			let g2 = nbi();
			z.sqrTo(g[1],g2);
			while(n <= km) {
				g[n] = nbi();
				z.mulTo(g2,g[n-2],g[n]);
				n += 2;
			}
		}

		let j = e.t-1, w, is1 = true, r2 = nbi(), t;
		i = nbits(e.a[j])-1;
		while(j >= 0) {
			if(i >= k1) w = (e.a[j]>>(i-k1))&km;
			else {
				w = (e.a[j]&((1<<(i+1))-1))<<(k1-i);
				if(j > 0) w |= e.a[j-1]>>(DB+i-k1);
			}

			n = k;
			while((w&1) == 0) { w >>= 1; --n; }
			if((i -= n) < 0) { i += DB; --j; }
			if(is1) {	// ret == 1, don't bother squaring or multiplying it
				g[w].copyTo(r);
				is1 = false;
			}
			else {
				while(n > 1) { z.sqrTo(r,r2); z.sqrTo(r2,r); n -= 2; }
				if(n > 0) z.sqrTo(r,r2); else { t = r; r = r2; r2 = t; }
				z.mulTo(r2,g[w],r);
			}

			while(j >= 0 && (e.a[j]&(1<<i)) == 0) {
				z.sqrTo(r,r2); t = r; r = r2; r2 = t;
				if(--i < 0) { i = DB-1; --j; }
			}
		}
		return z.revert(r);
	}

	/**
	 * @param {BigInteger} a 
	 * @returns {BigInteger} gcd(this,a) (HAC 14.54)
	 */
	gcd(a) {
		let x = (this.s<0)?this.negate():this.clone();
		let y = (a.s<0)?a.negate():a.clone();
		if(x.compareTo(y) < 0) { let t = x; x = y; y = t; }
		let i = x.getLowestSetBit(), g = y.getLowestSetBit();
		if(g < 0) return x;
		if(i < g) g = i;
		if(g > 0) {
			x.rShiftTo(g,x);
			y.rShiftTo(g,y);
		}
		while(x.signum() > 0) {
			if((i = x.getLowestSetBit()) > 0) x.rShiftTo(i,x);
			if((i = y.getLowestSetBit()) > 0) y.rShiftTo(i,y);
			if(x.compareTo(y) >= 0) {
				x.subTo(y,x);
				x.rShiftTo(1,x);
			}
			else {
				y.subTo(x,y);
				y.rShiftTo(1,y);
			}
		}
		if(g > 0) y.lShiftTo(g,y);
		return y;
	}

	/**
	 * @protected
	 * @param {number} n 
	 * @returns {number} this % n, n < 2^26
	 */
	modInt(n) {
		if(n <= 0) return 0;
		let d = DV%n, r = (this.s<0)?n-1:0;
		if(this.t > 0)
			if(d == 0) r = this.a[0]%n;
			else for(let i = this.t-1; i >= 0; --i) r = (d*r+this.a[i])%n;
		return r;
	}

	/**
	 * @param {BigInteger} m 
	 * @returns {BigInteger} 1/this % m (HAC 14.61)
	 */
	modInverse(m) {
		let ac = m.isEven();
		if((this.isEven() && ac) || m.signum() == 0) return BigInteger.ZERO();
		let u = m.clone(), v = this.clone();
		let a = nbv(1), b = nbv(0), c = nbv(0), d = nbv(1);
		while(u.signum() != 0) {
			while(u.isEven()) {
				u.rShiftTo(1,u);
				if(ac) {
					if(!a.isEven() || !b.isEven()) { a.addTo(this,a); b.subTo(m,b); }
					a.rShiftTo(1,a);
				}
				else if(!b.isEven()) b.subTo(m,b);
				b.rShiftTo(1,b);
			}
			while(v.isEven()) {
				v.rShiftTo(1,v);
				if(ac) {
					if(!c.isEven() || !d.isEven()) { c.addTo(this,c); d.subTo(m,d); }
					c.rShiftTo(1,c);
				}
				else if(!d.isEven()) d.subTo(m,d);
				d.rShiftTo(1,d);
			}
			if(u.compareTo(v) >= 0) {
				u.subTo(v,u);
				if(ac) a.subTo(c,a);
				b.subTo(d,b);
			}
			else {
				v.subTo(u,v);
				if(ac) c.subTo(a,c);
				d.subTo(b,d);
			}
		}
		if(v.compareTo(BigInteger.ONE()) != 0) return BigInteger.ZERO();
		if(d.compareTo(m) >= 0) return d.subtract(m);
		if(d.signum() < 0) d.addTo(m,d); else return d;
		if(d.signum() < 0) return d.add(m); else return d;
	}

	/**
	 * @param {number} t 
	 * @returns {boolean} test primality with certainty >= 1-.5^t
	 */
	isProbablePrime(t) {
		let i, x = this.abs();
		if(x.t == 1 && x.a[0] <= lowprimes[lowprimes.length-1]) {
			for(i = 0; i < lowprimes.length; ++i)
				if(x.a[0] == lowprimes[i]) return true;
			return false;
		}
		if(x.isEven()) return false;
		i = 1;
		while(i < lowprimes.length) {
			let m = lowprimes[i], j = i+1;
			while(j < lowprimes.length && m < lplim) m *= lowprimes[j++];
			m = x.modInt(m);
			while(i < j) if(m%lowprimes[i++] == 0) return false;
		}
		return x.millerRabin(t);
	}

	/**
	 * @protected
	 * @param {number} t 
	 * @returns {boolean} true if probably prime (HAC 4.24, Miller-Rabin)
	 */
	millerRabin(t) {
		let n1 = this.subtract(BigInteger.ONE());
		let k = n1.getLowestSetBit();
		if(k <= 0) return false;
		let r = n1.shiftRight(k);
		t = (t+1)>>1;
		if(t > lowprimes.length) t = lowprimes.length;
		let a = nbi();
		for(let i = 0; i < t; ++i) {
			//Pick bases at random, instead of starting at 2
			a.fromInt(lowprimes[Math.floor(Math.random()*lowprimes.length)]);
			let y = a.modPow(r,this);
			if(y.compareTo(BigInteger.ONE()) != 0 && y.compareTo(n1) != 0) {
				let j = 1;
				while(j++ < k && y.compareTo(n1) != 0) {
					y = y.modPowInt(2,this);
					if(y.compareTo(BigInteger.ONE()) == 0) return false;
				}
				if(y.compareTo(n1) != 0) return false;
			}
		}
		return true;
	}

	// BigInteger interfaces not implemented in jsbn:

	// BigInteger(int signum, byte[] magnitude)
	// double doubleValue()
	// float floatValue()
	// int hashCode()
	// long longValue()
	// static BigInteger valueOf(long val)

	// "constants"
	/** @returns {BigInteger} */
	static ZERO() {
		if (BigInteger._ZERO === undefined) BigInteger._ZERO = nbv(0);
		return /** @type {BigInteger} */ ( BigInteger._ZERO );
	}

	/** @returns {BigInteger} */
	static ONE() {
		if (BigInteger._ONE === undefined) BigInteger._ONE = nbv(1);
		return /** @type {BigInteger} */ ( BigInteger._ONE );
	}
}

/**
 * @returns {BigInteger} new, unset BigInteger
 */
export function nbi() { return new BigInteger(null); }

/**
 * @param {number} i 
 * @returns {BigInteger} bigint initialized to value
 */
export function nbv(i) { let r = nbi(); r.fromInt(i); return r; }

/**
 * @abstract
 */
export class Reduction {
	/**
	 * @abstract
	 * @param {BigInteger} x
	 * @returns {BigInteger}
	 */
	convert(x) {}

	/**
	 * @abstract
	 * @param {BigInteger} x
	 * @returns {BigInteger}
	 */
	revert(x) {}
	
	/**
	 * @abstract
	 * @param {BigInteger} x
	 */
	reduce(x) {}

	/**
	 * @abstract
	 * @param {BigInteger} x
	 * @param {BigInteger} y
	 * @param {BigInteger} r
	 */
	mulTo(x,y,r) {}

	/**
	 * @abstract
	 * @param {BigInteger} x
	 * @param {BigInteger} r
	 */
	sqrTo(x,r) {}
}

// Modular reduction using "classic" algorithm
export class Classic extends Reduction {
	/**
	 * @param {BigInteger} m
	 */
	constructor(m) {
		super();
		this.m = m;
	}

	/**
	 * @param {BigInteger} x
	 * @returns {BigInteger}
	 */
	convert(x) {
		if(x.s < 0 || x.compareTo(this.m) >= 0) return x.mod(this.m);
		else return x;
	}

	/**
	 * @param {BigInteger} x
	 * @returns {BigInteger}
	 */
	revert(x) { return x; }

	/**
	 * @param {BigInteger} x
	 */
	reduce(x) { x.divRemTo(this.m,null,x); }

	/**
	 * @param {BigInteger} x
	 * @param {BigInteger} y
	 * @param {BigInteger} r
	 */
	mulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }

	/**
	 * @param {BigInteger} x
	 * @param {BigInteger} r
	 */
	sqrTo(x,r) { x.squareTo(r); this.reduce(r); }
}

// Montgomery reduction
export class Montgomery extends Reduction {
	/**
	 * @param {BigInteger} m
	 */
	constructor(m) {
		super();
		this.m = m;
		this.mp = m.invDigit();
		this.mpl = this.mp&0x7fff;
		this.mph = this.mp>>15;
		this.um = (1<<(DB-15))-1;
		this.mt2 = 2*m.t;
	}

	/**
	 * xR mod m
	 * @param {BigInteger} x
	 * @returns {BigInteger}
	 */
	convert(x) {
		let r = nbi();
		x.abs().dlShiftTo(this.m.t,r);
		r.divRemTo(this.m,null,r);
		if(x.s < 0 && r.compareTo(BigInteger.ZERO()) > 0) this.m.subTo(r,r);
		return r;
	}

	/**
	 * x/R mod m
	 * @param {BigInteger} x
	 * @returns {BigInteger}
	 */
	revert(x) {
		let r = nbi();
		x.copyTo(r);
		this.reduce(r);
		return r;
	}

	/**
	 * x = x/R mod m (HAC 14.32)
	 * @param {BigInteger} x
	 */
	reduce(x) {
		while(x.t <= this.mt2)	// pad x so am has enough room later
			x.a[x.t++] = 0;
		for(let i = 0; i < this.m.t; ++i) {
			// faster way of calculating u0 = x[i]*mp mod DV
			let j = x.a[i]&0x7fff;
			let u0 = (j*this.mpl+(((j*this.mph+(x.a[i]>>15)*this.mpl)&this.um)<<15))&DM;
			// use am to combine the multiply-shift-add into one call
			j = i+this.m.t;
			x.a[j] += am(this.m,0,u0,x,i,0,this.m.t);
			// propagate carry
			while(x.a[j] >= DV) { x.a[j] -= DV; x.a[++j]++; }
		}
		x.clamp();
		x.drShiftTo(this.m.t,x);
		if(x.compareTo(this.m) >= 0) x.subTo(this.m,x);
	}

	/**
	 * r = "x^2/R mod m"; x != r
	 * @param {BigInteger} x
	 * @param {BigInteger} r
	 */
	sqrTo(x,r) { x.squareTo(r); this.reduce(r); }

	/**
	 * r = "xy/R mod m"; x,y != r
	 * @param {BigInteger} x
	 * @param {BigInteger} y
	 * @param {BigInteger} r
	 */
	mulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }
}

// A "null" reducer
export class NullExp extends Reduction {
	constructor() {
		super();
	}

	/**
	 * @param {BigInteger} x
	 * @returns {BigInteger}
	 */
	convert(x) { return x; }

	/**
	 * @param {BigInteger} x
	 * @returns {BigInteger}
	 */
	revert(x) { return x; }

	/**
	 * @param {BigInteger} x
	 */
	reduce(x) {}

	/**
	 * @param {BigInteger} x
	 * @param {BigInteger} y
	 * @param {BigInteger} r
	 */
	mulTo(x,y,r) { x.multiplyTo(y,r); }

	/**
	 * @param {BigInteger} x
	 * @param {BigInteger} r
	 */
	sqrTo(x,r) { x.squareTo(r); }
}

// Barrett modular reduction
export class Barrett extends Reduction {
	/**
	 * @param {BigInteger} m 
	 */
	constructor(m) {
		super();

		// setup Barrett
		this.r2 = nbi();
		this.q3 = nbi();
		BigInteger.ONE().dlShiftTo(2*m.t,this.r2);
		this.mu = this.r2.divide(m);
		this.m = m;
	}

	/**
	 * @param {BigInteger} x
	 * @returns {BigInteger}
	 */
	convert(x) {
		if(x.s < 0 || x.t > 2*this.m.t) return x.mod(this.m);
		else if(x.compareTo(this.m) < 0) return x;
		else { let r = nbi(); x.copyTo(r); this.reduce(r); return r; }
	}

	/**
	 * @param {BigInteger} x
	 * @returns {BigInteger}
	 */
	revert(x) { return x; }

	/**
	 * x = x mod m (HAC 14.42)
	 * @param {BigInteger} x
	 */
	reduce(x) {
		x.drShiftTo(this.m.t-1,this.r2);
		if(x.t > this.m.t+1) { x.t = this.m.t+1; x.clamp(); }
		this.mu.multiplyUpperTo(this.r2,this.m.t+1,this.q3);
		this.m.multiplyLowerTo(this.q3,this.m.t+1,this.r2);
		while(x.compareTo(this.r2) < 0) x.dAddOffset(1,this.m.t+1);
		x.subTo(this.r2,x);
		while(x.compareTo(this.m) >= 0) x.subTo(this.m,x);
	}

	/**
	 * r = x^2 mod m; x != r
	 * @param {BigInteger} x
	 * @param {BigInteger} r
	 */
	sqrTo(x,r) { x.squareTo(r); this.reduce(r); }

	/**
	 * r = x*y mod m; x,y != r
	 * @param {BigInteger} x
	 * @param {BigInteger} y
	 * @param {BigInteger} r
	 */
	mulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }
}
