import assert from "node:assert/strict";
import { creditLimitExceeded } from "../src/lib/credit-limit";

assert.equal(creditLimitExceeded(1000, 400, 500), false);
assert.equal(creditLimitExceeded(1000, 400, 700), true);
assert.equal(creditLimitExceeded(1000, 1000, 0.005), false);
assert.equal(creditLimitExceeded(0, 5000, 100), false);
assert.equal(creditLimitExceeded(-1, 10, 10), false);

console.log("credit limit checks ok");
