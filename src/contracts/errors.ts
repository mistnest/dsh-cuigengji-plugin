export interface ErrorInfo {code: string; message: string; details: Record<string, unknown>}

/** Keep actionable diagnostics across RPC/MCP without serializing Error stacks
 * or native causes into model output. */
export function errorInfo(error: unknown): ErrorInfo {
  const value = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  return {
    code: typeof value.code === 'string' && value.code ? value.code : 'CUIGENGJI_ERROR',
    message: typeof value.message === 'string' ? value.message : String(error),
    details: value.details && typeof value.details === 'object' && !Array.isArray(value.details) ? value.details as Record<string, unknown> : {},
  };
}
