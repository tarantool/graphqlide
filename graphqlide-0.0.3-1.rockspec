package = 'graphqlide'
version = '0.0.3-1'
source  = {
    url = 'git+https://github.com/no1seman/graphqlide.git',
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
