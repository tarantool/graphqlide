SHELL := /bin/bash

BUNDLE_VERSION=2.8.2-0-gfc96d10f5-r428

.PHONY: .rocks
.rocks: graphqlide-scm-1.rockspec Makefile
		tarantoolctl rocks install http 1.1.0
		tarantoolctl rocks install checks 
		tarantoolctl rocks install frontend-core 7.12.0
		tarantoolctl rocks install luatest 0.5.6
		tarantoolctl rocks install luacov 0.13.0
		tarantoolctl rocks install luacheck 0.26.0
		tarantoolctl rocks install cartridge 2.7.2
		tarantoolctl rocks make graphqlide-scm-1.rockspec

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

.PHONY: sdk
sdk: Makefile
	wget https://tarantool:$(DOWNLOAD_TOKEN)@download.tarantool.io/enterprise/tarantool-enterprise-bundle-$(BUNDLE_VERSION).tar.gz
	tar -xzf tarantool-enterprise-bundle-$(BUNDLE_VERSION).tar.gz
	rm tarantool-enterprise-bundle-$(BUNDLE_VERSION).tar.gz
	mv tarantool-enterprise sdk

push-scm-1:
	curl --fail -X PUT -F "rockspec=@graphqlide-scm-1.rockspec" https://${ROCKS_USERNAME}:${ROCKS_PASSWORD}@rocks.tarantool.org

push-release:
	cd release/ \
    && curl --fail -X PUT -F "rockspec=@graphqlide-${COMMIT_TAG}-1.rockspec" https://${ROCKS_USERNAME}:${ROCKS_PASSWORD}@rocks.tarantool.org \
    && curl --fail -X PUT -F "rockspec=@graphqlide-${COMMIT_TAG}-1.all.rock" https://${ROCKS_USERNAME}:${ROCKS_PASSWORD}@rocks.tarantool.org
