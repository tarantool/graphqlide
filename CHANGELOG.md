# Changelog

## Unreleased

- `add add_cartridge_api_endpoint() and remove_cartridge_api_endpoint() functions`

## 0.0.12

- `fixed GraphiQL topBar container styles`

## 0.0.11

- `add extended graphql schema fields options`
- `update @tarantool.io/frontend-core@7.8.0 to @tarantool.io/frontend-core@7.11.0`
- `update @tarantool.io/ui-kit@0.37.0 to @tarantool.io/ui-kit@0.42.0`

## 0.0.10

- `update @tarantool.io/ui-kit@0.35.0 to @tarantool.io/ui-kit@0.37.0`
- `update @tarantool.io/frontend-core@7.5.0 to @tarantool.io/frontend-core@7.8.0`
- `update graphiql@1.4.0 to graphiql@1.4.2`
- `include graphiql-explorer@0.6.3 sources to project instead of importing external module`
- `fix isLeaf check fields auto-selection for non-nullable scalars and enums`
- `revert separating Tarantool Cartridge role and pure Tarantool module logic`
- `add support for multiple schemas`
- `fix non-working js/ts code linting and fix multiple lint warnings`
- `add tests for lua part of this module`
- `update README.md`

## 0.0.9

- `add support for pure-Tarantool`
- `fix module rockspec to avoid rebuild during install`
- `make possible to use module with pure Tarantool without Tarantool Cartridge`
- `separate Tarantool Cartridge role and pure Tarantool module logic`
- `add front_init() method for pure-Tarantool`
  
## 0.0.8

- `updated README.md`
- `added Tarantool Cartridge role`
- `added set_endpoint() method to set GraphQLAPI endpoint`
- `added get_endpoint() method to get GraphQLAPI endpoint`
- `added VERSION parameter`
- `fixed CAHNGELOG.md styles`
  
## 0.0.7

Maintanance release with a number of minor changes:

- `update react-dev-utils@11.0.3 to react-dev-utils@11.0.4`
- `update @tarantool.io/ui-kit@0.34.0 to @tarantool.io/ui-kit@0.35.0`
- `minor README.md fixes`
  
## 0.0.6

Maintanance release with a number of minor changes:

- `update readme`
- `use frontend-core vanilla menu reducer instead of custom and also simplify module code`
- `finally change GraphiQLIDE to GraphQLIDE`

## 0.0.5

Maintanance release with a number of minor changes:

- `replace vulnerable uglifyjs-webpack-plugin with terser-webpack-plugin@4.2.3`
- `update @tarantool.io/frontend-core@7.3.0 to @tarantool.io/frontend-core@7.5.0`
- `update @tarantool.io/ui-kit@0.23.0 to @tarantool.io/ui-kit@0.34.0`
- `update react-dev-utils@9.0.1 to react-dev-utils@11.0.3`

## 0.0.4

Maintanance release with a number of minor changes:

- `proper check of __tarantool_variables.graphqlidePath variable`

## 0.0.3

Maintanance release with a number of minor changes:

- `graphiql@1.0.5 upgraded to graphiql@1.4.0`
- `axios removed cause it's not used anymore`
- `add setting graphql API endpoint from lua-api`

## 0.0.2

Maintanance release with a number of minor changes:

- `graphiql@1.0.3 upgraded to graphiql@1.0.5`
- `module menu icon changed`
- `fixed not needed map bundling in production mode. Bundle size in production mode drammatically reduced`
- `simplified module coonection to Tarantool Cartridge. Now only single line needed to add. Old connection style also supported`
- `'build_rock.sh' and 'install_rock.sh' scripts moved to ./scripts folder`
- `removed plop because it's not needed any more`
- `fixed bug when in some circumstances dev run ('npm run start') didn't work`
- `fixed main graphqlide container properties`
- `added .vscode folder with settings for MS Visual Studio Code`
- `fixed multiple lint issues`
- `fixed README`
- `added this CHANGELOG`

## 0.0.1

Initial Version.

Includes:

- `graphiql@1.0.3`
- `graphiql-explorer@0.6.2`
