package = 'graphqlide'
version = '0.0.8-1'
source  = {
    url = 'git+https://github.com/no1seman/graphqlide.git',
    branch = 'master',
}
description = {
    summary     = "GraphQL IDE frontend module for Tarantool and Tarantool Cartridge",
    homepage    = 'https://github.com/no1seman/graphqlapi',
    license     = 'BSD',
    maintainer  = "Yaroslav Shumakov <noiseman2000@gmail.com>";
}
dependencies = {
    'lua >= 5.1',
    'checks >= 2.0.0',
    'frontend-core >= 7.2.0-1',
}
build = {
    type = 'make';
    install = {
        lua = {
            ['graphqlide'] = 'graphqlide.lua',
            ['cartridge.roles.graphqlide'] = 'cartridge/roles/graphqlide.lua',
        },
    },
    install_variables = {
        INST_LUADIR="$(LUADIR)",
    },

}
