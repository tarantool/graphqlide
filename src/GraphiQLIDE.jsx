// @flow

import React, { Component } from 'react';
import { css, cx } from 'emotion'
import GraphiQL from 'graphiql';
import GraphiQLExplorer from 'graphiql-explorer';
import { buildClientSchema, getIntrospectionQuery, parse } from 'graphql';
import { makeDefaultArg, getDefaultScalarArgValue } from './CustomArgs';
import { saveAs } from 'file-saver';
import type { GraphQLSchema } from 'graphql';

import 'graphiql/graphiql.css';

const styles = {
    container: css`
        height: 100vh; 
        width: 100vw;
    `
}

function fetchWrapper(url, options, timeout) {
    return new Promise((resolve, reject) => {
        fetch(url, options).then(resolve, reject);

        if (timeout) {
            const e = new Error('Connection timed out');
            setTimeout(reject, timeout, e);
        }
    });
}

const isLocalhost = Boolean(
    window.location.hostname === 'localhost' ||
    // [::1] is the IPv6 localhost address.
    window.location.hostname === '[::1]' ||
    // 127.0.0.1/8 is considered localhost for IPv4.
    window.location.hostname.match(
        /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
    )
);

async function fetcher(graphQLParams: Object): Object {
    if (typeof graphQLParams['variables'] === 'undefined') {
        graphQLParams['variables'] = {}
    }
    const data = await fetchWrapper(
        isLocalhost ? 'http://192.168.3.153:81/admin/api' : window.location.origin + '/admin/api',
        {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify(graphQLParams)
        },
        5000
    )
    return data.json().catch(() => data.text());
}

const DEFAULT_QUERY = ``;

type GraphiQLIDEState = {
    schema: ?GraphQLSchema,
    query: string,
    explorerIsOpen: boolean,
}

class GraphiQLIDE extends Component<{}, GraphiQLIDEState> {
    _graphiql: GraphiQL;
    state = { schema: null, query: DEFAULT_QUERY, explorerIsOpen: false };

    componentDidMount() {
        fetcher({
            query: getIntrospectionQuery()
        }).then(result => {
            const editor = this._graphiql.getQueryEditor();
            editor.setOption('extraKeys', {
                ...(editor.options.extraKeys || {}),
                'Shift-Alt-LeftClick': this._handleInspectOperation
            });

            this.setState({ schema: buildClientSchema(result.data) });
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

        var token = cm.getTokenAt(mousePos);
        var start = { line: mousePos.line, ch: token.start };
        var end = { line: mousePos.line, ch: token.end };
        var relevantMousePos = {
            start: cm.indexFromPos(start),
            end: cm.indexFromPos(end)
        };

        var position = relevantMousePos;

        var def = parsedQuery.definitions.find(definition => {
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

        var operationKind =
            def.kind === 'OperationDefinition'
                ? def.operation
                : def.kind === 'FragmentDefinition'
                    ? 'fragment'
                    : 'unknown';

        var operationName =
            def.kind === 'OperationDefinition' && !!def.name
                ? def.name.value
                : def.kind === 'FragmentDefinition' && !!def.name
                    ? def.name.value
                    : 'unknown';

        var selector = `.graphiql-explorer-root #${operationKind}-${operationName}`;

        var el = document.querySelector(selector);
        el && el.scrollIntoView();
    };

    _handleEditQuery = (query: string): void => this.setState({ query });

    _handleToggleExplorer = () => {
        this.setState({ explorerIsOpen: !this.state.explorerIsOpen });
    };

    _handleSaveQuery = () => {
        console.log('Save query')
        const queryEditor = this._graphiql.getQueryEditor();
        var query = queryEditor && queryEditor.getValue();
        if (!query || query.length === 0) {
            return;
        }
        var Query = new Blob([query], { type: 'application/graphql;charset=utf-8' });
        saveAs(Query, 'query1.graphql')
    };

    _handleSaveResponse = () => {
        console.log('Save response')
        var response = this._graphiql.state.response;
        if (!response || response.length === 0) {
            return;
        }
        console.log(response)
        var Response = new Blob([response], { type: 'application/json;charset=utf-8' });
        saveAs(Response, 'response1.json')
    };

    render() {
        const { query, schema } = this.state;
        return (
            <div
                className={cx(
                    styles.container,
                    'graphiql-container'
                )}
            >
                <GraphiQLExplorer
                    schema={schema}
                    query={query}
                    onEdit={this._handleEditQuery}
                    onRunOperation={operationName =>
                        this._graphiql.handleRunQuery(operationName)
                    }
                    explorerIsOpen={this.state.explorerIsOpen}
                    onToggleExplorer={this._handleToggleExplorer}
                    getDefaultScalarArgValue={getDefaultScalarArgValue}
                    makeDefaultArg={makeDefaultArg}
                />
                <GraphiQL
                    ref={ref => (this._graphiql = ref)}
                    fetcher={fetcher}
                    schema={schema}
                    query={query}
                    onEditQuery={this._handleEditQuery}
                >
                    <GraphiQL.Toolbar>
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
                            title="Save"
                        >
                            <GraphiQL.MenuItem
                                label="Query"
                                title="Query"
                                onSelect={() => this._handleSaveQuery()}
                            />
                            <GraphiQL.MenuItem
                                label="Response"
                                title="Response"
                                onSelect={() => this._handleSaveResponse()}
                            />
                        </GraphiQL.Menu>

                    </GraphiQL.Toolbar>
                </GraphiQL>
            </div>
        );
    }
}

export default GraphiQLIDE;
