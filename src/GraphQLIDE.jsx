// @ts-check

import React, { Component } from 'react';
import { css, cx } from 'emotion'
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
  schema: ?GraphQLSchema,
  query: string,
  explorerIsOpen: boolean,
  schemaSelected: string,
  reloadSchema: boolean,
};

class GraphQLIDE extends Component<{}, GraphQLIDEState> {
  _graphiql: GraphiQL;

  _getDefaultSchema = (): String => {
    let selection = null

    if (typeof window.__tarantool_variables !== 'undefined' &&
    typeof window.__tarantool_variables.graphQLIDEPath !== 'undefined') {
      Object.entries(window.__tarantool_variables.graphQLIDEPath).forEach((name) => {
        if (typeof name[0] !== 'undefined' && typeof name[1].default !== 'undefined' && name[1].default === true) {
          selection = name[0]
        }
      })

      if (selection === null && Object.entries(window.__tarantool_variables.graphQLIDEPath).length > 0) {
        selection = Object.entries(window.__tarantool_variables.graphQLIDEPath)[0][0]
      }
    }
    return selection
  }

  state = {
    schema: null,
    query: DEFAULT_QUERY,
    explorerIsOpen: false,
    schemaSelected: this._getDefaultSchema(),
    reloadSchema: true
  };

  _getGraphQLEndpoint = (): String => {
    const schemaSelected = this.state.schemaSelected ? this.state.schemaSelected : this._graphiql.state.schemaSelected

    let endpoint

    if (typeof window.__tarantool_variables !== 'undefined' &&
      typeof window.__tarantool_variables.graphQLIDEPath !== 'undefined') {
      if (typeof schemaSelected !== 'undefined' && schemaSelected !== '') {
        Object.entries(window.__tarantool_variables.graphQLIDEPath).forEach((name) => {
          if (typeof name[1].default !== 'undefined' && typeof name[0] !== 'undefined' && name[0] === schemaSelected) {
            endpoint = name[1].path
          }
        })
      }
    }
    return endpoint
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

  _fetcher = async(graphQLParams: Object): Object => {
    if (typeof graphQLParams['variables'] === 'undefined') {
      graphQLParams['variables'] = {};
    }

    const endpoint = this._getGraphQLEndpoint()

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

  _defaultGetDefaultFieldNames(type: GraphQLType) {
    if (!('getFields' in type)) {
      return [];
    }
    const fields = type.getFields();
    // Include all leaf-type fields and nonNull leaf-type fields.
    const leafFieldNames: Array<string> = [];
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
    this._fetcher({
      query: getIntrospectionQuery()
    }).then(result => {
      const editor = this._graphiql.getQueryEditor();
      editor.setOption('extraKeys', {
        ...(editor.options.extraKeys || {}),
        'Shift-Alt-LeftClick': this._handleInspectOperation
      });

      this.setState({ schema: buildClientSchema(result.data), reloadSchema: false });
    });
  }

  _handleInspectOperation = (
    cm: any,
    mousePos: { line: Number, ch: Number }
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

  _handleEditQuery = (query: string): void => this.setState({ query });

  _handleToggleExplorer = () => {
    this.setState({ explorerIsOpen: !this.state.explorerIsOpen });
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

  componentDidUpdate() {
    if (this.state.reloadSchema) {
      this._fetcher({
        query: getIntrospectionQuery()
      }).then(result => {
        const editor = this._graphiql.getQueryEditor();
        editor.setOption('extraKeys', {
          ...(editor.options.extraKeys || {}),
          'Shift-Alt-LeftClick': this._handleInspectOperation
        });

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

  render() {
    const { query, schema } = this.state;
    return (
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
        >
          <GraphiQL.Toolbar>
            {this._schemasMenuReducer()}
            <GraphiQL.Button
              onClick={this._handleToggleExplorer}
              label="Explorer"
              title="Toggle Explorer"
            />
            <GraphiQL.Button
              onClick={() => this._graphiql.handleToggleHistory()}
              label="History"
              title="Show History"
            />
            <GraphiQL.Button
              onClick={() => this._graphiql.handlePrettifyQuery()}
              label="Prettify"
              title="Prettify Query (Shift-Ctrl-P)"
            />
            <GraphiQL.Button
              onClick={() => this._graphiql.handleMergeQuery()}
              title="Merge Query (Shift-Ctrl-M)"
              label="Merge"
            />
            <GraphiQL.Button
              onClick={() => this._graphiql.handleCopyQuery()}
              title="Copy Query (Shift-Ctrl-C)"
              label="Copy"
            />
            <GraphiQL.Menu
              label="Save"
              title="Save..."
            >
              <GraphiQL.MenuItem
                label="Query"
                title="Save query"
                onSelect={() => this._handleSaveQuery()}
              />
              <GraphiQL.MenuItem
                label="Response"
                title="Save response"
                onSelect={() => this._handleSaveResponse()}
              />
            </GraphiQL.Menu>
          </GraphiQL.Toolbar>
          <GraphiQL.Footer>
          </GraphiQL.Footer>
        </GraphiQL>
      </div>
    );
  }
}

export default GraphQLIDE;
