import React, { Component } from 'react';
import Hotkeys from 'react-hot-keys';
import { css, cx } from '@emotion/css'
import { GraphiQL, ToolbarSelect, ToolbarGroup } from 'graphiql';
import GraphiQLExplorer from './graphiql-explorer';
import {
  buildClientSchema,
  getIntrospectionQuery,
  parse,
  isNonNullType,
  isLeafType
} from 'graphql';
import { saveAs } from 'file-saver';
import type { GraphQLSchema } from 'graphql';
import prettier from 'prettier/standalone';
import parserGraphql from 'prettier/parser-graphql';
import { CustomStorage } from './custom-storage';

import 'graphiql/graphiql.css';

const DEFAULT_TIMEOUT = 5000

const styles = {
  container: css`
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: row;
  `
}

const DEFAULT_QUERY = '';

const prettify = (query : string) : string =>
  prettier.format(query, {
    parser: 'graphql',
    plugins: [parserGraphql],
    printWidth: 60,
  });

type GraphQLIDEState = {
  schema ?: GraphQLSchema,
  query : string,
  explorerIsOpen : boolean,
  schemaSelected : string,
  reloadSchema : boolean,
  latency : string,
  status : string,
  statusColor : string,
  statusBackgroundColor : string,
};

class GraphQLIDE extends Component<any, GraphQLIDEState> {
  _graphiql : GraphiQL;
  _storage : CustomStorage = new CustomStorage();

  _getDefaultSchema = () : string => {
    let selection = null

    if (typeof window.__tarantool_variables !== 'undefined' &&
    typeof window.__tarantool_variables.graphQLIDEPath !== 'undefined') {
      Object.entries(window.__tarantool_variables.graphQLIDEPath).forEach((name) => {
        if (typeof name[0] !== 'undefined' && typeof name[1].default !== 'undefined' && name[1].default === true) {
          selection = name[0]
        }
      });

      if (selection === null && Object.entries(window.__tarantool_variables.graphQLIDEPath).length > 0) {
        selection = Object.entries(window.__tarantool_variables.graphQLIDEPath)[0][0]
      }
    }
    return selection
  };

  state = {
    schema: null,
    query: DEFAULT_QUERY,
    explorerIsOpen: false,
    schemaSelected: this._getDefaultSchema(),
    reloadSchema: false,
    latency: '-',
    status: '-',
    statusColor: 'black',
    statusBackgroundColor: 'lightgrey'
  };

  _getGraphQLEndpoint = () : string => {
    const schemaSelected = this.state.schemaSelected ? this.state.schemaSelected : this._graphiql.state.schemaSelected

    let endpoint
    let options = {}

    if (typeof window.__tarantool_variables !== 'undefined' &&
      typeof window.__tarantool_variables.graphQLIDEPath !== 'undefined') {
      if (typeof schemaSelected !== 'undefined' && schemaSelected !== '') {
        Object.entries(window.__tarantool_variables.graphQLIDEPath).forEach((name) => {
          if (typeof name[1].default !== 'undefined' && typeof name[0] !== 'undefined' && name[0] === schemaSelected) {
            endpoint = name[1].path
            if ('options' in name[1]) { options = name[1].options }
          }
        })
      }
    }

    endpoint = '/' + endpoint
    if (!('descriptions' in options)) { options.descriptions = true }
    if (!('specifiedByUrl' in options)) { options.specifiedByUrl = true }
    if (!('directiveIsRepeatable' in options)) { options.directiveIsRepeatable = true }
    return { endpoint, options }
  }

