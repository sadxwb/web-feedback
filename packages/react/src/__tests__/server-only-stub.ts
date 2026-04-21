// Vitest alias target for the `server-only` package. The real module throws
// when loaded outside a server context; during tests we treat it as a no-op.
export {};
