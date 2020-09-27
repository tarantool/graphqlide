.PHONY: all install

all: $(shell find src -type f) node_modules
	npm run build

node_modules: package.json
	npm i
	@ touch $@

install:
	mkdir -p $(INST_LUADIR)/graphqlide/
	cp build/bundle.lua $(INST_LUADIR)/graphqlide/bundle.lua
