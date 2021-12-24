# Changelog

## 0.0.17

- `update graphiql@1.5.1 to graphiql@1.5.16`
- `update graphql@15.7.2 to graphiql@16.2.0`
- `update eslint@7.x and dependencies to eslint@8.x`
- `update @tarantool.io/frontend-core@7.12.1 to  @tarantool.io/frontend-core8.0.0`
- `update webpack@5.64.0 to webpack@5.65.0`
- `update all dependencies to latest versions`
- `remove most of unused dependencies`
- `added keyboard shortcuts to all main menu buttons`
- `added 'Copy response' menu item and suitable shortcut`
- `added description of main menu items and it's keyboard shortcuts to README.md`
- `added Explorer support of all kinds of lists`
- `all codebase converted from flow to typescript`
- `eslint tuned for typescript after conversion from flow to typescript`
- `many minor UI fixes`
- `use prettier to additionally prettify GraphQL code`
- `separate requests history by schemas`
- `added Explorer support of interface fragments`
- `fixed Explorer fragments rename not worked properly`
- `fixed Explorer fragment remove is not remove fragmentSpreads`
- `fixed not injecting module version in release workflow`

## 0.0.16

- `update graphiql@1.4.6 to graphiql@1.5.1`
- `update babel-jest@26.3.0 to babel-jest@27.3.1`
- `update jest@26.4.2 to jest@27.3.1`
- `update react-dev-utils@11.0.4 to react-dev-utils@12.0.0-next.47`
- `update svg-sprite-loader@5.0.0 to svg-sprite-loader@6.0.11`
- `update svgo@2.3.0 to svgo@2.8.0`
- `update webpack-dev-server@3.11.2 to webpack-dev-server@4.4.0`
- `update @babel/*@7.10.*-7.11.* to @babel/*@7.16.*`
- `update webpack@4.46.0 to webpack@5.64.0 and all related dependencies`
- `replace emotion@10.0.27 with @emotion/css@11.5.0`
- `update graphql@15.5.0 to graphql@15.7.2`
- `update multiple dependencies to latest versions`

## 0.0.15

- `update @tarantool.io/frontend-core@7.11.0 to @tarantool.io/frontend-core@7.12.0`
- `update @tarantool.io/ui-kit@0.42.0 to @tarantool.io/ui-kit@0.50.1`
- `update graphiql@1.4.2 to graphiql@1.4.6`
- `fixed https://github.com/tarantool/graphqlide/issues/11`
- `fix paths after moving repo to github.com/tarantool`

## 0.0.14

- `fix backward compatibility: set_endpoint() now removes side-slashes before saving endpoint path`

## 0.0.13

- `added add_cartridge_api_endpoint() and remove_cartridge_api_endpoint() methods to simplify adding/removing Cartridge Schema`
- `added set_default() method to change default schema`
- `update luatest to 0.5.6`
- `improve build/install/release scripts`
- `update README.md`

## 0.0.12

- `fixed GraphiQL topBar container styles`

## 0.0.11

- `added extended graphql schema fields options`
- `update @tarantool.io/frontend-core@7.8.0 to @tarantool.io/frontend-core@7.11.0`
- `update @tarantool.io/ui-kit@0.37.0 to @tarantool.io/ui-kit@0.42.0`

## 0.0.10

- `update @tarantool.io/ui-kit@0.35.0 to @tarantool.io/ui-kit@0.37.0`
- `update @tarantool.io/frontend-core@7.5.0 to @tarantool.io/frontend-core@7.8.0`
- `update graphiql@1.4.0 to graphiql@1.4.2`
- `include graphiql-explorer@0.6.3 sources to project instead of importing external module`
- `fix isLeaf check fields auto-selection for non-nullable scalars and enums`
- `revert separating Tarantool Cartridge role and pure Tarantool module logic`
- `added support for multiple schemas`
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
