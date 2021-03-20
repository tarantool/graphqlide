#!/bin/sh
# Call this script to install dependencies

set -e

tarantoolctl rocks install http 1.1.0
tarantoolctl rocks install checks
tarantoolctl rocks install frontend-core
