const A = require("arcsecond");
const B = require("arcsecond-binary");

const isError = (state) => state.isError;
const canReadBytes = (state, n, offset = 0) =>
  state.index + n + offset <= state.dataView.byteLength;
const updateError = (state, error) => ({ ...state, isError: true, error });
const updateResultAndIndex = (state, result, index) => ({
  ...state,
  result,
  index,
});
const needNBytes = (n, name, transformerFn) =>
  new A.Parser((state) => {
    if (isError(state)) return state;
    if (!canReadBytes(state, n))
      return updateError(state, `${name}: Unexpected end of input`);
    return transformerFn(state);
  });
const bufferRead = (name, bytes, method, littleEndian) =>
  needNBytes(bytes, name, (state) =>
    updateResultAndIndex(
      state,
      state.dataView[method](state.index, littleEndian),
      state.index + bytes
    )
  );

const u64LE = bufferRead("u64LE", 8, "getBigInt64", true);
const u64BE = bufferRead("u64BE", 8, "getBigInt64", false);
const zeroTerminatedString = A.coroutine(function* () {
  let out = "";
  const errorMsg = "nullTerminatedString: Unexpected end of input";

  while (true) {
    const isZero = yield A.peek.errorMap(() => errorMsg);
    if (isZero === 0) {
      yield B.u8;
      break;
    }
    const nextChar = yield A.anyChar.errorMap(() => errorMsg);
    out += nextChar;
  }
  return out;
});

module.exports = {
  u64LE,
  u64BE,
  zeroTerminatedString,
};
