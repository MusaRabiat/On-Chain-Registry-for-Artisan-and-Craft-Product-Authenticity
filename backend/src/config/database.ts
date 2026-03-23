import { Pool, PoolConfig } from 'pg';
import { logger } from './logger';

const poolConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'artisan_registry',
  user: process.env.DB_USER || 'user',
  password: process.env.DB_PASSWORD || 'password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

export const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  logger.error('Unexpected database error', { error: err.message });
});

pool.on('connect', () => {
  logger.debug('New database connection established');
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Query executed', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    logger.error('Query error', { text, error });
    throw error;
  }
}

export async function getClient() {
  const client = await pool.connect();
  return client;
}

// Database schema initialization (for reference)
export const SCHEMA = `
  -- Products table (cache of on-chain data + additional metadata)
  CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    chain_id INTEGER UNIQUE NOT NULL,
    artisan_address VARCHAR(64) NOT NULL,
    name VARCHAR(128) NOT NULL,
    category VARCHAR(64) NOT NULL,
    description TEXT,
    metadata_uri VARCHAR(256),
    status VARCHAR(32) DEFAULT 'pending',
    nft_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    indexed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Artisans table
  CREATE TABLE IF NOT EXISTS artisans (
    id SERIAL PRIMARY KEY,
    chain_id INTEGER UNIQUE NOT NULL,
    address VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(128) NOT NULL,
    bio TEXT,
    location VARCHAR(128),
    verified BOOLEAN DEFAULT FALSE,
    product_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    indexed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Certifications table
  CREATE TABLE IF NOT EXISTS certifications (
    id SERIAL PRIMARY KEY,
    chain_id INTEGER UNIQUE NOT NULL,
    product_id INTEGER REFERENCES products(id),
    certifier_address VARCHAR(64) NOT NULL,
    tier INTEGER NOT NULL,
    status VARCHAR(32) DEFAULT 'active',
    notes TEXT,
    evidence_uri VARCHAR(256),
    issued_at TIMESTAMP,
    expires_at TIMESTAMP,
    indexed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Disputes table
  CREATE TABLE IF NOT EXISTS disputes (
    id SERIAL PRIMARY KEY,
    chain_id INTEGER UNIQUE NOT NULL,
    product_id INTEGER REFERENCES products(id),
    complainant_address VARCHAR(64) NOT NULL,
    respondent_address VARCHAR(64) NOT NULL,
    category VARCHAR(32) NOT NULL,
    title VARCHAR(128) NOT NULL,
    description TEXT,
    status VARCHAR(32) DEFAULT 'pending',
    resolution VARCHAR(32),
    created_at TIMESTAMP,
    resolved_at TIMESTAMP,
    indexed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Indexes
  CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
  CREATE INDEX IF NOT EXISTS idx_products_artisan ON products(artisan_address);
  CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
  CREATE INDEX IF NOT EXISTS idx_certifications_product ON certifications(product_id);
  CREATE INDEX IF NOT EXISTS idx_disputes_product ON disputes(product_id);
  CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
`;
