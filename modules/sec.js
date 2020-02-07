/**
 * Original work Copyright (c) 2003-2005 Tom Wu <tjw@cs.Stanford.EDU>
 * Modified work Copyright (c) 2020 Sergio Rando <sergio.rando@yahoo.com>
 */

"use strict";

// Named EC curves

// Requires ec.js, jsbn.js, and jsbn2.js

import { BigInteger } from "./jsbn.js"
import { ECCurveFp, ECPointFp } from "./ec.js"

// ----------------
// X9ECParameters

// constructor
class X9ECParameters {
	/**
	 * @param {ECCurveFp} curve 
	 * @param {ECPointFp} g 
	 * @param {BigInteger} n 
	 * @param {BigInteger} h 
	 */
	constructor(curve,g,n,h) {
		this.curve = curve;
		this.g = g;
		this.n = n;
		this.h = h;
	}

	/**
	 * @returns {ECCurveFp}
	 */
	getCurve() {
		return this.curve;
	}

	getG() {
		return this.g;
	}

	getN() {
		return this.n;
	}

	getH() {
		return this.h;
	}
}

// ----------------
// SECNamedCurves

function fromHex(s) { return new BigInteger(s, 16); }

/**
 * @returns {X9ECParameters}
 */
function secp128r1() {
	// p = 2^128 - 2^97 - 1
	let p = fromHex("FFFFFFFDFFFFFFFFFFFFFFFFFFFFFFFF");
	let a = fromHex("FFFFFFFDFFFFFFFFFFFFFFFFFFFFFFFC");
	let b = fromHex("E87579C11079F43DD824993C2CEE5ED3");
	//byte[] S = Hex.decode("000E0D4D696E6768756151750CC03A4473D03679");
	let n = fromHex("FFFFFFFE0000000075A30D1B9038A115");
	let h = BigInteger.ONE();
	let curve = new ECCurveFp(p, a, b);
	let G = curve.decodePointHex("04"
							+ "161FF7528B899B2D0C28607CA52C5B86"
	+ "CF5AC8395BAFEB13C02DA292DDED7A83");
	return new X9ECParameters(curve, G, n, h);
}

/**
 * @returns {X9ECParameters}
 */
function secp160k1() {
	// p = 2^160 - 2^32 - 2^14 - 2^12 - 2^9 - 2^8 - 2^7 - 2^3 - 2^2 - 1
	let p = fromHex("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFAC73");
	let a = BigInteger.ZERO();
	let b = fromHex("7");
	//byte[] S = null;
	let n = fromHex("0100000000000000000001B8FA16DFAB9ACA16B6B3");
	let h = BigInteger.ONE();
	let curve = new ECCurveFp(p, a, b);
	let G = curve.decodePointHex("04"
							+ "3B4C382CE37AA192A4019E763036F4F5DD4D7EBB"
							+ "938CF935318FDCED6BC28286531733C3F03C4FEE");
	return new X9ECParameters(curve, G, n, h);
}

/**
 * @returns {X9ECParameters}
 */
function secp160r1() {
	// p = 2^160 - 2^31 - 1
	let p = fromHex("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF7FFFFFFF");
	let a = fromHex("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF7FFFFFFC");
	let b = fromHex("1C97BEFC54BD7A8B65ACF89F81D4D4ADC565FA45");
	//byte[] S = Hex.decode("1053CDE42C14D696E67687561517533BF3F83345");
	let n = fromHex("0100000000000000000001F4C8F927AED3CA752257");
	let h = BigInteger.ONE();
	let curve = new ECCurveFp(p, a, b);
	let G = curve.decodePointHex("04"
	+ "4A96B5688EF573284664698968C38BB913CBFC82"
	+ "23A628553168947D59DCC912042351377AC5FB32");
	return new X9ECParameters(curve, G, n, h);
}

/**
 * @returns {X9ECParameters}
 */
