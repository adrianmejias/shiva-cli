# Shiva CLI

> Developer command-line tool for the Shiva framework. Scaffolding, migrations, package management, AI integration, and MCP server.

## What This Is

shiva-cli is a Node.js CLI tool (distributed via npm as `@shiva-fw/cli`) that provides developer tooling for the Shiva framework. Think of it as Artisan for FiveM. It scaffolds modules, runs migrations, manages packages, generates AI context files, and hosts an MCP server for AI-assisted development.

## The 7 Shiva Projects

| # | Repo | Status | Purpose |
|---|------|--------|---------|
| 1 | shiva-fw | ✅ Done | Shared Lua foundation |
| 2 | shiva-core | ✅ Done | FiveM framework engine |
| 3 | shiva-modules | ✅ Done | 71 default RP modules |
| 4 | shiva-test | ✅ Done | Testing framework |
| 5 | **shiva-cli** | 🔲 This repo | Developer CLI + MCP server |
| 6 | shiva-api | ✅ Done | External API server |
| 7 | shiva-docs | ✅ Done | Documentation site |
| 8 | shiva-panel | ✅ Done | Admin panel |

## Installation

```bash
npm install -g @shiva-fw/cli
# or
npx @shiva-fw/cli init
```

After install, the `shiva` command is available globally.

## Folder Structure

```
shiva-cli/
├── package.json
├── AGENTS.md
├── bin/
│   └── shiva.js                   -- CLI entry point
├── src/
│   ├── index.js                   -- Command router
│   ├── commands/
│   │   ├── init.js                -- shiva init [--recipe]
│   │   ├── make/
│   │   │   ├── module.js          -- shiva make:module {name}
│   │   │   ├── service.js         -- shiva make:service {name} [--module]
│   │   │   ├── model.js           -- shiva make:model {name} [--module]
│   │   │   ├── migration.js       -- shiva make:migration {name} [--module]
│   │   │   ├── test.js            -- shiva make:test {name} [--module]
│   │   │   └── contract.js        -- shiva make:contract {name}
│   │   ├── migrate/
│   │   │   ├── run.js             -- shiva migrate
│   │   │   ├── rollback.js        -- shiva migrate:rollback [--steps]
│   │   │   └── status.js          -- shiva migrate:status
│   │   ├── seed.js                -- shiva seed [--module]
│   │   ├── module/
│   │   │   ├── list.js            -- shiva module:list
│   │   │   └── status.js          -- shiva module:status
│   │   ├── config/
│   │   │   └── validate.js        -- shiva config:validate
│   │   ├── locale/
│   │   │   └── missing.js         -- shiva locale:missing
│   │   ├── test.js                -- shiva test [--module] [--filter]
│   │   ├── install.js             -- shiva install {module} [--version]
│   │   ├── update.js              -- shiva update [module]
│   │   ├── outdated.js            -- shiva outdated
│   │   ├── remove.js              -- shiva remove {module}
│   │   ├── ai/
│   │   │   ├── context.js         -- shiva ai:context
│   │   │   ├── link.js            -- shiva ai:link
│   │   │   └── mcp.js             -- shiva ai:mcp
│   │   └── docs/
│   │       ├── build.js           -- shiva docs:build
│   │       ├── serve.js           -- shiva docs:serve
│   │       ├── api.js             -- shiva docs:api (generate from LuaLS annotations)
│   │       └── deploy.js          -- shiva docs:deploy
│   ├── mcp/
│   │   ├── server.js              -- MCP server entry point
│   │   ├── tools/
│   │   │   ├── contracts.js       -- shiva:getContractMethods
│   │   │   ├── modules.js         -- shiva:getInstalledModules
│   │   │   ├── database.js        -- shiva:getDatabaseSchema
│   │   │   ├── config.js          -- shiva:getModuleConfig
│   │   │   ├── events.js          -- shiva:getRegisteredEvents
│   │   │   ├── docs.js            -- shiva:searchDocs
│   │   │   └── items.js           -- shiva:getItemDefinitions
│   │   └── resources/
│   │       ├── docs.js            -- shiva:docs/{topic}
│   │       ├── contracts.js       -- shiva:contracts/{name}
│   │       └── examples.js        -- shiva:examples/{pattern}
│   ├── generators/
│   │   ├── templates/             -- Scaffolding templates
│   │   │   ├── module/            -- Full module template
│   │   │   ├── service.lua.tpl
│   │   │   ├── model.lua.tpl
│   │   │   ├── migration.lua.tpl
│   │   │   └── test.lua.tpl
│   │   └── recipes/
│   │       ├── minimal.json       -- 24 modules
│   │       ├── standard.json      -- 40 modules
│   │       ├── full-rp.json       -- 71 modules
│   │       └── cops-and-robbers.json
│   ├── packages/
│   │   ├── resolver.js            -- Dependency resolution with version constraints
│   │   ├── lockfile.js            -- shiva.lock management
│   │   └── registry.js            -- Package registry client
│   └── utils/
│       ├── lua-parser.js          -- Parse module.lua manifests
│       ├── lua-annotations.js     -- Parse LuaLS annotations for docs:api
│       ├── config-reader.js       -- Read Lua config files
│       └── server-root.js         -- Find server root from cwd
│
├── tests/
│   └── (jest tests)
│
└── recipes/
    ├── minimal.json
    ├── standard.json
    └── full-rp.json
```