  _fetchWrapper = (url, options, timeout) => {
    const { ...request } = options;
    const controller = new AbortController();
    const { signal } = controller;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("Request timeout"));
        controller.abort();
      }, timeout);
      fetch(url, { signal, ...request })
        .finally(() => clearTimeout(timer))
        .then(resolve, reject);
    });
  };

  _fetcher = async(graphQLParams : Record<string, unknown>) : Record<string, unknown> => {
    if (typeof graphQLParams['variables'] === 'undefined') {
      graphQLParams['variables'] = {};
    }

    const endpoint = this._getGraphQLEndpoint().endpoint

    if (typeof endpoint === 'undefined') {
      return '{}'
    }

    const start = performance.now()
    const data = await this._fetchWrapper(
      endpoint,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json; charset=utf-8',
          Schema: this.state.schemaSelected
        },
        body: JSON.stringify(graphQLParams)
      },
      DEFAULT_TIMEOUT
    )
      .then((res) => res)
      .catch((error) => {
        return error;
      })

    const finish = performance.now();
    const latency = (finish - start).toFixed(0).toString();

    if (!data?.status) {
      this.setState({
        latency: latency,
        status: ' N/A ',
        statusColor: 'black',
        statusBackgroundColor: 'lightgrey',
        reloadSchema: false
      });
    } else {
      this.setState({
        latency: latency,
        status: (data.status + ' ' + (data.status < 400 ? 'OK' : 'Fail')),
        statusColor: 'white',
        statusBackgroundColor: data.status < 400 ? '#7EBC59' : 'red',
        reloadSchema: false
      });
    }

    const json = (function(raw) {
      try {
        return raw.json();
      } catch (err) {
        if (raw.message) {
          return {errors: [{ message: raw.message}]}
        } else {
          return {errors: [{ message: "JSON cannot be decoded"}]}
        }
      }
    })(data);

    return json;
  }

  _defaultGetDefaultFieldNames(type : GraphQLType) {
    if (!('getFields' in type)) {
      return [];
    }
    const fields = type.getFields();
    const leafFieldNames : Array<string> = [];
    Object.keys(fields).forEach(fieldName => {
      if (isLeafType(fields[fieldName].type) ||
        (
          isNonNullType(fields[fieldName].type) &&
          fields[fieldName].type.ofType &&
          isLeafType(fields[fieldName].type.ofType)
        )) {
        leafFieldNames.push(fieldName);
      }
    });
    return leafFieldNames;
  }

  componentDidMount() {
    document.querySelector('.topBar').style = 'padding: 0px 14px 0px;'
    const options = this._getGraphQLEndpoint().options
    const defaultSchema = this._getDefaultSchema();
    this._fetcher({
      query: getIntrospectionQuery(options)
    }).then(result => {
      this._storage.schema = 'graphqlide:' + defaultSchema ?? 'unknown';
      this.setState({ schema: buildClientSchema(result.data), reloadSchema: false });
    });
  }

  _handleInspectOperation = (
    cm : any,
    mousePos : { line : number, ch : number }
  ) => {
    const parsedQuery = parse(this.state.query || '');

    if (!parsedQuery) {
      console.error('Couldn\'t parse query document');
      return null;
    }

    const token = cm.getTokenAt(mousePos);
    const start = { line: mousePos.line, ch: token.start };
    const end = { line: mousePos.line, ch: token.end };
    const relevantMousePos = {
      start: cm.indexFromPos(start),
      end: cm.indexFromPos(end)
    };

    const position = relevantMousePos;

    const def = parsedQuery.definitions.find(definition => {
      if (!definition.loc) {
        console.log('Missing location information for definition');
        return false;
      }

      const { start, end } = definition.loc;
      return start <= position.start && end >= position.end;
    });

    if (!def) {
      console.error(
        'Unable to find definition corresponding to mouse position'
      );
      return null;
    }

    const operationKind =
      def.kind === 'OperationDefinition'
        ? def.operation
        : def.kind === 'FragmentDefinition'
          ? 'fragment'
          : 'unknown';

    const operationName =
      def.kind === 'OperationDefinition' && !!def.name
        ? def.name.value
        : def.kind === 'FragmentDefinition' && !!def.name
          ? def.name.value
          : 'unknown';

    const selector = `.graphiql-explorer-root #${operationKind}-${operationName}`;

    const el = document.querySelector(selector);
    el && el.scrollIntoView();
  };

  _handleEditQuery = (query : string) : void => this.setState({ query });

  _handleToggleExplorer = () => {
    this.setState({ explorerIsOpen: !this.state.explorerIsOpen });
  };

  _handleToggleDocExplorer = () => {
    this._graphiql.setState({ docExplorerOpen: !this._graphiql.state.docExplorerOpen });
  };

  _handleSaveQuery = () => {
    const queryEditor = this._graphiql.getQueryEditor();
    const query = queryEditor && queryEditor.getValue();
    if (!query || query.length === 0) {
      return;
    }
    const Query = new Blob([query], { type: 'application/graphql;charset=utf-8' });
    saveAs(Query, 'query1.graphql');
  };

  _handleSaveResponse = () => {
    const response = this._graphiql.state.response;
    if (!response || response.length === 0) {
      return;
    }
    const Response = new Blob([response], { type: 'application/json;charset=utf-8' });
    saveAs(Response, 'response.json');
  };

  _handleCopyResponse = () => {
    const response = this._graphiql.state.response;
    if (!response || response.length === 0) {
      return;
    }

    navigator.clipboard.writeText(response).then(
      ()=>true,
      ()=>{ console.error('Response copying failed!') }
    );
  }

  _handlePrettifyQuery = () => {
    const editor = this._graphiql.getQueryEditor();
    const editorContent = editor?.getValue() ?? '';
    const prettifiedEditorContent = prettify(editorContent);

    if (prettifiedEditorContent !== editorContent) {
      editor?.setValue(prettifiedEditorContent);
    }
  }

  componentDidUpdate() {
    if (this.state.reloadSchema) {
      const options = this._getGraphQLEndpoint().options;
      this._fetcher({
        query: getIntrospectionQuery(options)
      }).then(result => {
        this.setState({ schema: buildClientSchema(result.data), reloadSchema: false });
      });
    }
  }

  _handleSchemaSelect = async(selection) => {
    this._storage.schema = 'graphqlide:' + selection ?? 'unknown';
    const queries = this._graphiql?._historyStore.fetchAllQueries() ?? [];

    if (this._graphiql._queryHistory) {
      this._graphiql._queryHistory.historyStore.queries = queries;
      this._graphiql._queryHistory.historyStore.history.items =
        this._graphiql._historyStore.history.fetchAll();
      this._graphiql._queryHistory.historyStore.favorite.items =
        this._graphiql._historyStore.favorite.fetchAll();
    }

    this?._graphiql?._queryHistory?.setState({queries : queries});
    this.setState({ schemaSelected: selection, reloadSchema: true });
    this._graphiql?.docExplorerComponent?.reset();
  }

  _schemasMenuReducer() {
    if (typeof window.__tarantool_variables !== 'undefined' &&
        typeof window.__tarantool_variables.graphQLIDEPath !== 'undefined') {
      const schemas = Object.entries(window.__tarantool_variables.graphQLIDEPath).sort()

      return (
        <div>
          <ToolbarSelect
            onSelect={(selection) => this._handleSchemaSelect(selection)}
            title="Select schema"
          >
            {schemas.map(schema =>
              <GraphiQL.SelectOption
                label={schema[0]}
                value={schema[0]}
                selected={this.state.schemaSelected === schema[0]}
              />
            )}
          </ToolbarSelect>
        </div>
      )
    }
  }

  onKeyDown(keyName) {
    switch (keyName) {
    case 'alt+shift+e':
      this._handleToggleExplorer()
      break;
    case 'alt+shift+h':
      this._graphiql.handleToggleHistory()
      break;
    case 'alt+shift+p':
      this._handlePrettifyQuery()
      break;
    case 'alt+shift+m':
      this._graphiql.handleMergeQuery()
      break;
    case 'alt+shift+c':
      this._graphiql.handleCopyQuery()
      break;
    case 'alt+shift+x':
      this._handleCopyResponse()
      break;
    case 'alt+shift+q':
      this._handleSaveQuery()
      break;
    case 'alt+shift+r':
      this._handleSaveResponse()
      break;
    case 'alt+shift+d':
      this._handleToggleDocExplorer()
      break;
    default:
      break;
    }
  }

  render() {
    const { query, schema } = this.state;
    const keyNames = 'alt+shift+e,alt+shift+h,alt+shift+p,alt+shift+m,\
                      alt+shift+c,alt+shift+x,alt+shift+q,alt+shift+r,alt+shift+d'
    return (
      <Hotkeys
        keyName={keyNames}
        onKeyDown={this.onKeyDown.bind(this)}
        filter={() => {
          return true;
        }}
      >
        <div className={cx(styles.container, 'graphiql-container')} >
          <GraphiQLExplorer
            schema={schema}
            query={query}
            onEdit={this._handleEditQuery}
            onRunOperation={operationName => this._graphiql.handleRunQuery(operationName)}
            explorerIsOpen={this.state.explorerIsOpen}
            onToggleExplorer={this._handleToggleExplorer}
          />
          <GraphiQL
            ref={ref => (this._graphiql = ref)}
            fetcher={this._fetcher}
            schema={schema}
            query={query}
            onEditQuery={this._handleEditQuery}
            getDefaultFieldNames={this._defaultGetDefaultFieldNames}
            docExplorerOpen={false}
            headerEditorEnabled={false}
            storage={this._storage}
          >
            <GraphiQL.Toolbar>
              {this._schemasMenuReducer()}
              <GraphiQL.Button
                onClick={() => this._handleToggleExplorer()}
                label="Explorer"
                title="Toggle Explorer (Alt+Shift+E)"
              />
              <GraphiQL.Button
                onClick={() => this._graphiql.handleToggleHistory()}
                label="History"
                title="Show History (Alt+Shift+H)"
              />
              <GraphiQL.Button
                onClick={() => this._handlePrettifyQuery()}
                label="Prettify"
                title="Prettify Query (Alt+Shift+P)"
              />
              <GraphiQL.Button
                onClick={() => this._graphiql.handleMergeQuery()}
                label="Merge"
                title="Merge Query (Alt+Shift+M)"
              />
              <GraphiQL.Menu
                label="Copy"
                title="Copy..."
              >
                <GraphiQL.MenuItem
                  onSelect={() => this._graphiql.handleCopyQuery()}
                  label="Query"
                  title="Copy Query (Alt+Shift+C)"
                />
                <GraphiQL.MenuItem
                  onSelect={() => this._handleCopyResponse()}
                  label="Response"
                  title="Copy Response (Alt+Shift+X)"
                />
              </GraphiQL.Menu>
              <GraphiQL.Menu
                label="Save"
                title="Save..."
              >
                <GraphiQL.MenuItem
                  label="Query"
                  title="Save query (Alt+Shift+Q)"
                  onSelect={() => this._handleSaveQuery()}
                />
                <GraphiQL.MenuItem
                  label="Response"
                  title="Save response (Alt+Shift+R)"
                  onSelect={() => this._handleSaveResponse()}
                />
              </GraphiQL.Menu>
              <ToolbarGroup>
                <div>
                  <span style={{
                    marginLeft: '100px',
                    color: this.state.statusColor,
                    backgroundColor: this.state.statusBackgroundColor,
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '3px 11px 5px',
                    borderRadius: '3px',
                    border: 0,
                  }}
                  >
                    <b>{this.state.status}</b>
                  </span>
                  <span style={{
                    marginLeft: '20px'
                  }}
                  >
                    <b>{'\u23F1'}&nbsp;{this.state.latency}&nbsp;ms</b>
                  </span>
                </div>
              </ToolbarGroup>
            </GraphiQL.Toolbar>
            <GraphiQL.Footer>
            </GraphiQL.Footer>
          </GraphiQL>
        </div>
      </Hotkeys>
    );
  }
}

export default GraphQLIDE;