function secp192k1() {
	// p = 2^192 - 2^32 - 2^12 - 2^8 - 2^7 - 2^6 - 2^3 - 1
	let p = fromHex("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFEE37");
	let a = BigInteger.ZERO();
	let b = fromHex("3");
	//byte[] S = null;
	let n = fromHex("FFFFFFFFFFFFFFFFFFFFFFFE26F2FC170F69466A74DEFD8D");
	let h = BigInteger.ONE();
	let curve = new ECCurveFp(p, a, b);
	let G = curve.decodePointHex("04"
							+ "DB4FF10EC057E9AE26B07D0280B7F4341DA5D1B1EAE06C7D"
							+ "9B2F2F6D9C5628A7844163D015BE86344082AA88D95E2F9D");
	return new X9ECParameters(curve, G, n, h);
}

/**
 * @returns {X9ECParameters}
 */
function secp192r1() {
	// p = 2^192 - 2^64 - 1
	let p = fromHex("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFFFFFFFFFFFF");
	let a = fromHex("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFFFFFFFFFFFC");
	let b = fromHex("64210519E59C80E70FA7E9AB72243049FEB8DEECC146B9B1");
	//byte[] S = Hex.decode("3045AE6FC8422F64ED579528D38120EAE12196D5");
	let n = fromHex("FFFFFFFFFFFFFFFFFFFFFFFF99DEF836146BC9B1B4D22831");
	let h = BigInteger.ONE();
	let curve = new ECCurveFp(p, a, b);
	let G = curve.decodePointHex("04"
							+ "188DA80EB03090F67CBF20EB43A18800F4FF0AFD82FF1012"
							+ "07192B95FFC8DA78631011ED6B24CDD573F977A11E794811");
	return new X9ECParameters(curve, G, n, h);
}

/**
 * @returns {X9ECParameters}
 */
function secp224r1() {
	// p = 2^224 - 2^96 + 1
	let p = fromHex("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF000000000000000000000001");
	let a = fromHex("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFE");
	let b = fromHex("B4050A850C04B3ABF54132565044B0B7D7BFD8BA270B39432355FFB4");
	//byte[] S = Hex.decode("BD71344799D5C7FCDC45B59FA3B9AB8F6A948BC5");
	let n = fromHex("FFFFFFFFFFFFFFFFFFFFFFFFFFFF16A2E0B8F03E13DD29455C5C2A3D");
	let h = BigInteger.ONE();
	let curve = new ECCurveFp(p, a, b);
	let G = curve.decodePointHex("04"
							+ "B70E0CBD6BB4BF7F321390B94A03C1D356C21122343280D6115C1D21"
							+ "BD376388B5F723FB4C22DFE6CD4375A05A07476444D5819985007E34");
	return new X9ECParameters(curve, G, n, h);
}

/**
 * @returns {X9ECParameters}
 */
function secp256r1() {
	// p = 2^224 (2^32 - 1) + 2^192 + 2^96 - 1
	let p = fromHex("FFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFF");
	let a = fromHex("FFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFC");
	let b = fromHex("5AC635D8AA3A93E7B3EBBD55769886BC651D06B0CC53B0F63BCE3C3E27D2604B");
	//byte[] S = Hex.decode("C49D360886E704936A6678E1139D26B7819F7E90");
	let n = fromHex("FFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551");
	let h = BigInteger.ONE();
	let curve = new ECCurveFp(p, a, b);
	let G = curve.decodePointHex("04"
							+ "6B17D1F2E12C4247F8BCE6E563A440F277037D812DEB33A0F4A13945D898C296"
	+ "4FE342E2FE1A7F9B8EE7EB4A7C0F9E162BCE33576B315ECECBB6406837BF51F5");
	return new X9ECParameters(curve, G, n, h);
}

/**
 * TODO: make this into a proper hashtable
 * @param {string} name
 * @returns {X9ECParameters}
 */
export function getSECCurveByName(name) {
	if(name == "secp128r1") return secp128r1();
	if(name == "secp160k1") return secp160k1();
	if(name == "secp160r1") return secp160r1();
	if(name == "secp192k1") return secp192k1();
	if(name == "secp192r1") return secp192r1();
	if(name == "secp224r1") return secp224r1();
	if(name == "secp256r1") return secp256r1();
	return null;
}
