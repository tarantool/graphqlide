# Tarantool Cartridge WebUI GraphiQL IDE plugin

This plugin is used to add GrapiQL IDE functionality into Tarantool Cartridge WebUI
Based on:

-   [Tarantool 2.4.2](https://www.tarantool.io/en/download/?v=2.4)
-   [Tarantool Cartridge 2.2.0](https://github.com/tarantool/cartridge)
-   [Tarantool Front-end Core 7.2.0](https://github.com/tarantool/frontend-core)
-   [GraphiGL 1.0.3](https://github.com/graphql/graphiql)
-   [GraphiQL Explorer 0.6.2](https://github.com/OneGraph/graphiql-explorer)

See how its look like:

<p align="center"><img width="640" alt="grahpiqlide" src="https://github.com/no1seman/graphiqlide/blob/master/resources/cartridgegraphiql.jpg"></p>

# Usage

!!! Attention Build Tested only on Ubuntu 18.04

## Build

1. clone repo:

```
git clone git@github.com:no1seman/graphiqlide.git graphiqlide
cd graphiqlide
```

2. build:

```
tarantoolctl rocks make
tarantoolctl rocks pack graphqlide version
```

PS Also "build_rock.sh" may be used to automate build process

After build completion you will get:

graphiqlide-version.all.rock
graphiqlide rock installed to graphiqlide/.rocks dir

3. install:
Simply run install_rock.sh from the path where rock should be installed

## Run

Also for debug & development purposes VS code will be used.

Use F5 to run app or Shift-Crtl-B to run production build task

## Install

```
cd <Tarantool Cartridge application dir>
tarantoolctl rocks install <path to rock file>/graphqlide-scm-1.all.rock
```

To get it work just add to Tarantool Cartridge application init.lua the following code:

```
local front = require('frontend-core')
local graphqlide = require('graphqlide.bundle')
if graphqlide and front then
    front.add('graphqlide', graphqlide)
end
```