## Commands Reference

### Scaffolding
```bash
shiva init                          # Interactive setup
shiva init --recipe full-rp         # Use a preset recipe

shiva make:module fishing           # Scaffold a new module
shiva make:service FishingService --module shiva-fishing
shiva make:model Fish --module shiva-fishing
shiva make:migration create_fish_catches --module shiva-fishing
shiva make:test fishing --module shiva-fishing
shiva make:contract Fishing
```

### Database
```bash
shiva migrate                       # Run all pending migrations
shiva migrate:rollback              # Rollback last batch
shiva migrate:rollback --steps=3    # Rollback 3 batches
shiva migrate:status                # Show migration status
shiva seed                          # Run all seeders
shiva seed --module shiva-economy   # Seed specific module
```

### Modules
```bash
shiva module:list                   # List all modules with status
shiva module:status                 # Detailed status (version, deps, health)
```

### Packages
```bash
shiva install shiva-fishing         # Install a module from registry
shiva install shiva-fishing@1.2.0   # Specific version
shiva update                        # Update all modules
shiva update shiva-economy          # Update specific module
shiva outdated                      # Show modules with available updates
shiva remove shiva-fishing          # Remove a module
```

### Testing
```bash
shiva test                          # Run all tests
shiva test --module shiva-economy   # Test specific module
shiva test --filter "transfer"      # Filter by test name
```

### Config
```bash
shiva config:validate               # Validate all module configs
shiva locale:missing                # Find missing translation keys
```

### AI Integration
```bash
shiva ai:context                    # Generate AGENTS.md from installed modules
shiva ai:context --module economy   # Just one module
shiva ai:link                       # Create CLAUDE.md and GEMINI.md symlinks
shiva ai:mcp                        # Generate .mcp.json for AI tool connections
shiva mcp start                     # Start MCP server
shiva mcp start --port 3200         # Custom port
```

### Documentation
```bash
shiva docs:build                    # Build VitePress docs site
shiva docs:serve                    # Local dev server
shiva docs:api                      # Generate API reference from LuaLS annotations
shiva docs:deploy                   # Deploy to hosting
```

## Package Management

Uses `shiva.json` (like package.json) and `shiva.lock` (like package-lock.json):

```json
// shiva.json
{
    "name": "my-rp-server",
    "framework": "shiva-core@1.0.0",
    "modules": {
        "shiva-player": "^1.0.0",
        "shiva-economy": "^1.0.0",
        "shiva-police": "^1.0.0",
        "my-custom-fishing": "file:./custom-modules/fishing"
    }
}
```

Version constraints follow semver: `^1.0.0` (compatible), `~1.0.0` (patch only), `1.0.0` (exact), `>=1.0.0 <2.0.0` (range).

## MCP Server

The MCP server provides live, queryable framework context for AI tools:

```bash
shiva mcp start
# MCP server running on stdio (for Claude Code, Cursor, etc.)
```

### Tools Available

| Tool | Description |
|------|-------------|
| `shiva:getContractMethods(service)` | All methods, args, return types for a contract |
| `shiva:getModuleConfig(module)` | Config schema with defaults and current values |
| `shiva:getRegisteredEvents()` | All events across all modules with payload shapes |
| `shiva:getInstalledModules()` | What's installed, versions, dependency tree |
| `shiva:getServiceMethods(service)` | Actual methods including extensions |
| `shiva:getDatabaseSchema()` | All tables, columns, types |
| `shiva:getMigrationStatus()` | Which migrations have run |
| `shiva:getAvailableCommands()` | All registered commands with args and permissions |
| `shiva:getItemDefinitions()` | All registered inventory items |
| `shiva:getJobDefinitions()` | All jobs, grades, salaries |
| `shiva:searchDocs(query)` | Full-text search across framework docs |

## Tech Stack

- **Node.js 18+**
- **Commander.js** — CLI framework
- **Inquirer** — Interactive prompts for `shiva init`
- **MCP SDK** — `@modelcontextprotocol/sdk` for MCP server
- **Chalk** — Terminal colors
- **Glob** — File system scanning

## Don't

- Don't require FiveM to be running for any CLI command except `shiva mcp start` with live DB queries
- Don't write Lua from the CLI — generate it from templates
- Don't break backwards compatibility in `shiva.json` format without a migration path
- Don't guess module locations — scan resource folders using FiveM's `[category]` convention
