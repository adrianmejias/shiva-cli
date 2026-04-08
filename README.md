# shiva-cli

[![Publish](https://github.com/adrianmejias/shiva-cli/actions/workflows/publish.yml/badge.svg)](https://github.com/adrianmejias/shiva-cli/actions/workflows/publish.yml)

> Developer CLI for the [Shiva](https://github.com/adrianmejias/shiva-core) FiveM framework — scaffolding, migrations, package management, AI integration, and an MCP server.

Think of it as Artisan for FiveM. Generate modules, run database migrations, manage packages with lockfile support, produce AI context files, and expose live framework data to AI tools via the Model Context Protocol.

## Installation

```bash
npm install -g @shiva-fw/cli
# or run without installing
npx @shiva-fw/cli init
```

After installing, the `shiva` command is available globally.

## Quick Start

```bash
# Initialise a new server project
shiva init

# Scaffold a module
shiva make:module fishing
shiva make:service FishingService --module shiva-fishing
shiva make:model Fish --module shiva-fishing
shiva make:migration create_fish_table --module shiva-fishing

# Run migrations
shiva migrate

# Start the MCP server (for Claude Code, Cursor, etc.)
shiva mcp start
```

## Commands

### Scaffolding
```bash
shiva init                                        # Interactive setup
shiva init --recipe full-rp                       # Use a preset recipe (minimal | standard | full-rp)

shiva make:module <name>                          # Scaffold a new module
shiva make:service <name> --module <module>       # Add a service
shiva make:model <name> --module <module>         # Add a model
shiva make:migration <name> --module <module>     # Add a migration
shiva make:seed <name> --module <module>          # Add a seeder
shiva make:test <name> --module <module>          # Add a test spec
shiva make:contract <name>                        # Add a shared contract
```

### Database
```bash
shiva migrate                       # Run all pending migrations
shiva migrate:rollback              # Roll back the last batch
shiva migrate:rollback --steps=3    # Roll back 3 batches
shiva migrate:status                # Show migration status table
shiva seed                          # Run all seeders
shiva seed --module shiva-economy   # Seed a specific module
```

### Modules
```bash
shiva module:list     # List all installed modules with status
shiva module:status   # Detailed view (version, deps, health)
```

### Packages
```bash
shiva install shiva-fishing          # Install from registry
shiva install shiva-fishing@1.2.0   # Install a specific version
shiva update                         # Update all modules
shiva update shiva-economy           # Update one module
shiva outdated                       # Show available updates
shiva remove shiva-fishing           # Remove a module
```

### Testing
```bash
shiva test                           # Run all module test suites
shiva test --module shiva-economy    # Test a specific module
shiva test --filter "transfer"       # Filter by test name
```

### Config & Locale
```bash
shiva config:validate   # Validate all module configs
shiva locale:missing    # Find missing translation keys
```

### AI Integration
```bash
shiva ai:context                    # Generate AGENTS.md from installed modules
shiva ai:context --module economy   # For a specific module
shiva ai:link                       # Create CLAUDE.md and GEMINI.md symlinks
shiva ai:mcp                        # Generate .mcp.json for AI tool connections
shiva mcp start                     # Start the MCP server (stdio)
```

### Documentation
```bash
shiva docs:api               # Generate API reference from LuaLS annotations
shiva docs:build             # Build docs site (delegates to shiva-docs)
shiva docs:serve             # Local dev server (delegates to shiva-docs)
shiva docs:deploy            # Deploy docs (delegates to shiva-docs)
```

## Package Management

Projects use `shiva.json` (like `package.json`) and `shiva.lock`:

```json
{
  "name": "my-rp-server",
  "framework": "shiva-core@1.0.0",
  "modules": {
    "shiva-player":   "^1.0.0",
    "shiva-economy":  "^1.0.0",
    "shiva-police":   "^1.0.0",
    "my-fishing":     "file:./custom-modules/fishing"
  },
  "database": {
    "host": "127.0.0.1",
    "user": "root",
    "password": "",
    "database": "shiva"
  }
}
```

Version constraints follow semver: `^1.0.0` (compatible), `~1.0.0` (patch only), `1.0.0` (exact), `>=1.0.0 <2.0.0` (range).

## MCP Server

The MCP server exposes live framework context to AI assistants (Claude Code, Cursor, Windsurf, etc.):

```bash
shiva mcp start
# Listening on stdio — add to your editor's MCP config
```

| Tool | Description |
|------|-------------|
| `shiva:getContractMethods` | Methods, args, and return types for a contract |
| `shiva:getModuleConfig` | Config schema with defaults and current values |
| `shiva:getRegisteredEvents` | All events across modules with payload shapes |
| `shiva:getInstalledModules` | Installed modules, versions, dependency tree |
| `shiva:getServiceMethods` | Service methods including extensions |
| `shiva:getDatabaseSchema` | All tables, columns, and types |
| `shiva:getMigrationStatus` | Which migrations have run |
| `shiva:getAvailableCommands` | Registered commands with args and permissions |
| `shiva:getItemDefinitions` | All registered inventory items |
| `shiva:getJobDefinitions` | All jobs, grades, and salaries |
| `shiva:searchDocs` | Full-text search across framework docs |

## Requirements

- Node.js 18+
- Lua 5.4 (for `shiva test`)
- MySQL/MariaDB (for migration commands)

## Related Repositories

| Repo | Purpose |
|------|---------|
| [shiva-core](https://github.com/adrianmejias/shiva-core) | FiveM framework engine |
| [shiva-fw](https://github.com/adrianmejias/shiva-fw) | Shared Lua foundation |
| [shiva-modules](https://github.com/adrianmejias/shiva-modules) | 71 default RP modules |
| [shiva-test](https://github.com/adrianmejias/shiva-test) | Lua testing framework |
| [shiva-api](https://github.com/adrianmejias/shiva-api) | External REST API server |
| [shiva-docs](https://github.com/adrianmejias/shiva-docs) | Documentation site |
| [shiva-panel](https://github.com/adrianmejias/shiva-panel) | Admin panel |
| [shiva](https://github.com/adrianmejias/shiva) | FiveM Docker boilerplate |
| [shiva-boot](https://github.com/adrianmejias/shiva-boot) | Server boot scripts |
| [shiva-db](https://github.com/adrianmejias/shiva-db) | Database utilities |

## License

MIT
