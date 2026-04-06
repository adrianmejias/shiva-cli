fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name        '{{module_name}}'
description '{{description}}'
version     '1.0.0'
author      '{{author}}'

dependencies {
    'shiva-core',
}

shared_scripts {
    'module.lua',
    'config/config.lua',
    'locales/en.lua',
    'shared/sh_{{module_short}}.lua',
}

server_scripts {
    -- Migrations — add entries here as you create them:
    -- 'migrations/YYYY_MM_DD_HHMMSS_create_example.lua',

    -- Models
    -- 'server/models/Example.lua',

    -- Services
    -- 'server/services/ExampleService.lua',

    -- Events
    -- 'server/events/handlers.lua',

    'server/boot.lua',
}

client_scripts {
    -- 'client/services/ExampleClient.lua',
    -- 'client/events/handlers.lua',
    'client/boot.lua',
}
