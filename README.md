# Tarantool Cartridge WebUI GraphQL IDE plugin

This plugin is used to add GraphQL IDE functionality into Tarantool Cartridge WebUI

Based on:

- [Tarantool 1.10.x or 2.x.x](https://www.tarantool.io/en/download/)
- [Tarantool Cartridge 2.3.0+](https://github.com/tarantool/cartridge)
- [Tarantool Frontend Core 7.5.0](https://github.com/tarantool/frontend-core)
- [GraphiQL 1.4.0](https://github.com/graphql/graphiql)
- [GraphiQL Explorer 0.6.2](https://github.com/OneGraph/graphiql-explorer)

GraphQL IDE interface:

![GraphQL IDE](https://github.com/no1seman/graphqlide/blob/master/resources/graphqlide.jpg "GraphQL IDE")

## Install pre-built rock

Simply run from the root of Tarantool Cartridge App root the following

```sh
    cd <tarantool-cartridge-application-dir>
    tarantoolctl rocks install https://github.com/no1seman/graphqlide/releases/download/0.0.8/graphqlide-0.0.8-1.all.rock
```

## Lua API

### Init

`init(endpoint)` used to initialize graphqlide module.

where:

* `endpoint` (`?string`) - URI-endpoint of GraphQL API. Parameter is optional, if not set - default '/admin/api' endpoint used.

Example:

```lua
    local graphqlide = require('graphqlide')
    local endpoint = '/admin/graphql'
    graphqlide.init(endpoint)
```

### Set endpoint

`set_endpoint(endpoint)` method is used to set endpoint in runtime.

where:

* `endpoint` (`string`) - URI-endpoint of GraphQL API. Parameter is mandatory.

Example:

```lua
    local graphqlide = require('graphqlide')
    local endpoint = '/admin/graphql'
    graphqlide.set_endpoint(endpoint)
```

### Get endpoint

`get_endpoint()` method is used to get endpoint.

Returns `endpoint` (`string`).

Example:

```lua
    local graphqlide = require('graphqlide')
    local log = require('log')
    local graphqlide_endpoint = graphqlide.get_endpoint()
    log.info('GraphQL IDE endpoint: %s', graphqlide_endpoint)
```

### Version

GraphQL IDE module and Tarantool Cartridge role has `VERSION` constant to determine which version is installed.

Example:

```lua
    local graphqlide = require('graphqlide')
    local log = require('log')
    log.info('GraphQL IDE version: %s', graphqlide.VERSION)
```

## Add GraphQL IDE to your Tarantool Cartridge App

There are 3 ways to add GraphQL IDE to Tarantool Cartridge application:

1. Add GraphQL IDE initialization code to init.lua:

```lua
    ...

    local ok, err = cartridge.cfg({
        roles = {
            ...
        },
    })

    assert(ok, tostring(err))

    -- Init GraphQL IDE
    local endpoint = '/admin/graphql'
    require('graphqlide').init(endpoint)
    
    ...
```

**Note:** graphqlide.init() must be called after cartridge.cfg()

2. Add GraphQL IDE initialization code to Role into init() function:

```lua
    ...

    local function init(opts) -- luacheck: no unused args
        if opts.is_master then
            ...
        end
        ...

        -- Init GraphQL IDE
        local endpoint = '/admin/graphql'
        require('graphqlide').init(endpoint)

        return true
    end

    ...
```

3. Add GraphQL IDE Tarantool Cartridge role as dependency of other Tarantool Cartridge role:

```lua
    ...

    return {
        role_name = 'app.roles.custom,',
        init = init,
        dependencies = {
            'cartridge.roles.graphqlide',
        }
    }
```

In this case may need to set endpoint of GraphQL API. The best way to it simply call `set_endpoint()` method from `init()` of Tarantool Cartridge role:

```lua
    local graphqlide = require('graphqlide')
    ...
    local function init(opts)
        if opts.is_master then
        ...
        end
        ...
        graphqlide.set_endpoint('/admin/graphql')
        ...
    end
```

or use `cartridge.service_get()` method:

```lua
    local cartridge = require('cartridge')
    ...
    local function init(opts)
        if opts.is_master then
        ...
        end
        ...
        cartridge.service_get('graphqlide').set_endpoint('/admin/graphql')
        ...
    end
```

## Build from sources

### Prerequisites

To build rock you will need the following to be installed:

- [nodejs](https://nodejs.org/)
- [Tarantool 1.10.x or 2.x.x](https://www.tarantool.io/en/download/) 

### Clone repo and install nodejs modules

```sh
    git clone git@github.com:no1seman/graphqlide.git graphqlide
    cd graphqlide
    npm i
```
### Build rock

```sh
    tarantoolctl rocks make
    tarantoolctl rocks pack graphqlide version
```

Also you can use `npm run build-rock` to build the rock.

After build completion you will get:

- packed graphqlide rock: `graphqlide/graphqlide-0.0.8-1.all.rock`
- graphqlide rock installed to: graphqlide/.rocks/tarantool

### Install built rock

Simply run from the root of Tarantool Cartridge App root the following:

```sh
    cd <Tarantool Cartridge application dir>
    tarantoolctl rocks install <path_to_rock_file>/graphqlide-0.0.8-1.all.rock
```

## Development

For debug & development purposes VS code will be used.
Use F5 to run app or Shift-Crtl-B to run production build task.

Useful commands:

- `npm run build - to build production module`
- `npm run start - run application without need to integrate it into Tarantool Cartridge App. Useful for development purposes`
- `npm run build-rock - builds production module and bundles it into the rock`
