// Generate a random number cryptographically secured
const crandom = require("math-random");
const baseChars62 =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const baseCharsHex = "0123456789abcdef";

/**
 * Calculates a random number
 * @param  {number}        size    size of random string
 * @param  {number|string} base=62 Chars to use. If == 'hex', uses a hex base
 * @return {string} a random string
 */
const getRandom = (size, base = 62) => {
    let baseChars;
    if (base === 16) baseChars = baseCharsHex;
    else baseChars = baseChars62;

    let len = size ? (Number.isInteger(size) ? Math.abs(size) : 1) : 1;
    let res = "";
    while (len--) {
        res += baseChars.charAt(parseInt(crandom() * baseChars.length, 10));
    }
    return res;
};

module.exports = getRandom;
