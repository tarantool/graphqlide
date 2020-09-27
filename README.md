# Tarantool Cartridge WebUI GraphiQL IDE plugin

This plugin is used to add GrapiQL IDE functionality into Tarantool Cartridge WebUI

Based on:

- [Tarantool 2.x.x](https://www.tarantool.io/en/download/?v=2.4)
- [Tarantool Cartridge 2.3.0](https://github.com/tarantool/cartridge)
- [Tarantool Frontend Core 7.3.0](https://github.com/tarantool/frontend-core)
- [GraphiGL 1.0.5](https://github.com/graphql/graphiql)
- [GraphiQL Explorer 0.6.2](https://github.com/OneGraph/graphiql-explorer)

GraphQLIDE looks like:

![GraphQLIDE](https://github.com/no1seman/graphiqlide/blob/master/resources/graphqlide.jpg "GraphQLIDE")

## Usage

!!! Attention Build tested only on Debian-based GNU linux!

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

Also "npm run build-rock" to build the rock

After build completion you will get:

graphiqlide-version.all.rock
graphiqlide rock installed to graphiqlide/.rocks dir

## Install

### Install rock

Simply run ./script/install_rock.sh from the root of Tarantool Cartridge App root path or make it manually from console:

```bash
cd <Tarantool Cartridge application dir>
tarantoolctl rocks install <path to rock file>/graphqlide-version.all.rock
```

### Add plugin to your Tarantool Cartridge App

To get GraphQLIDE work just add to Tarantool Cartridge application init.lua the following code:

```lua
require('graphqlide').init()
```

## Development

For debug & development purposes VS code will be used.
Use F5 to run app or Shift-Crtl-B to run production build task

Useful commands:

- `npm run build - builds production project`
- `npm run start - run application without need to integrate it into Tarantool Cartridge App. Useful for development purposes`
- `npm run build-rock - builds production project and bundles it into rock`
