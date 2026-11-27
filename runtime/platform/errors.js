function errorInfo(error) {
  const value = error && typeof error === "object" ? error : {};
  return {
    code: typeof value.code === "string" && value.code ? value.code : "CUIGENGJI_ERROR",
    message: typeof value.message === "string" ? value.message : String(error),
    details: value.details && typeof value.details === "object" && !Array.isArray(value.details) ? value.details : {}
  };
}
class StoreError extends Error {
  code;
  constructor(code, message) {
    super(message);
    this.name = "StoreError";
    this.code = code;
  }
}
function fail(code, message) {
  throw new StoreError(code, message);
}
export {
  StoreError,
  errorInfo,
  fail
};
