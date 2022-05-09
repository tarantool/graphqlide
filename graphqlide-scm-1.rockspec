package = 'graphqlide'
version = 'scm-1'
source  = {
    url = 'git+https://github.com/tarantool/graphqlide.git',
    branch = 'master',
}
description = {
    summary     = "GraphQL IDE frontend module for Tarantool and Tarantool Cartridge",
    homepage    = 'https://github.com/tarantool/graphqlapi',
    license     = 'BSD',
    maintainer  = "Yaroslav Shumakov <noiseman2000@gmail.com>";
}
dependencies = {
    'lua >= 5.1',
    'checks ~> 3',
    'frontend-core ~> 8',
}
build = {
    type = 'make',
    build_target = 'all',
    install = {
        lua = {
            ['graphqlide'] = 'graphqlide.lua',
            ['cartridge.roles.graphqlide'] = 'cartridge/roles/graphqlide.lua',
        }
    },
    install_variables = {
        INST_LUADIR="$(LUADIR)",
    },
}
