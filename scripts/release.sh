#!/bin/bash

SCRIPTPATH="$( cd "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"

cd $SCRIPTPATH/..

tarantoolctl rocks make
tarantoolctl rocks new_version --tag $1
tarantoolctl rocks make graphqlide-$1-1.rockspec
tarantoolctl rocks pack graphqlide $1
