fx_version 'cerulean'
game 'gta5'

name '{{module_name}}'
description '{{description}}'
version '1.0.0'
author '{{author}}'

shared_scripts {
    '@shiva-fw/init.lua',
    'shared/*.lua',
}

client_scripts {
    'client/*.lua',
}

server_scripts {
    '@oxmysql/lib/MySQL.lua',
    'server/*.lua',
}

lua54 'yes'
