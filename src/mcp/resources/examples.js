'use strict';

const fs   = require('fs');
const path = require('path');

const { scanModules }     = require('../../utils/lua-parser');
const { getResourcesDir } = require('../../utils/server-root');

const TEMPLATE_URI = 'shiva:examples/{pattern}';

// Built-in code examples derived from shiva-core patterns
const BUILTIN_EXAMPLES = [
  {
    pattern:  'service',
    name:     'Service registration',
    mimeType: 'text/x-lua',
    text: `-- Register a service into the container
Container.register('Economy', {
    getBalance = function(source)
        local char = State.getPlayer(source, 'character')
        return DB.table('accounts'):where('character_id', char.id):first()
    end,

    addMoney = function(source, amount, reason)
        local char    = State.getPlayer(source, 'character')
        local account = DB.table('accounts'):where('character_id', char.id):first()
        DB.table('accounts'):where('id', account.id):update({ balance = account.balance + amount })
        EventBus.emit('economy:balanceChanged', source, { delta = amount, reason = reason })
    end,
})`,
  },
  {
    pattern:  'migration',
    name:     'Database migration',
    mimeType: 'text/x-lua',
    text: `-- migrations/001_create_accounts.lua
return {
    up = function(DB)
        DB.execute([[
            CREATE TABLE IF NOT EXISTS accounts (
                id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                character_id INT UNSIGNED NOT NULL,
                balance      INT UNSIGNED NOT NULL DEFAULT 0,
                created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_character_id (character_id)
            )
        ]])
    end,
    down = function(DB)
        DB.execute('DROP TABLE IF EXISTS accounts')
    end,
}`,
  },
  {
    pattern:  'model',
    name:     'Model definition',
    mimeType: 'text/x-lua',
    text: `-- server/models/Account.lua
local Account = Model.define('accounts', {
    primaryKey = 'id',
    fillable   = { 'character_id', 'balance' },
    casts      = { metadata = 'json' },
})

-- Usage
local acc = Account:where('character_id', charId):first()
acc:update({ balance = acc.balance + 100 })`,
  },
  {
    pattern:  'event',
    name:     'EventBus usage',
    mimeType: 'text/x-lua',
    text: `-- Listen for an event
EventBus.on('economy:balanceChanged', function(source, payload)
    Log.info('economy', 'Balance changed', { source = source, delta = payload.delta })
end, 10)

-- Before plugin (can halt)
EventBus.before('Economy', 'transfer', function(from, to, amount)
    if amount < 0 then
        return EventBus.halt({ success = false, error = 'Amount must be positive' })
    end
end)

-- After plugin (chain result)
EventBus.after('Economy', 'transfer', function(result, from, to, amount)
    Log.info('audit', 'Transfer completed', { from = from, to = to, amount = amount })
    return result
end)`,
  },
  {
    pattern:  'command',
    name:     'Command registration',
    mimeType: 'text/x-lua',
    text: `-- Register a command via the Commands contract
Commands.register('givemoney', {
    description = 'Give money to a player',
    permission  = 'admin',
    params      = {
        { name = 'target', type = 'number',  help = 'Target player ID' },
        { name = 'amount', type = 'number',  help = 'Amount to give' },
        { name = 'reason', type = 'string',  help = 'Reason', optional = true },
    },
}, function(source, args)
    local Economy = Container.resolve('Economy')
    Economy.addMoney(args.target, args.amount, args.reason or 'admin_grant')
end)`,
  },
  {
    pattern:  'contract',
    name:     'Contract definition',
    mimeType: 'text/x-lua',
    text: `-- shared/sh_contracts/sh_economy.lua
return {
    name   = 'Economy',
    server = {
        'getBalance',
        'addMoney',
        'removeMoney',
        'transfer',
    },
    client = {
        'getBalance',
    },
    events = {
        'economy:balanceChanged',
        'economy:transfer',
    },
}`,
  },
  {
    pattern:  'module',
    name:     'Module manifest',
    mimeType: 'text/x-lua',
    text: `-- module.lua
return {
    name    = 'shiva-economy',
    version = '1.0.0',
    description = 'Player economy with cash, bank, and transfers',

    dependencies = {
        'shiva-player',
    },

    optionalDependencies = {
        'shiva-discord',
    },

    provides = {
        'Economy',
    },

    metadata = {
        accounts = { type = 'table', default = {} },
    },

    events = {
        'economy:balanceChanged',
        'economy:transfer',
    },
}`,
  },
];

/**
 * List all available example patterns, plus any from installed modules.
 * @param {string} serverRoot
 * @returns {Array<{uri, name, description, mimeType}>}
 */
function listExamples(serverRoot) {
  const resources = BUILTIN_EXAMPLES.map(ex => ({
    uri:         `shiva:examples/${ex.pattern}`,
    name:        ex.name,
    description: `Example: ${ex.name}`,
    mimeType:    ex.mimeType,
  }));

  // Also surface example files from installed modules (examples/ directories)
  if (serverRoot) {
    try {
      const modules = scanModules(getResourcesDir(serverRoot));
      for (const mod of modules) {
        const examplesDir = path.join(mod.path, 'examples');
        if (!fs.existsSync(examplesDir)) continue;
        for (const file of fs.readdirSync(examplesDir)) {
          if (!file.endsWith('.lua')) continue;
          const slug = `${mod.name}/${file.replace(/\.lua$/, '')}`;
          resources.push({
            uri:         `shiva:examples/${slug}`,
            name:        `${mod.name}: ${file}`,
            description: `Example from ${mod.name}`,
            mimeType:    'text/x-lua',
          });
        }
      }
    } catch {
      // modules not found — skip
    }
  }

  return resources;
}

/**
 * Read an example resource by URI.
 * @param {string} uri   e.g. "shiva:examples/service"
 * @param {string} serverRoot
 * @returns {{uri, mimeType, text}|null}
 */
function readExample(uri, serverRoot) {
  const pattern = uri.replace(/^shiva:examples\//, '');

  // Built-in examples
  const builtin = BUILTIN_EXAMPLES.find(ex => ex.pattern === pattern);
  if (builtin) return { uri, mimeType: builtin.mimeType, text: builtin.text };

  // Module-sourced examples (e.g. "shiva-economy/transfer")
  if (serverRoot) {
    const parts  = pattern.split('/');
    const modName = parts.slice(0, -1).join('/');
    const file    = parts[parts.length - 1] + '.lua';
    const modules = scanModules(getResourcesDir(serverRoot));
    const mod     = modules.find(m => m.name === modName);
    if (mod) {
      const filePath = path.join(mod.path, 'examples', file);
      if (fs.existsSync(filePath)) {
        return { uri, mimeType: 'text/x-lua', text: fs.readFileSync(filePath, 'utf-8') };
      }
    }
  }

  return null;
}

module.exports = { TEMPLATE_URI, listExamples, readExample };
