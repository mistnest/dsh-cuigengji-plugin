function errorInfo(error) {
  const value = error && typeof error === "object" ? error : {};
  return {
    code: typeof value.code === "string" && value.code ? value.code : "CUIGENGJI_ERROR",
    message: typeof value.message === "string" ? value.message : String(error),
    details: value.details && typeof value.details === "object" && !Array.isArray(value.details) ? value.details : {}
  };
}
export {
  errorInfo
};
