.PHONY: all install

all: $(shell find src -type f) node_modules
	npm run build

node_modules: package.json
	npm i
	@ touch $@

install:
	mkdir -p $(INST_LUADIR)/graphqlide/
	cp build/bundle.lua $(INST_LUADIR)/graphqlide/bundle.lua

.PHONY: lint
lint:
	.rocks/bin/luacheck .

.PHONY: test
test: 	
	.rocks/bin/luacheck .
	rm -f tmp/luacov*
	.rocks/bin/luatest --verbose --coverage --shuffle group
	.rocks/bin/luacov . && grep -A999 '^Summary' tmp/luacov.report.out
