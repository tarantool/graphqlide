import React, { Component } from 'react';
import Hotkeys from 'react-hot-keys';
import { css, cx } from '@emotion/css'
import { GraphiQL, ToolbarSelect } from 'graphiql';
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

type GraphQLIDEState = {
  schema ?: GraphQLSchema,
  query : string,
  explorerIsOpen : boolean,
  schemaSelected : string,
  reloadSchema : boolean,
};

class GraphQLIDE extends Component<any, GraphQLIDEState> {
  _graphiql : GraphiQL;

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
    reloadSchema: true
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
    return new Promise((resolve, reject) => {
      fetch(url, options).then(resolve, reject);

      if (timeout) {
        const e = new Error('Connection timed out');
        setTimeout(reject, timeout, e);
      }
    });
  }

  _fetcher = async(graphQLParams : Record<string, unknown>) : Record<string, unknown> => {
    if (typeof graphQLParams['variables'] === 'undefined') {
      graphQLParams['variables'] = {};
    }

    const endpoint = this._getGraphQLEndpoint().endpoint

    if (typeof endpoint === 'undefined') {
      return '{}'
    }

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
    );

    const json = (function(raw) {
      try {
        return raw.json();
      } catch (err) {
        return '{}';
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
    this._fetcher({
      query: getIntrospectionQuery(options)
    }).then(result => {
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

  componentDidUpdate() {
    if (this.state.reloadSchema) {
      const options = this._getGraphQLEndpoint().options
      this._fetcher({
        query: getIntrospectionQuery(options)
      }).then(result => {
        this.setState({ schema: buildClientSchema(result.data), reloadSchema: false });
      });
    }
  }

  _handleSchemaSelect = async(selection) => {
    this.setState({ schemaSelected: selection, reloadSchema: true });
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
      this._graphiql.handlePrettifyQuery()
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
                onClick={() => this._graphiql.handlePrettifyQuery()}
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
