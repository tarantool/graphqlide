SHELL := /bin/bash

.PHONY: .rocks
.rocks: graphqlide-scm-1.rockspec Makefile
		tarantoolctl rocks install http 1.1.0
		tarantoolctl rocks install checks 
		tarantoolctl rocks install frontend-core 7.12.0
		tarantoolctl rocks install luatest 0.5.6
		tarantoolctl rocks install luacov 0.13.0
		tarantoolctl rocks install luacheck 0.26.0
		tarantoolctl rocks install cartridge 2.7.3

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
	@ if [ ! -d ".rocks" ]; then make .rocks; fi
	.rocks/bin/luacheck .

.PHONY: test
test:
	@ if [ ! -d ".rocks" ]; then make .rocks; fi
	.rocks/bin/luacheck .
	rm -f tmp/luacov*
	.rocks/bin/luatest --verbose --coverage --shuffle group
	.rocks/bin/luacov . && grep -A999 '^Summary' tmp/luacov.report.out

.PHONY: rock
rock:
	@ if [ ! -d ".rocks" ]; then make .rocks; fi
	tarantoolctl rocks make
	tarantoolctl rocks pack graphqlide
