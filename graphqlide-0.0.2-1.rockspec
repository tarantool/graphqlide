package = 'graphqlide'
version = '0.0.2-1'
source  = {
    url = '',
    branch = 'master',
}
dependencies = {
    'lua >= 5.1',
}
build = {
    type = 'make';
    install = {
        lua = {
            ['graphqlide'] = 'graphqlide.lua'
        },
    },
    install_variables = {
        INST_LUADIR="$(LUADIR)",
    },

}
