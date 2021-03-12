#!/bin/bash

SCRIPT=$(readlink -f $0)
SCRIPTPATH=`dirname $SCRIPT`

tarantoolctl rocks install $SCRIPTPATH/../graphqlide-0.0.7-1.all.rock
