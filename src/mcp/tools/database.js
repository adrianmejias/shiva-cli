'use strict';

const { getDatabaseConfig } = require('../../utils/config-reader');
const { scanModules }       = require('../../utils/lua-parser');
const { getResourcesDir }   = require('../../utils/server-root');

async function openConnection(dbConfig) {
  const mysql = require('mysql2/promise');
  return mysql.createConnection({
    host:     dbConfig.host     || '127.0.0.1',
    port:     dbConfig.port     || 3306,
    user:     dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
  });
}

module.exports = [
  {
    name: 'shiva:getDatabaseSchema',
    description: 'Get all tables and columns from the live database',
    inputSchema: { type: 'object', properties: {}, required: [] },

    async handler(_, serverRoot) {
      if (!serverRoot) return 'Not in a Shiva project directory.';
      const dbConfig = getDatabaseConfig(serverRoot);
      if (!dbConfig) return 'No database configuration found in shiva.json';

      const conn = await openConnection(dbConfig);
      try {
        const [rows] = await conn.execute(
          `SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY
           FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = ?
           ORDER BY TABLE_NAME, ORDINAL_POSITION`,
          [dbConfig.database]
        );
        const schema = {};
        for (const row of rows) {
          if (!schema[row.TABLE_NAME]) schema[row.TABLE_NAME] = [];
          schema[row.TABLE_NAME].push({
            column:   row.COLUMN_NAME,
            type:     row.COLUMN_TYPE,
            nullable: row.IS_NULLABLE === 'YES',
            default:  row.COLUMN_DEFAULT,
            key:      row.COLUMN_KEY || null,
          });
        }
        return schema;
      } finally {
        await conn.end();
      }
    },
  },

  {
    name: 'shiva:getMigrationStatus',
    description: 'Show which migrations have run and which are pending',
    inputSchema: { type: 'object', properties: {}, required: [] },

    async handler(_, serverRoot) {
      if (!serverRoot) return 'Not in a Shiva project directory.';
      const dbConfig = getDatabaseConfig(serverRoot);
      if (!dbConfig) return 'No database configuration found in shiva.json';

      const conn = await openConnection(dbConfig);
      try {
        const [rows] = await conn.execute(
          'SELECT migration, ran_at FROM shiva_migrations ORDER BY id'
        ).catch(() => [[]]);

        const ran     = new Set(rows.map(r => r.migration));
        const modules = scanModules(getResourcesDir(serverRoot));
        const all     = [];

        for (const mod of modules) {
          for (const mig of (mod.manifest.migrations || [])) {
            const id = `${mod.name}/${mig}`;
            const ranAt = rows.find(r => r.migration === id);
            all.push({
              migration: id,
              status:    ran.has(id) ? 'ran' : 'pending',
              ran_at:    ranAt ? ranAt.ran_at : null,
            });
          }
        }
        return all;
      } finally {
        await conn.end();
      }
    },
  },
];
