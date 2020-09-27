#!/bin/bash

cd $(dirname $(readlink -f $0))/..
tarantoolctl rocks make
tarantoolctl rocks pack graphqlide