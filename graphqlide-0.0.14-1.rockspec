package = "graphqlide"
version = "0.0.14-1"
source = {
   url = "git+https://github.com/no1seman/graphqlide.git",
   tag = "0.0.14",
   branch = "master"
}
description = {
   summary = "GraphQL IDE frontend module for Tarantool and Tarantool Cartridge",
   homepage = "https://github.com/no1seman/graphqlapi",
   license = "BSD",
   maintainer = "Yaroslav Shumakov <noiseman2000@gmail.com>"
}
dependencies = {
   "lua >= 5.1",
   "checks ~> 3",
   "frontend-core ~> 7"
}
build = {
   type = "make",
   build_target = "all",
   install = {
      lua = {
         ["cartridge.roles.graphqlide"] = "cartridge/roles/graphqlide.lua",
         graphqlide = "graphqlide.lua"
      }
   },
   install_variables = {
      INST_LUADIR = "$(LUADIR)"
   }
}
