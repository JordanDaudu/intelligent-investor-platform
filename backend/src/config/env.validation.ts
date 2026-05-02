/**
 * Lightweight environment-variable validator used by `@nestjs/config`.
 * We avoid pulling in extra deps (joi/class-validator on env) — this keeps the
 * validation explicit and dependency-free.
 */
export interface AppEnv {
  NODE_ENV: 'development' | 'staging' | 'production' | 'test';
  BACKEND_PORT: number;
  BACKEND_HOST: string;
  DATABASE_URL: string;
}

export function validateEnv(config: Record<string, unknown>): AppEnv {
  const NODE_ENV = (config.NODE_ENV ?? 'development') as AppEnv['NODE_ENV'];
  if (!['development', 'staging', 'production', 'test'].includes(NODE_ENV)) {
    throw new Error(`Invalid NODE_ENV: ${NODE_ENV}`);
  }

  const portRaw = config.BACKEND_PORT ?? config.PORT ?? '8000';
  const BACKEND_PORT = Number.parseInt(String(portRaw), 10);
  if (!Number.isInteger(BACKEND_PORT) || BACKEND_PORT <= 0 || BACKEND_PORT > 65535) {
    throw new Error(`Invalid BACKEND_PORT: ${portRaw}`);
  }

  const BACKEND_HOST = String(config.BACKEND_HOST ?? '127.0.0.1');

  const DATABASE_URL = String(config.DATABASE_URL ?? '');
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  return { NODE_ENV, BACKEND_PORT, BACKEND_HOST, DATABASE_URL };
}
