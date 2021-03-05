# Changelog


## 0.0.5

Maintanance release with a number of minor changes:

`replace vulnerable uglifyjs-webpack-plugin with terser-webpack-plugin@4.2.3`
`update @tarantool.io/frontend-core@7.3.0 to @tarantool.io/frontend-core@7.5.0`
`update @tarantool.io/ui-kit@0.23.0 to @tarantool.io/ui-kit@0.34.0`
`update react-dev-utils@9.0.1 to react-dev-utils@11.0.3`

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
