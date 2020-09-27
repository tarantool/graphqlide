# Tarantool Cartridge WebUI GraphiQL IDE plugin

This plugin is used to add GrapiQL IDE functionality into Tarantool Cartridge WebUI
Based on:

- [Tarantool 2.x.x](https://www.tarantool.io/en/download/?v=2.4)
- [Tarantool Cartridge 2.2.0](https://github.com/tarantool/cartridge)
- [Tarantool Frontend Core 7.2.0](https://github.com/tarantool/frontend-core)
- [GraphiGL 1.0.3](https://github.com/graphql/graphiql)
- [GraphiQL Explorer 0.6.2](https://github.com/OneGraph/graphiql-explorer)

GraphQLIDE looks like:

![GraphQLIDE](https://github.com/no1seman/graphiqlide/blob/master/resources/cartridgegraphiql.jpg "GraphQLIDE")

## Usage

!!! Attention Build Tested only on Ubuntu 18.04

## Build

### Clone repo

```bash
git clone git@github.com:no1seman/graphiqlide.git graphiqlide
cd graphiqlide
```

### Build rock

```bash
tarantoolctl rocks make
tarantoolctl rocks pack graphqlide version
```

PS Also "build_rock.sh" may be used to automate build process

After build completion you will get:

graphiqlide-version.all.rock
graphiqlide rock installed to graphiqlide/.rocks dir

## Install

Simply run install_rock.sh from the path where rock should be installed

### Install rock

```bash
cd <Tarantool Cartridge application dir>
tarantoolctl rocks install <path to rock file>/graphqlide-scm-1.all.rock
```

### Add plugin to your Tarantool Cartridge App

To get GraphQLIDE work just add to Tarantool Cartridge application init.lua the following code:

```lua
require('graphqlide').init()
```

## Development

Also for debug & development purposes VS code will be used.

Use F5 to run app or Shift-Crtl-B to run production build task
