#!/bin/sh
# Call this script to install dependencies

set -e

tarantoolctl rocks install cartridge 2.7.3
tarantoolctl rocks install luatest 0.5.7
tarantoolctl rocks install luacov 0.13.0
tarantoolctl rocks install luacheck 0.26.0

