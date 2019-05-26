"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const errors_1 = require("./errors");
const money_1 = require("./money");
// How many digits we support
exports.PRECISION_I = 20;
// bigint version. We keep both so there's less conversions.
exports.PRECISION = BigInt(exports.PRECISION_I);
// Multiplication factor for internal values
exports.PRECISION_M = BigInt('10') ** exports.PRECISION;
var Round;
(function (Round) {
    // The following rules are round to the nearest integer, but have different
    // rules for when it's right in the middle (.5).
    Round[Round["HALF_TO_EVEN"] = 1] = "HALF_TO_EVEN";
    Round[Round["BANKERS"] = 1] = "BANKERS";
    Round[Round["HALF_AWAY_FROM_0"] = 2] = "HALF_AWAY_FROM_0";
    Round[Round["HALF_TOWARDS_0"] = 3] = "HALF_TOWARDS_0";
    // These cases don't always round to the nearest integer
    Round[Round["TOWARDS_0"] = 11] = "TOWARDS_0";
    Round[Round["TRUNCATE"] = 11] = "TRUNCATE";
})(Round = exports.Round || (exports.Round = {}));
/**
 * This helper function takes a string, number or anything that can
 * be used in the constructor of a Money object, and returns a bigint
 * with adjusted precision.
 */
function moneyValueToBigInt(input, round) {
    if (input instanceof money_1.Money) {
        return input.toSource();
    }
    switch (typeof input) {
        case 'string':
            const parts = input.match(/^(-)?([0-9]*)?(\.([0-9]*))?$/);
            if (!parts) {
                throw new TypeError('Input string must follow the pattern (-)##.## or -##');
            }
            const signPart = parts[1]; // Positive or negative
            const wholePart = parts[2]; // Whole numbers.
            const fracPart = parts[4];
            let output;
            // The whole part
            if (wholePart === undefined) {
                // For numbers like ".04" this part will be undefined.
                output = BigInt('0');
            }
            else {
                output = BigInt(wholePart) * exports.PRECISION_M;
            }
            if (fracPart !== undefined) {
                // The fractional part
                const precisionDifference = (exports.PRECISION - BigInt(fracPart.length));
                if (precisionDifference >= 0) {
                    // Add 0's
                    output += BigInt(fracPart) * BigInt('10') ** precisionDifference;
                }
                else {
                    // Remove 0's
                    output += divide(BigInt(fracPart), BigInt('10') ** (-precisionDifference), round);
                }
            }
            // negative ?
            if (signPart === '-') {
                output *= -BigInt('1');
            }
            return output;
        case 'bigint':
            return input * exports.PRECISION_M;
        case 'number':
            if (!Number.isSafeInteger(input)) {
                throw new errors_1.UnsafeIntegerError('The number ' + input + ' is not a "safe" integer. It must be converted before passing it');
            }
            return BigInt(input) * exports.PRECISION_M;
        default:
            throw new TypeError('value must be a safe integer, bigint or string');
    }
}
exports.moneyValueToBigInt = moneyValueToBigInt;
/**
 * This function takes a bigint that was multiplied by PRECISON_M, and returns
 * a human readable string value with a specified precision.
 *
 * Precision is the number of decimals that are returned.
 */
function bigintToFixed(value, precision, round) {
    if (precision === 0) {
        // No decimals were requested.
        return divide(value, exports.PRECISION_M, round).toString();
    }
    let wholePart = (value / exports.PRECISION_M);
    const negative = value < 0;
    let remainder = (value % exports.PRECISION_M);
    if (precision > exports.PRECISION) {
        // More precision was requested than we have, so we multiply
        // to add more 0's
        remainder *= BigInt('10') ** (BigInt(precision) - exports.PRECISION);
    }
    else {
        // Less precision was requested, so we round
        remainder = divide(remainder, BigInt('10') ** (exports.PRECISION - BigInt(precision)), round);
    }
    if (remainder < 0) {
        remainder *= -BigInt('1');
    }
    let remainderStr = remainder.toString().padStart(precision, '0');
    if (remainderStr.length > precision) {
        // The remainder rounded all the way up to the the 'whole part'
        wholePart += negative ? -BigInt('1') : BigInt('1');
        remainder = BigInt('0');
        remainderStr = '0'.repeat(precision);
    }
    let wholePartStr = wholePart.toString();
    if (wholePartStr === '0' && negative) {
        wholePartStr = '-0';
    }
    return wholePartStr + '.' + remainderStr;
}
exports.bigintToFixed = bigintToFixed;
/**
 * This function takes 2 bigints and divides them.
 *
 * By default ecmascript will round to 0. For example,
 * BigInt('5') / BigInt('2') yields BigInt('2').
 *
 * This function rounds to the nearest even number, also
 * known as 'bankers rounding'.
 */
function divide(a, b, round) {
    // Get absolute versions. We'll deal with the negatives later.
    const aAbs = a > 0 ? a : -a;
    const bAbs = b > 0 ? b : -b;
    let result = aAbs / bAbs;
    const rem = aAbs % bAbs;
    // if remainder > half divisor
    if (rem * BigInt('2') > bAbs) {
        switch (round) {
            case Round.TRUNCATE:
                // do nothing
                break;
            default:
                // We should have rounded up instead of down.
                result++;
                break;
        }
    }
    else if (rem * BigInt('2') === bAbs) {
        // If the remainder is exactly half the divisor, it means that the result is
        // exactly in between two numbers and we need to apply a specific rounding
        // method.
        switch (round) {
            case Round.HALF_TO_EVEN:
                // Add 1 if result is odd to get an even return value
                if (result % BigInt('2') === BigInt('1')) {
                    result++;
                }
                break;
            case Round.HALF_AWAY_FROM_0:
                result++;
                break;
            case Round.TRUNCATE:
            case Round.HALF_TOWARDS_0:
                // Do nothing
                break;
        }
    }
    if (a > 0 !== b > 0) {
        // Either a XOR b is negative
        return -result;
    }
    else {
        return result;
    }
}
exports.divide = divide;
//# sourceMappingURL=util.js.map