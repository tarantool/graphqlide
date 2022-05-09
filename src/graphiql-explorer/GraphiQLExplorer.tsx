/**
 * Based on https://gist.github.com/baohouse/123c409cd1e4f56fa3b9a5e8859330d5
 * merged with https://github.com/OneGraph/graphiql-explorer/tree/v0.6.3
 * added a lot of minor changes
 */
import prettier from 'prettier/standalone';
import parserGraphql from 'prettier/parser-graphql';
import React, { Fragment } from 'react';
import { Tooltip } from 'antd';

import 'antd/dist/antd.css';

import {
  ArgumentNode,
  DefinitionNode,
  DocumentNode,
  FieldNode,
  FragmentDefinitionNode,
  FragmentSpread,
  getNamedType,
  GraphQLArgument,
  GraphQLEnumType,
  GraphQLField,
  GraphQLFieldMap,
  GraphQLInputField,
  GraphQLInputType,
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLScalarType,
  GraphQLSchema,
  InlineFragmentNode,
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isLeafType,
  isListType,
  isNonNullType,
  isObjectType,
  isRequiredInputField,
  isScalarType,
  isUnionType,
  isWrappingType,
  ListValueNode,
  NameNode,
  ObjectFieldNode,
  ObjectValueNode,
  OperationDefinitionNode,
  parse,
  parseType,
  print,
  SelectionNode,
  SelectionSetNode,
  ValueNode,
  VariableDefinitionNode,
  visit,
} from 'graphql';

import { Storage } from 'graphiql';

type Field = GraphQLField<any, any>;

type GetDefaultScalarArgValue = (
  parentField : Field,
  arg : GraphQLArgument | GraphQLInputField,
  underlyingArgType : GraphQLEnumType | GraphQLScalarType,
  directParentArg ?: GraphQLArgument | GraphQLInputField
) => ValueNode;

type GetScalarArgInput = (
  parentField : Field,
  arg : GraphQLArgument | GraphQLInputField,
  underlyingArgType : GraphQLEnumType | GraphQLScalarType,
  argValue : ValueNode,
  onChange : (event : React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void,
  styleConfig : StyleConfig,
  directParentArg ?: GraphQLArgument | GraphQLInputField
) => JSX.Element | void;

type MakeDefaultArg = (
  parentField : Field,
  arg : GraphQLArgument | GraphQLInputField,
  directParentArg ?: GraphQLArgument | GraphQLInputField
) => boolean;

type Colors = {
  keyword : string;
  def : string;
  property : string;
  qualifier : string;
  attribute : string;
  number : string;
  string : string;
  builtin : string;
  string2 : string;
  variable : string;
  atom : string;
};

type Styles = {
  explorerActionsStyle : React.CSSProperties;
  buttonStyle : React.CSSProperties;
  actionButtonStyle : StyleMap;
};

type StyleConfig = {
  colors : Colors;
  arrowOpen : React.ReactNode;
  arrowClosed : React.ReactNode;
  checkboxChecked : React.ReactNode;
  checkboxUnchecked : React.ReactNode;
  styles : Styles;
};

type GraphiQLExplorerProps = {
  query : string;
  explorerWidth ?: number;
  title ?: string;
  schema ?: GraphQLSchema;
  onEdit : (x : string) => void;
  getDefaultFieldNames ?: (type : GraphQLObjectType) => Array<string>;
  getDefaultScalarArgValue ?: GetDefaultScalarArgValue;
  getScalarArgInput : GetScalarArgInput;
  makeDefaultArg ?: MakeDefaultArg;
  onToggleExplorer : () => void;
  explorerIsOpen : boolean;
  onRunOperation ?: (name ?: string) => void;
  colors ?: Colors;
  arrowOpen ?: React.ReactNode;
  arrowClosed ?: React.ReactNode;
  checkboxChecked ?: React.ReactNode;
  checkboxUnchecked ?: React.ReactNode;
  storage : Storage;
  styles ?: {
    explorerActionsStyle ?: React.CSSProperties;
    buttonStyle ?: React.CSSProperties;
    actionButtonStyle ?: StyleMap;
  },
};

type OperationType = 'query' | 'mutation' | 'subscription' | 'fragment';
type NewOperationType = 'query' | 'mutation' | 'subscription';

type State = {
  operation ?: OperationDefinitionNode;
  newOperationType : NewOperationType;
  operationToScrollTo ?: string;
};

type Selections = readonly SelectionNode[];

type AvailableFragments = {[key : string] : FragmentDefinitionNode};

function capitalize(str : string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Names match class names in graphiql app.css
// https://github.com/graphql/graphiql/blob/master/packages/graphiql/css/app.css
const defaultColors : Colors = {
  keyword: '#B11A04',
  // OperationName, FragmentName
  def: '#D2054E',
  // FieldName
  property: '#1F61A0',
  // FieldAlias
  qualifier: '#1C92A9',
  // ArgumentName and ObjectFieldName
  attribute: '#8B2BB9',
  number: '#2882F9',
  string: '#D64292',
  // Boolean
  builtin: '#D47509',
  // Enum
  string2: '#0B7FC7',
  variable: '#397D13',
  // Type
  atom: '#CA9800',
};

const defaultArrowOpen = (
  <svg width="12" height="9" style={{ marginLeft: -14, marginRight: 2 }}>
    <path fill="#666" d="M 0 2 L 9 2 L 4.5 7.5 z" />
  </svg>
);

const defaultArrowClosed = (
  <svg width="12" height="9" style={{ marginLeft: -12, marginRight: 0 }}>
    <path fill="#666" d="M 0 0 L 0 9 L 5.5 4.5 z" />
  </svg>
);

const defaultCheckboxChecked = (
  <svg
    style={{ marginRight: 4, marginLeft: 0, verticalAlign: -2 }}
    width="12"
    height="12"
    viewBox="0 0 18 18"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M16 0H2C0.9 0 0 0.9 0 2V16C0 17.1 0.9 18 2 18H16C17.1 18 18 17.1 18 16V2C18 0.9 17.1 0 16 0ZM16
      16H2V2H16V16ZM14.99 6L13.58 4.58L6.99 11.17L4.41 8.6L2.99 10.01L6.99 14L14.99 6Z"
      fill="#666"
    />
  </svg>
);

const defaultCheckboxUnchecked = (
  <svg
    style={{ marginRight: 4, marginLeft: 0, verticalAlign: -2 }}
    width="12"
    height="12"
    viewBox="0 0 18 18"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M16 2V16H2V2H16ZM16 0H2C0.9 0 0 0.9 0 2V16C0 17.1 0.9 18 2 18H16C17.1 18 18 17.1 18 16V2C18 0.9 17.1 0 16 0Z"
      fill="#666"
    />
  </svg>
);

function debounce<F extends(...args : any[]) => any>(
  duration : number,
  fn : F,
) {
  let timeout : number | null;
  return function(this : any, ...args : Parameters<F>) {
    if (timeout) {
      window.clearTimeout(timeout);
    }
    timeout = window.setTimeout(() => {
      timeout = null;
      fn.apply(this, args);
    }, duration);
  };
}

function Checkbox(props : { checked : boolean; styleConfig : StyleConfig }) {
  return (
    <Fragment>
      {props.checked ? props.styleConfig.checkboxChecked : props.styleConfig.checkboxUnchecked}
    </Fragment>
  );
}

function defaultGetDefaultFieldNames(type : GraphQLObjectType) : Array<string> {
  const fields = type.getFields();

  // Include all leaf-type fields.
  const leafFieldNames : any[] = [];
  Object.keys(fields).forEach(fieldName => {
    if (isLeafType(fields[fieldName].type)) {
      leafFieldNames.push(fieldName);
    }
  });

  if (!leafFieldNames.length) {
    // No leaf fields, add typename so that the query stays valid
    return ['__typename'];
  }
  return leafFieldNames.slice(0, 2); // Prevent too many fields from being added
}

function isListArgument(arg : GraphQLArgument) : boolean {
  let unwrappedType = arg.type;
  while (isNonNullType(unwrappedType)) {
    unwrappedType = unwrappedType.ofType;
  }
  return isListType(unwrappedType);
}

function isRequiredArgument(arg : GraphQLArgument) : boolean {
  return isNonNullType(arg.type);
}

function unwrapOutputType(outputType : GraphQLOutputType) : any {
  let unwrappedType = outputType;
  while (isWrappingType(unwrappedType)) {
    unwrappedType = unwrappedType.ofType;
  }
  return unwrappedType;
}

function unwrapInputType(inputType : GraphQLInputType) : any {
  let unwrappedType = inputType;
  while (isWrappingType(unwrappedType)) {
    unwrappedType = unwrappedType.ofType;
  }
  return unwrappedType;
}

function coerceArgValue(
  argType : GraphQLScalarType | GraphQLEnumType,
  value : string | VariableDefinitionNode,
) : ValueNode {
  if (typeof value !== 'string' && value.kind === 'VariableDefinition') {
    return value.variable;
  } else if (isScalarType(argType)) {
    try {
      switch (argType.name) {
      case 'String':
        return {
          kind: 'StringValue',
          value: String(argType.parseValue(value)),
        };
      case 'Float':
        return {
          kind: 'FloatValue',
          value: String(argType.parseValue(parseFloat(value))),
        };
      case 'Double':
        return {
          kind: 'FloatValue',
          value: String(argType.parseValue(parseFloat(value))),
        };
      case 'Int':
        return {
          kind: 'IntValue',
          value: String(argType.parseValue(parseInt(value, 10))),
        };
      case 'Long':
        return {
          kind: 'StringValue',
          value: String(argType.parseValue(BigInt(value))),
        };
      case 'Boolean':
        try {
          const parsed = JSON.parse(value);
          if (typeof parsed === 'boolean') {
            return { kind: 'BooleanValue', value: parsed };
          } else {
            return { kind: 'BooleanValue', value: false };
          }
        } catch (e) {
          return {
            kind: 'BooleanValue',
            value: false,
          };
        }
      default:
        return {
          kind: 'StringValue',
          value: String(argType.parseValue(value)),
        };
      }
    } catch (e) {
      console.error('error coercing arg value', e, value);
      return { kind: 'StringValue', value: value };
    }
  } else {
    try {
      const parsedValue = argType.parseValue(value);
      if (parsedValue) {
        return { kind: 'EnumValue', value: String(parsedValue) };
      } else {
        return { kind: 'EnumValue', value: argType.getValues().sort((a, b) => a.name < b.name ? -1 : 1)[0].name };
      }
    } catch (e) {
      return { kind: 'EnumValue', value: argType.getValues().sort((a, b) => a.name < b.name ? -1 : 1)[0].name };
    }
  }
}

const prettify = (query : string) : string =>
  prettier.format(query, {
    parser: 'graphql',
    plugins: [parserGraphql],
    printWidth: 60,
  });

type InputArgViewProps = {
  arg : GraphQLArgument;
  argName ?: string;
  selection : ObjectValueNode;
  parentField : Field;
  directParentArg : GraphQLArgument;
  modifyFields : (
    fields : readonly ObjectFieldNode[],
    commit : boolean,
  ) => void;
  getDefaultScalarArgValue : GetDefaultScalarArgValue;
  getScalarArgInput : GetScalarArgInput;
  makeDefaultArg ?: MakeDefaultArg;
  onRunOperation : (e : React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => void;
  styleConfig : StyleConfig;
  onCommit : (newDoc : DocumentNode) => void,
  definition : FragmentDefinitionNode | OperationDefinitionNode,
};

class InputArgView extends React.PureComponent<InputArgViewProps, any> {
  _previousArgSelection ?: ObjectFieldNode;

  _getArgSelection = () => {
    return this.props.selection.fields.find(field => field.name.value === this.props.arg.name);
  };

  _removeArg = () => {
    const { selection } = this.props;
    const argSelection = this._getArgSelection();
    this._previousArgSelection = argSelection;
    this.props.modifyFields(
      selection.fields.filter(field => field !== argSelection),
      true,
    );
  };

  _addArg = () => {
    const {
      arg,
      directParentArg,
      getDefaultScalarArgValue,
      makeDefaultArg,
      modifyFields,
      parentField,
      selection,
    } = this.props;
    const argType = unwrapInputType(arg.type);

    if (isListArgument(arg)) {
      const fields = isLeafType(argType) ? {} : argType.getFields();
      const currentArgSelection = this._getArgSelection();
      const newValue = isLeafType(argType)
        ? getDefaultScalarArgValue(parentField, arg, argType)
        : {
          kind: 'ObjectValue',
          fields: defaultInputObjectFields(
            getDefaultScalarArgValue,
            makeDefaultArg || null,
            parentField,
            Object.keys(fields).map(k => fields[k]),
            arg
          ),
        };
      const argSelection = {
        kind: 'ObjectField',
        name: { kind: 'Name', value: arg.name },
        value: {
          kind: 'ListValue',
          values: [
            ...(currentArgSelection && currentArgSelection.value
              ? (currentArgSelection.value as ListValueNode).values
              : []),
            newValue,
          ],
        },
      } as ObjectFieldNode;
      modifyFields([
        ...(selection.fields || []).filter(({ name }) => name.value !== arg.name),
        argSelection,
      ]);
    } else {
      let argSelection = null;
      if (this._previousArgSelection) {
        argSelection = this._previousArgSelection;
      } else if (isInputObjectType(argType)) {
        const fields = argType.getFields();
        argSelection = {
          kind: 'ObjectField',
          name: { kind: 'Name', value: arg.name },
          value: {
            kind: 'ObjectValue',
            fields: defaultInputObjectFields(
              getDefaultScalarArgValue,
              makeDefaultArg || null,
              parentField,
              Object.keys(fields).map(k => fields[k]),
              arg
            ),
          },
        } as ObjectFieldNode;
      } else if (isLeafType(argType)) {
        argSelection = {
          kind: 'ObjectField',
          name: { kind: 'Name', value: arg.name },
          value: getDefaultScalarArgValue(parentField, arg, argType, directParentArg),
        } as ObjectFieldNode;
      }

      if (!argSelection) {
        console.error('Unable to add arg for argType', argType);
      } else {
        modifyFields([...(selection.fields || []), argSelection]);
      }
    }
  };

  _setArgValue = (
    event : React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    options ?: {commit : boolean},
  ) => {
    let settingToNull = false;
    let settingToVariable = false;
    let settingToLiteralValue = false;
    try {
      if (event.kind === 'VariableDefinition') {
        settingToVariable = true;
      } else if (event === null || typeof event === 'undefined') {
        settingToNull = true;
      } else if (typeof event.kind === 'string') {
        settingToLiteralValue = true;
      }
    } catch (e) {
      console.error('unknown arg value type');
    }
    const { selection } = this.props;

    const argSelection = this._getArgSelection();

    if (!argSelection) {
      console.error('missing arg selection when setting arg value');
      return;
    }
    const argType = unwrapInputType(this.props.arg.type);
    const handleable =
      isLeafType(argType) ||
      settingToVariable ||
      settingToNull ||
      settingToLiteralValue;

    if (!handleable) {
      console.warn(
        'Unable to handle non-leaf types in InputArgView.setArgValue',
        event,
      );
      return;
    }

    let targetValue : string | VariableDefinitionNode;
    let value : ValueNode | null;

    if (event === null || typeof event === 'undefined') {
      value = null;
    } else if (
      !event.target &&
      !!event.kind &&
      event.kind === 'VariableDefinition'
    ) {
      targetValue = event;
      value = targetValue.variable;
    } else if (typeof event.kind === 'string') {
      value = event;
    } else if (event.target && typeof event.target.value === 'string') {
      targetValue = event.target.value;
      value = coerceArgValue(argType, targetValue);
    }

    const newDoc = this.props.modifyFields(
      (selection.fields || []).map(field => {
        const isTarget = field === argSelection;
        const newField = isTarget
          ? {
            ...field,
            value: value,
          }
          : field;

        return newField;
      }),
      options,
    );
    return newDoc;
  };

  _modifyChildFields = (fields : ObjectFieldNode[] | ListValueNode) : DocumentNode | null => {
    const { modifyFields, selection } = this.props;
    if ((fields as ListValueNode).kind === 'ListValue') {
      return modifyFields(
        selection.fields.map(field =>
          field.name.value === this.props.arg.name
            ? {
              ...field,
              value: fields as ListValueNode,
            }
            : field
        ),
        true,
      );
    } else {
      return modifyFields(
        selection.fields.map(field =>
          field.name.value === this.props.arg.name
            ? {
              ...field,
              value: {
                kind: 'ObjectValue',
                fields: fields as ObjectFieldNode[],
              },
            }
            : field
        ),
        true,
      );
    }
  };

  render() {
    const { arg, getScalarArgInput, parentField, directParentArg } = this.props;
    const argSelection = this._getArgSelection();

    return (
      <AbstractArgView
        argValue={argSelection ? argSelection.value : undefined}
        arg={arg}
        parentField={parentField}
        directParentArg={directParentArg}
        addArg={this._addArg}
        removeArg={this._removeArg}
        setArgFields={this._modifyChildFields}
        setArgValue={this._setArgValue}
        getDefaultScalarArgValue={this.props.getDefaultScalarArgValue}
        getScalarArgInput={getScalarArgInput}
        makeDefaultArg={this.props.makeDefaultArg}
        onRunOperation={this.props.onRunOperation}
        styleConfig={this.props.styleConfig}
        onCommit={this.props.onCommit}
        definition={this.props.definition}
      />
    );
  }
}

type InputArgListViewProps = {
  arg : GraphQLArgument;
  selection : ListValueNode;
  parentField : Field;
  modifyArgument : (list : ListValueNode) => void;
  getDefaultScalarArgValue : GetDefaultScalarArgValue;
  getScalarArgInput : GetScalarArgInput;
  makeDefaultArg ?: MakeDefaultArg;
  onRunOperation : (e : React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => void;
  styleConfig : StyleConfig;
};

class InputArgListView extends React.PureComponent<InputArgListViewProps, any> {
  _addArg = () => {
    const { arg, getDefaultScalarArgValue, makeDefaultArg, parentField } = this.props;
    const argType = unwrapInputType(arg.type);
    const fields = argType.getFields();
    const modifiedListValue = {
      kind: 'ListValue',
      values: [
        {
          kind: 'ObjectValue',
          fields: defaultInputObjectFields(
            getDefaultScalarArgValue,
            makeDefaultArg || null,
            parentField,
            Object.keys(fields).map(k => fields[k]),
            arg
          ),
        },
      ],
    } as ListValueNode;
    this.props.modifyArgument(modifiedListValue);
  };

  _removeArg = (index : number) => () => {
    const { selection } = this.props;
    const modifiedListValue = {
      kind: 'ListValue',
      values: selection.values.filter((_value, i) => i !== index),
    } as ListValueNode;
    this.props.modifyArgument(modifiedListValue);
  };

  _setArgFields = (index : number) => (fields : readonly ObjectFieldNode[]) => {
    const { selection } = this.props;
    const objectValue = selection.values[index] as ObjectValueNode;
    const modifiedListValue = {
      kind: 'ListValue',
      values: Object.assign([], selection.values, {
        [index.toString()]: {
          ...objectValue,
          fields: [...fields].sort((a : ObjectFieldNode, b : ObjectFieldNode) =>
            a.name.value.localeCompare(b.name.value)
          ),
        },
      }),
    } as ListValueNode;
    this.props.modifyArgument(modifiedListValue);
  };

  _setArgValue = (index : number) => (
    event : React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { selection } = this.props;
    const targetValue = event.target.value;
    const objectValue = selection.values[index] as ObjectValueNode;
    const modifiedListValue = {
      kind: 'ListValue',
      values: Object.assign([], selection.values, {
        [index.toString()]: {
          ...objectValue,
          value: targetValue,
        },
      }),
    } as ListValueNode;
    this.props.modifyArgument(modifiedListValue);
  };

  render() {
    const {
      arg,
      getDefaultScalarArgValue,
      getScalarArgInput,
      makeDefaultArg,
      onRunOperation,
      parentField,
      selection,
      styleConfig,
    } = this.props;
    const argType = unwrapInputType(arg.type);
    return (selection.values || []).map((argValue, index) => (
      <AbstractArgView
        key={`${arg.name}[${index}]`}
        argValue={argValue}
        arg={{
          ...arg,
          name: index.toString(),
          type: argType,
        }}
        parentField={parentField}
        addArg={this._addArg}
        removeArg={this._removeArg(index)}
        setArgFields={this._setArgFields(index)}
        setArgValue={this._setArgValue(index)}
        getDefaultScalarArgValue={getDefaultScalarArgValue}
        getScalarArgInput={getScalarArgInput}
        makeDefaultArg={makeDefaultArg}
        onRunOperation={onRunOperation}
        styleConfig={styleConfig}
      />
    ));
  }
}

type ArgViewProps = {
  parentField : Field;
  arg : GraphQLArgument;
  selection : FieldNode;
  modifyArguments : (
    argumentNodes : readonly ArgumentNode[],
    commit : boolean,
  ) => DocumentNode | null;
  getDefaultScalarArgValue : GetDefaultScalarArgValue;
  getScalarArgInput : GetScalarArgInput;
  makeDefaultArg ?: MakeDefaultArg;
  onRunOperation : () => void;
  styleConfig : StyleConfig;
  onCommit : (newDoc : DocumentNode) => void,
  definition : FragmentDefinitionNode | OperationDefinitionNode,
};

type ArgViewState = Record<string, unknown>;

export function defaultValue(
  arg : GraphQLArgument | GraphQLInputField,
  argType : GraphQLEnumType | GraphQLScalarType,
) : ValueNode {
  if (isEnumType(argType)) {
    return {
      kind: 'EnumValue',
      value: arg?.defaultValue ?? argType.getValues().sort((a, b) => a.name < b.name ? -1 : 1)[0].name
    };
  } else {
    switch (argType.name) {
    case 'String':
      return { kind: 'StringValue', value: arg?.defaultValue ?? '' };
    case 'Float':
      return { kind: 'FloatValue', value: arg?.defaultValue ?? '0' };
    case 'Double':
      return { kind: 'FloatValue', value: arg?.defaultValue ?? '0' };
    case 'Int':
      return { kind: 'IntValue', value: arg?.defaultValue ?? '0' };
    case 'Long':
      return { kind: 'StringValue', value: (arg?.defaultValue ?? 0).toString() };
    case 'Boolean':
      return { kind: 'BooleanValue', value: arg?.defaultValue ?? false };
    default:
      return { kind: 'StringValue', value: arg?.defaultValue ?? '' };
    }
  }
}

function defaultGetDefaultScalarArgValue(
  parentField : Field,
  arg : GraphQLArgument | GraphQLInputField,
  argType : GraphQLEnumType | GraphQLScalarType,
) : ValueNode {
  return defaultValue(arg, argType);
}

class ArgView extends React.PureComponent<ArgViewProps, ArgViewState> {
  _previousArgSelection ?: ArgumentNode;

  _getArgSelection = () => {
    const { selection } = this.props;
    return (selection.arguments || []).find(arg => arg.name.value === this.props.arg.name);
  };

  _removeArg = (commit : boolean) : DocumentNode | null => {
    const { selection } = this.props;
    const argSelection = this._getArgSelection();
    this._previousArgSelection = argSelection;
    return this.props.modifyArguments(
      (selection.arguments || []).filter(arg => arg !== argSelection),
      commit,
    );
  };

  _addArg = (commit : boolean) : DocumentNode | null => {
    const { selection, getDefaultScalarArgValue, makeDefaultArg, parentField, arg } = this.props;
    const argType = unwrapInputType(arg.type);

    if (isListArgument(arg)) {
      const fields = isLeafType(argType) ? {} : argType.getFields();
      const currentArgSelection = this._getArgSelection();
      const newValue = isLeafType(argType)
        ? getDefaultScalarArgValue(parentField, arg, argType)
        : {
          kind: 'ObjectValue',
          fields: defaultInputObjectFields(
            getDefaultScalarArgValue,
            makeDefaultArg || null,
            parentField,
            Object.keys(fields).map(k => fields[k]),
            arg
          ),
        };
      const argSelection = {
        kind: 'Argument',
        name: { kind: 'Name', value: arg.name },
        value: {
          kind: 'ListValue',
          values: [
            ...(currentArgSelection && currentArgSelection.value
              ? (currentArgSelection.value as ListValueNode).values
              : []),
            newValue,
          ],
        },
      } as ArgumentNode;
      this.props.modifyArguments([
        ...(selection.arguments || []).filter(({ name }) => name.value !== arg.name),
        argSelection,
      ]);
    } else {
      let argSelection = null;
      if (this._previousArgSelection) {
        argSelection = this._previousArgSelection;
      } else if (isInputObjectType(argType)) {
        const fields = argType.getFields();
        argSelection = {
          kind: 'Argument',
          name: { kind: 'Name', value: arg.name },
          value: {
            kind: 'ObjectValue',
            fields: defaultInputObjectFields(
              getDefaultScalarArgValue,
              makeDefaultArg || null,
              parentField,
              Object.keys(fields).map(k => fields[k]),
              arg
            ),
          },
        } as ArgumentNode;
      } else if (isLeafType(argType)) {
        argSelection = {
          kind: 'Argument',
          name: { kind: 'Name', value: arg.name },
          value: getDefaultScalarArgValue(parentField, arg, argType),
        } as ArgumentNode;
      }

      if (!argSelection) {
        console.error('Unable to add arg for argType', argType);
        return null;
      } else {
        return this.props.modifyArguments(
          [...(selection.arguments || []), argSelection],
          commit,
        );
      }
    }
  };

  _setArgValue = (
    event : React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    options ?: {commit : boolean},
  ) => {
    let settingToNull = false;
    let settingToVariable = false;
    let settingToLiteralValue = false;
    try {
      if (event.kind === 'VariableDefinition') {
        settingToVariable = true;
      } else if (event === null || typeof event === 'undefined') {
        settingToNull = true;
      } else if (typeof event.kind === 'string') {
        settingToLiteralValue = true;
      }
    } catch (e) {
      console.error('unknown arg value type');
    }
    const { selection } = this.props;
    const argSelection = this._getArgSelection();
    if (!argSelection  && !settingToVariable) {
      console.error('missing arg selection when setting arg value');
      return;
    }
    const argType = unwrapInputType(this.props.arg.type);
    const handleable =
      isLeafType(argType) ||
      settingToVariable ||
      settingToNull ||
      settingToLiteralValue;

    if (!handleable) {
      console.warn('Unable to handle non leaf types in ArgView._setArgValue');
      return;
    }

    let targetValue : string | VariableDefinitionNode;
    let value : ValueNode;

    if (event === null || typeof event === 'undefined') {
      value = null;
    } else if (event.target && typeof event.target.value === 'string') {
      targetValue = event.target.value;
      value = coerceArgValue(argType, targetValue);
    } else if (!event.target && event.kind === 'VariableDefinition') {
      targetValue = event;
      value = targetValue.variable;
    } else if (typeof event.kind === 'string') {
      value = event;
    }

    return this.props.modifyArguments(
      (selection.arguments || []).map(a =>
        a === argSelection
          ? {
            ...a,
            value: value,
          }
          : a
      ),
      options,
    );
  };

  /**
   * When fields is ObjectFieldNode[], we are modifying fields of an InputObject. But if it
   * is a ListValueNode, then the argument is a list, in which case we return the entire list.
   */
  _setArgFields = (
    fields : ObjectFieldNode[] | ListValueNode,
    commit : boolean
  ) : DocumentNode | null => {
    const { selection } = this.props;
    const argSelection = this._getArgSelection();
    if (!argSelection) {
      console.error('missing arg selection when setting arg value');
      return;
    }

    if ((fields as ListValueNode).kind === 'ListValue') {
      return this.props.modifyArguments(
        (selection.arguments || []).map(a =>
          a === argSelection
            ? {
              ...a,
              value: fields as ListValueNode,
            }
            : a
        ),
        commit,
      );
    } else {
      return this.props.modifyArguments(
        (selection.arguments || []).map(a =>
          a === argSelection
            ? {
              ...a,
              value: {
                kind: 'ObjectValue',
                fields: fields as ObjectFieldNode[],
              },
            }
            : a
        ),
        commit,
      );
    }
  };

  render() {
    const { arg, getScalarArgInput, parentField } = this.props;
    const argSelection = this._getArgSelection();

    return (
      <AbstractArgView
        argValue={argSelection ? argSelection.value : undefined}
        arg={arg}
        parentField={parentField}
        addArg={this._addArg}
        removeArg={this._removeArg}
        setArgFields={this._setArgFields}
        setArgValue={this._setArgValue}
        getDefaultScalarArgValue={this.props.getDefaultScalarArgValue}
        getScalarArgInput={getScalarArgInput}
        makeDefaultArg={this.props.makeDefaultArg}
        onRunOperation={this.props.onRunOperation}
        styleConfig={this.props.styleConfig}
        onCommit={this.props.onCommit}
        definition={this.props.definition}
      />
    );
  }
}

function isRunShortcut(event : React.KeyboardEvent<HTMLInputElement>) {
  return event.ctrlKey && event.key === 'Enter';
}

function canRunOperation(operationName) {
  // it does not make sense to try to execute a fragment
  return operationName !== 'FragmentDefinition';
}

type ScalarInputProps = {
  arg : GraphQLArgument;
  argValue : ValueNode;
  setArgValue : (
    event : React.SyntheticEvent | VariableDefinitionNode,
    commit : boolean,
  ) => DocumentNode | null;
  onRunOperation : (e : React.KeyboardEvent<HTMLInputElement>) => void;
  styleConfig : StyleConfig;
};

class ScalarInput extends React.PureComponent<ScalarInputProps, any> {
  _ref ?: any;
  _handleChange = (event : React.SyntheticEvent) => {
    this.props.setArgValue(event, true);
  };

  componentDidMount() {
    const input = this._ref;
    const activeElement = document.activeElement;
    if (input && activeElement && !(activeElement instanceof HTMLTextAreaElement)) {
      input.focus();
      if (input.type !== 'number') {
        input.setSelectionRange(0, input.value.length);
      }
    }
  }

  render() {
    const { arg, argValue, styleConfig } = this.props;
    const argType = unwrapInputType(arg.type);
    const value = 'value' in argValue && typeof argValue.value === 'string' ? argValue.value : '';
    const color =
      this.props.argValue.kind === 'StringValue'
        ? styleConfig.colors.string
        : styleConfig.colors.number;
    return (
      <span style={{ color }}>
        {argType.name === 'String' ? '"' : ''}
        <input
          style={{
            border: 'none',
            borderBottom: '1px solid #888',
            outline: 'none',
            width: `${Math.max(
              1,
              Math.min(15, value.length + (
                argType.name === 'Float' ||
                argType.name === 'Double' ||
                argType.name === 'Int' ||
                argType.name === 'Long'
                  ? 3
                  : 0))
            )}ch`,
            color,
          }}
          ref={ref => {
            this._ref = ref;
          }}
          type={(
            argType.name === 'Float' ||
            argType.name === 'Double' ||
            argType.name === 'Int' ||
            argType.name === 'Long'
              ? "number"
              : "text")}
          onChange={this._handleChange}
          value={value}
        />
        {argType.name === 'String' ? '"' : ''}
      </span>
    );
  }
}

type AbstractArgViewProps = {
  argValue ?: ValueNode;
  arg : GraphQLArgument;
  parentField : Field;
  setArgValue : (
    event : React.ChangeEvent<HTMLInputElement | HTMLSelectElement | VariableDefinitionNode>,
    commit : boolean,
  ) => DocumentNode | null;
  setArgFields : (
    fields : readonly ObjectFieldNode[],
    commit : boolean,
  ) => DocumentNode | null;
  addArg : (commit : boolean) => DocumentNode | null;
  removeArg : (commit : boolean) => DocumentNode | null;
  onCommit : (newDoc : DocumentNode) => void;
  getDefaultScalarArgValue : GetDefaultScalarArgValue;
  getScalarArgInput : GetScalarArgInput;
  makeDefaultArg ?: MakeDefaultArg;
  onRunOperation : () => void;
  styleConfig : StyleConfig;
  definition : FragmentDefinitionNode | OperationDefinitionNode;
};

class AbstractArgView extends React.PureComponent<
  AbstractArgViewProps,
  {displayArgActions : boolean},
> {
  state = {displayArgActions: !!this.props.argValue};
  render() {
    const {
      argValue,
      arg,
      directParentArg,
      getDefaultScalarArgValue,
      getScalarArgInput,
      makeDefaultArg,
      onRunOperation,
      parentField,
      setArgFields,
      setArgValue,
      styleConfig,
    } = this.props;
    const argType = unwrapInputType(arg.type);

    let input = null;
    if (argValue) {
      if (argValue.kind === 'Variable') {
        input = (
          <span style={{ color: styleConfig.colors.variable }}>
            {argValue.name.value}
          </span>
        );
      } else if (isListArgument(arg)) {
        input = (
          <div style={{ marginLeft: 16 }}>
            <InputArgListView
              arg={arg}
              parentField={parentField}
              selection={argValue as ListValueNode}
              modifyArgument={setArgFields}
              getDefaultScalarArgValue={getDefaultScalarArgValue}
              getScalarArgInput={getScalarArgInput}
              makeDefaultArg={makeDefaultArg}
              onRunOperation={onRunOperation}
              styleConfig={styleConfig}
            />
          </div>
        );
      } else if (isScalarType(argType)) {
        if (argType.name === 'Boolean') {
          input = (
            <select
              style={{ color: styleConfig.colors.builtin }}
              onChange={setArgValue}
              value={argValue.kind === 'BooleanValue' ? argValue.value.toString() : undefined}
            >
              <option key="true" value="true">
                true
              </option>
              <option key="false" value="false">
                false
              </option>
            </select>
          );
        } else {
          input = getScalarArgInput(
            parentField,
            arg,
            argType,
            argValue,
            setArgValue,
            styleConfig,
            directParentArg
          ) || (
            <ScalarInput
              setArgValue={setArgValue}
              arg={arg}
              argValue={argValue}
              onRunOperation={onRunOperation}
              styleConfig={styleConfig}
            />
          );
        }
      } else if (isEnumType(argType)) {
        if (argValue.kind === 'EnumValue') {
          input = (
            <select
              style={{
                backgroundColor: 'white',
                color: styleConfig.colors.string2,
              }}
              onChange={setArgValue}
              value={argValue.value}
            >
              {argType.getValues().sort((a, b) => a.name < b.name ? -1 : 1).map(value => (
                <option key={value.name} value={value.name}>
                  {value.name}
                </option>
              ))}
            </select>
          );
        } else {
          console.error('arg mismatch between arg and selection', argType, argValue);
        }
      } else if (isInputObjectType(argType)) {
        if (argValue.kind === 'ObjectValue') {
          const fields = argType.getFields();
          input = (
            <div style={{ marginLeft: 16 }}>
              {Object.keys(fields)
                .sort()
                .map(fieldName => (
                  <InputArgView
                    key={fieldName}
                    arg={fields[fieldName] as GraphQLArgument}
                    parentField={parentField}
                    directParentArg={arg}
                    selection={argValue}
                    modifyFields={this.props.setArgFields}
                    getDefaultScalarArgValue={this.props.getDefaultScalarArgValue}
                    getScalarArgInput={getScalarArgInput}
                    makeDefaultArg={this.props.makeDefaultArg}
                    onRunOperation={this.props.onRunOperation}
                    styleConfig={styleConfig}
                    onCommit={this.props.onCommit}
                    definition={this.props.definition}
                  />
                ))}
            </div>
          );
        } else {
          console.error('arg mismatch between arg and selection', argType, argValue);
        }
      }
    }

    const variablize = () => {
      /**
      1. Find current operation variables
      2. Find current arg value
      3. Create a new variable
      4. Replace current arg value with variable
      5. Add variable to operation
      */

      const baseVariableName = arg.name;
      const conflictingNameCount = (
        this.props.definition.variableDefinitions || []
      ).filter(varDef =>
        varDef.variable.name.value.startsWith(baseVariableName),
      ).length;

      let variableName;
      if (conflictingNameCount > 0) {
        variableName = `${baseVariableName}${conflictingNameCount}`;
      } else {
        variableName = baseVariableName;
      }
      // To get an AST definition of our variable from the instantiated arg,
      // we print it to a string, then parseType to get our AST.
      const argPrintedType = arg.type.toString();
      const argType = parseType(argPrintedType);

      const base : VariableDefinitionNode = {
        kind: 'VariableDefinition',
        variable: {
          kind: 'Variable',
          name: {
            kind: 'Name',
            value: variableName,
          },
        },
        type: argType,
        directives: [],
      };

      const variableDefinitionByName = name =>
        (this.props.definition.variableDefinitions || []).find(
          varDef => varDef.variable.name.value === name,
        );

      let variable : VariableDefinitionNode | null;

      const subVariableUsageCountByName : {
        [key : string] : number,
      } = {};

      if (typeof argValue !== 'undefined' && argValue !== null) {
        /** In the process of devariabilizing descendent selections,
         * we may have caused their variable definitions to become unused.
         * Keep track and remove any variable definitions with 1 or fewer usages.
         * */
        const cleanedDefaultValue = visit(argValue, {
          Variable(node) {
            const varName = node.name.value;
            const varDef = variableDefinitionByName(varName);

            subVariableUsageCountByName[varName] =
              subVariableUsageCountByName[varName] + 1 || 1;

            if (!varDef) {
              return;
            }

            return varDef.defaultValue;
          },
        });

        const isNonNullable = base.type.kind === 'NonNullType';

        // We're going to give the variable definition a default value, so we must make its type nullable
        const unwrappedBase = isNonNullable
          ? {...base, type: base.type.type}
          : base;

        variable = {...unwrappedBase, defaultValue: cleanedDefaultValue};
      } else {
        variable = base;
      }

      const newlyUnusedVariables = Object.entries(subVariableUsageCountByName)
        // $FlowFixMe: Can't get Object.entries to realize usageCount *must* be a number
        .filter(([ , usageCount] : [string, number]) => usageCount < 2)
        .map(([varName, ] : [string, number]) => varName);

      if (variable) {
        const newDoc : DocumentNode | null = this.props.setArgValue(variable, false);

        if (newDoc) {
          const targetOperation = newDoc.definitions.find(definition => {
            if (
              !!definition.operation &&
              !!definition.name &&
              !!definition.name.value &&
              //
              !!this.props.definition.name &&
              !!this.props.definition.name.value
            ) {
              return definition.name.value === this.props.definition.name.value;
            } else {
              return false;
            }
          });

          const newVariableDefinitions : Array<VariableDefinitionNode> = [
            ...(targetOperation.variableDefinitions || []),
            variable,
          ].filter(
            varDef =>
              newlyUnusedVariables.indexOf(varDef.variable.name.value) === -1,
          );

          const newOperation = {
            ...targetOperation,
            variableDefinitions: newVariableDefinitions,
          };

          const existingDefs = newDoc.definitions;

          const newDefinitions = existingDefs.map(existingOperation => {
            if (targetOperation === existingOperation) {
              return newOperation;
            } else {
              return existingOperation;
            }
          });

          const finalDoc = {
            ...newDoc,
            definitions: newDefinitions,
          };

          this.props.onCommit(finalDoc);
        }
      }
    };

    const devariablize = () => {
      /**
       * 1. Find the current variable definition in the operation def
       * 2. Extract its value
       * 3. Replace the current arg value
       * 4. Visit the resulting operation to see if there are any other usages of the variable
       * 5. If not, remove the variableDefinition
       */
      if (!argValue || !argValue.name || !argValue.name.value) {
        return;
      }

      const variableName = argValue.name.value;
      const variableDefinition = (
        this.props.definition.variableDefinitions || []
      ).find(varDef => varDef.variable.name.value === variableName);

      if (!variableDefinition) {
        return;
      }

      const defaultValue = variableDefinition.defaultValue;

      const newDoc : DocumentNode | null = this.props.setArgValue(defaultValue, {
        commit: false,
      });

      if (newDoc) {
        const targetOperation : OperationDefinitionNode | null = newDoc.definitions.find(
          definition =>
            definition.name.value === this.props.definition.name.value,
        );

        if (!targetOperation) {
          return;
        }

        // After de-variabilizing, see if the variable is still in use. If not, remove it.
        let variableUseCount = 0;

        visit(targetOperation, {
          Variable(node) {
            if (node.name.value === variableName) {
              variableUseCount = variableUseCount + 1;
            }
          },
        });

        let newVariableDefinitions = targetOperation.variableDefinitions || [];

        // A variable is in use if it shows up at least twice (once in the definition, once in the selection)
        if (variableUseCount < 2) {
          newVariableDefinitions = newVariableDefinitions.filter(
            varDef => varDef.variable.name.value !== variableName,
          );
        }

        const newOperation = {
          ...targetOperation,
          variableDefinitions: newVariableDefinitions,
        };

        const existingDefs = newDoc.definitions;

        const newDefinitions = existingDefs.map(existingOperation => {
          if (targetOperation === existingOperation) {
            return newOperation;
          } else {
            return existingOperation;
          }
        });

        const finalDoc = {
          ...newDoc,
          definitions: newDefinitions,
        };

        this.props.onCommit(finalDoc);
      }
    };

    const isArgValueVariable = argValue && argValue.kind === 'Variable';

    const variablizeActionButton = !this.state.displayArgActions ? null : (
      <Fragment>
        {' '}
        <Tooltip
          transitionName={null}
          title={
            isArgValueVariable
              ? 'Remove the variable'
              : 'Extract the current value into a GraphQL variable'
          }
        >
          <span style={{ cursor: 'pointer' }}>
            <button
              type="submit"
              className="toolbar-button"
              onClick={event => {
                event.preventDefault();
                event.stopPropagation();

                if (isArgValueVariable) {
                  devariablize();
                } else {
                  variablize();
                }
              }}
              style={styleConfig.styles.actionButtonStyle}>
              <span style={{color: styleConfig.colors.variable}}><b>{'$'}</b></span>
            </button>
          </span>
        </Tooltip>
        {' '}
      </Fragment>
    );

    return (
      <div
        style={{
          cursor: 'pointer',
          minHeight: '16px',
          WebkitUserSelect: 'none',
          userSelect: 'none',
        }}
        data-arg-name={arg.name}
        data-arg-type={argType.name}
        className={`graphiql-explorer-${arg.name}`}
      >
        <span>
          <span
            style={{ cursor: 'pointer' }}
            onClick={ () => {
              const shouldAdd = !argValue;
              if (shouldAdd) {
                this.props.addArg(true);
              } else {
                this.props.removeArg(true);
              }
              this.setState({displayArgActions: shouldAdd});
            }}
          >
            {isInputObjectType(argType) &&
              (argValue ? this.props.styleConfig.arrowOpen : this.props.styleConfig.arrowClosed)}
            <Checkbox checked={!!argValue} styleConfig={this.props.styleConfig} />
            <Tooltip
              transitionName={null}
              arrowPointAtCenter
              placement="rightTop"
              title={arg.description || ''}
            >
              <span style={{ color: styleConfig.colors.attribute }}>
                {arg.name}
                {isRequiredArgument(arg) ? '*' : ''}:
                {isListArgument(arg) &&
                  `[${
                    (argValue as ListValueNode) && (argValue as ListValueNode).values
                      ? (argValue as ListValueNode).values.length
                      : '0'
                  }]`}
              </span>
            </Tooltip>
          </span>
          {isListArgument(arg) && (
            <Fragment>
              {' '}
              <Tooltip
                transitionName={null}
                title="Add list item"
              >
                <span style={{ cursor: 'pointer' }}>
                  <button
                    type="submit"
                    className="toolbar-button"
                    onClick={this.props.addArg}
                    style={styleConfig.styles.actionButtonStyle}>
                    <span><b>{'+'}</b></span>
                  </button>
                </span>
              </Tooltip>
              {' '}
            </Fragment>
          )}
          {variablizeActionButton}
        </span>
        {input || <span />}{' '}
      </div>
    );
  }
}

type AbstractViewProps = {
  implementingType : GraphQLObjectType;
  selections : Selections;
  modifySelections : (
    selections : Selections,
    options ?: {commit : boolean},
  ) => DocumentNode | null;
  schema : GraphQLSchema;
  getDefaultFieldNames : (type : GraphQLObjectType) => Array<string>;
  getDefaultScalarArgValue : GetDefaultScalarArgValue;
  getScalarArgInput : GetScalarArgInput;
  makeDefaultArg ?: MakeDefaultArg;
  onRunOperation : () => void;
  onCommit : (newDoc : DocumentNode) => void;
  styleConfig : StyleConfig;
  definition : FragmentDefinitionNode | OperationDefinitionNode;
};

class AbstractView extends React.PureComponent<AbstractViewProps, any> {
  _previousSelection ?: InlineFragmentNode;

  _addFragment = () => {
    this.props.modifySelections([
      ...this.props.selections,
      this._previousSelection || {
        kind: 'InlineFragment',
        typeCondition: {
          kind: 'NamedType',
          name: { kind: 'Name', value: this.props.implementingType.name },
        },
        selectionSet: {
          kind: 'SelectionSet',
          selections: this.props
            .getDefaultFieldNames(this.props.implementingType)
            .map(fieldName => ({
              kind: 'Field',
              name: { kind: 'Name', value: fieldName },
            })),
        },
      },
    ]);
  };

  _removeFragment = () => {
    const thisSelection = this._getSelection();
    this._previousSelection = thisSelection;
    this.props.modifySelections(this.props.selections.filter(s => s !== thisSelection));
  };

  _getSelection = () : InlineFragmentNode | undefined => {
    const selection = this.props.selections.find(
      selection =>
        selection.kind === 'InlineFragment' &&
        selection.typeCondition &&
        this.props.implementingType.name === selection.typeCondition.name.value
    );
    if (!selection) {
      return undefined;
    }
    if (selection.kind === 'InlineFragment') {
      return selection;
    }
    return undefined;
  };

  _modifyChildSelections = (
    selections : Selections,
    options ?: {commit : boolean},
  ) => {
    const thisSelection = this._getSelection();
    return this.props.modifySelections(
      this.props.selections.map(selection => {
        if (selection === thisSelection) {
          return {
            directives: selection.directives,
            kind: 'InlineFragment',
            typeCondition: {
              kind: 'NamedType',
              name: { kind: 'Name', value: this.props.implementingType.name },
            },
            selectionSet: {
              kind: 'SelectionSet',
              selections,
            },
          };
        }
        return selection;
      }),
      options,
    );
  };

  render() {
    const {
      implementingType,
      schema,
      getDefaultFieldNames,
      getScalarArgInput,
      styleConfig,
    } = this.props;
    const selection = this._getSelection();
    const fields = implementingType.getFields();
    const childSelections = selection
      ? selection.selectionSet
        ? selection.selectionSet.selections
        : []
      : [];
    return (
      <div className={`graphiql-explorer-${implementingType.name}`}>
        <span
          style={{ cursor: 'pointer' }}
          onClick={selection ? this._removeFragment : this._addFragment}
        >
          <Checkbox checked={!!selection} styleConfig={this.props.styleConfig} />
          <span style={{ color: styleConfig.colors.atom }}>{this.props.implementingType.name}</span>
        </span>
        {selection ? (
          <div style={{ marginLeft: 16 }}>
            {Object.keys(fields)
              .sort()
              .map(fieldName => (
                <FieldView
                  key={fieldName}
                  field={fields[fieldName]}
                  selections={childSelections}
                  modifySelections={this._modifyChildSelections}
                  schema={schema}
                  getDefaultFieldNames={getDefaultFieldNames}
                  getDefaultScalarArgValue={this.props.getDefaultScalarArgValue}
                  getScalarArgInput={getScalarArgInput}
                  makeDefaultArg={this.props.makeDefaultArg}
                  onRunOperation={this.props.onRunOperation}
                  onCommit={this.props.onCommit}
                  styleConfig={this.props.styleConfig}
                  definition={this.props.definition}
                  availableFragments={this.props.availableFragments}
                />
              ))}
          </div>
        ) : null}
      </div>
    );
  }
}

type FragmentViewProps = {
  fragment : FragmentDefinitionNode,
  selections : Selections,
  modifySelections : (
    selections : Selections,
    options ?: {commit : boolean},
  ) => DocumentNode | null,
  onCommit : (newDoc : DocumentNode) => void,
  schema : GraphQLSchema,
  styleConfig : StyleConfig,
};

class FragmentView extends React.PureComponent<FragmentViewProps, any> {
  _previousSelection ?: InlineFragmentNode;
  _addFragment = () => {
    this.props.modifySelections([
      ...this.props.selections,
      this._previousSelection || {
        kind: 'FragmentSpread',
        name: this.props.fragment.name,
      },
    ]);
  };
  _removeFragment = () => {
    const thisSelection = this._getSelection();
    this._previousSelection = thisSelection;
    this.props.modifySelections(
      this.props.selections.filter(s => {
        const isTargetSelection =
          s.kind === 'FragmentSpread' &&
          s.name.value === this.props.fragment.name.value;

        return !isTargetSelection;
      }),
    );
  };
  _getSelection = () : FragmentSpread | undefined => {
    const selection = this.props.selections.find(selection => {
      return (
        selection.kind === 'FragmentSpread' &&
        selection.name.value === this.props.fragment.name.value
      );
    });

    return selection;
  };

  render() {
    const {styleConfig} = this.props;
    const selection = this._getSelection();
    return (
      <div className={`graphiql-explorer-${this.props.fragment.name.value}`}>
        <span
          style={{cursor: 'pointer'}}
          onClick={selection ? this._removeFragment : this._addFragment}>
          <Checkbox
            checked={!!selection}
            styleConfig={this.props.styleConfig}
          />
          <span
            style={{color: styleConfig.colors.def}}
            className={`graphiql-explorer-${this.props.fragment.name.value}`}
          >
            {'...'}{this.props.fragment.name.value}
          </span>
        </span>
      </div>
    );
  }
}

type FieldViewProps = {
  field : Field;
  selections : Selections;
  modifySelections : (
    selections : Selections,
    options ?: {commit : boolean},
  ) => DocumentNode | null;
  schema : GraphQLSchema;
  getDefaultFieldNames : (type : GraphQLObjectType) => Array<string>;
  getDefaultScalarArgValue : GetDefaultScalarArgValue;
  getScalarArgInput : GetScalarArgInput;
  makeDefaultArg ?: MakeDefaultArg;
  onRunOperation : () => void;
  styleConfig : StyleConfig;
  onCommit : (newDoc : DocumentNode) => void,
  definition : FragmentDefinitionNode | OperationDefinitionNode,
  availableFragments : AvailableFragments,
};

function defaultInputObjectFields(
  getDefaultScalarArgValue : GetDefaultScalarArgValue,
  makeDefaultArg : MakeDefaultArg | null,
  parentField : Field,
  fields : GraphQLInputField[],
  directParentArg : GraphQLArgument
) : ObjectFieldNode[] {
  const nodes = [];
  for (const field of fields) {
    if (
      isRequiredInputField(field) ||
      (makeDefaultArg && makeDefaultArg(parentField, field, directParentArg))
    ) {
      const fieldType = unwrapInputType(field.type);
      if (isInputObjectType(fieldType)) {
        const fields = fieldType.getFields();
        nodes.push({
          kind: 'ObjectField',
          name: { kind: 'Name', value: field.name },
          value: {
            kind: 'ObjectValue',
            fields: defaultInputObjectFields(
              getDefaultScalarArgValue,
              makeDefaultArg,
              parentField,
              Object.keys(fields).map(k => fields[k]),
              directParentArg
            ),
          },
        } as ObjectFieldNode);
      } else if (isLeafType(fieldType)) {
        nodes.push({
          kind: 'ObjectField',
          name: { kind: 'Name', value: field.name },
          value: getDefaultScalarArgValue(parentField, field, fieldType, directParentArg),
        } as ObjectFieldNode);
      }
    }
  }
  return nodes;
}

function defaultArgs(
  getDefaultScalarArgValue : GetDefaultScalarArgValue,
  makeDefaultArg : MakeDefaultArg | null,
  field : Field
) : ArgumentNode[] {
  const args = [];
  for (const arg of field.args) {
    if (isRequiredArgument(arg) || (makeDefaultArg && makeDefaultArg(field, arg))) {
      const argType = unwrapInputType(arg.type);
      if (isInputObjectType(argType)) {
        const fields = argType.getFields();
        args.push({
          kind: 'Argument',
          name: { kind: 'Name', value: arg.name },
          value: {
            kind: 'ObjectValue',
            fields: defaultInputObjectFields(
              getDefaultScalarArgValue,
              makeDefaultArg,
              field,
              Object.keys(fields).map(k => fields[k]),
              arg
            ),
          },
        } as ArgumentNode);
      } else if (isLeafType(argType)) {
        args.push({
          kind: 'Argument',
          name: { kind: 'Name', value: arg.name },
          value: getDefaultScalarArgValue(field, arg, argType),
        } as ArgumentNode);
      }
    }
  }
  return args;
}

class FieldView extends React.PureComponent<FieldViewProps, {displayFieldActions : boolean}> {
  state = {displayFieldActions: false};
  _previousSelection ?: FieldNode;

  _addAllFieldsToSelections = (rawSubfields ?: GraphQLFieldMap<any, any>) => {
    const subFields : FieldNode[] = rawSubfields
      ? Object.keys(rawSubfields).map(fieldName => {
        return {
          kind: 'Field',
          name: { kind: 'Name', value: fieldName },
          arguments: [],
        };
      })
      : [];

    const subSelectionSet : SelectionSetNode = {
      kind: 'SelectionSet',
      selections: subFields,
    };

    const nextSelections = [
      ...this.props.selections.filter(selection => {
        if (selection.kind === 'InlineFragment') {
          return true;
        } else {
          // Remove the current selection set for the target field
          return selection.name.value !== this.props.field.name;
        }
      }),
      {
        kind: 'Field',
        name: { kind: 'Name', value: this.props.field.name },
        arguments: defaultArgs(
          this.props.getDefaultScalarArgValue,
          this.props.makeDefaultArg || null,
          this.props.field
        ),
        selectionSet: subSelectionSet,
      } as FieldNode,
    ];

    this.props.modifySelections(nextSelections);
  };

  _addFieldToSelections = (/*_rawSubfields?: GraphQLFieldMap<any, any>*/) => {
    const nextSelections = [
      ...this.props.selections,
      this._previousSelection || {
        kind: 'Field',
        name: { kind: 'Name', value: this.props.field.name },
        arguments: defaultArgs(
          this.props.getDefaultScalarArgValue,
          this.props.makeDefaultArg || null,
          this.props.field
        ),
      },
    ];

    this.props.modifySelections(nextSelections);
  };

  _handleUpdateSelections = (event : React.MouseEvent) => {
    const selection = this._getSelection();
    if (selection && !event.altKey) {
      this._removeFieldFromSelections();
    } else {
      const fieldType = getNamedType(this.props.field.type);
      const rawSubfields : GraphQLFieldMap<any, any> | undefined = isObjectType(fieldType)
        ? fieldType.getFields()
        : undefined;

      const shouldSelectAllSubfields = !!rawSubfields && event.altKey;

      shouldSelectAllSubfields
        ? this._addAllFieldsToSelections(rawSubfields)
        : this._addFieldToSelections(rawSubfields);
    }
  };

  _removeFieldFromSelections = () => {
    const previousSelection = this._getSelection();
    this._previousSelection = previousSelection;
    this.props.modifySelections(
      this.props.selections.filter((selection : FieldNode) => selection !== previousSelection)
    );
  };

  _getSelection = () : FieldNode | undefined => {
    const selection = this.props.selections.find(
      (selection : FieldNode) =>
        selection.kind === 'Field' && this.props.field.name === selection.name.value
    );
    if (!selection) {
      return undefined;
    }
    if (selection.kind === 'Field') {
      return selection;
    }
    return undefined;
  };

  _setArguments = (
    argumentNodes : readonly ArgumentNode[],
    options ?: {commit : boolean},
  ) : DocumentNode | null => {
    const selection = this._getSelection();
    if (!selection) {
      console.error('Missing selection when setting arguments', argumentNodes);
      return;
    }
    return this.props.modifySelections(
      this.props.selections.map((s : FieldNode) =>
        s === selection
          ? {
            alias: selection.alias,
            arguments: argumentNodes,
            directives: selection.directives,
            kind: 'Field',
            name: selection.name,
            selectionSet: selection.selectionSet,
          }
          : s
      ),
      options,
    );
  };

  _modifyChildSelections = (
    selections : Selections,
    options ?: {commit : boolean},
  ) : DocumentNode | null => {
    return this.props.modifySelections(
      this.props.selections.map((selection : SelectionNode) => {
        if (selection.kind === 'Field' && this.props.field.name === selection.name.value) {
          if (selection.kind !== 'Field') {
            throw new Error('invalid selection');
          }
          return {
            alias: selection.alias,
            arguments: selection.arguments,
            directives: selection.directives,
            kind: 'Field',
            name: selection.name,
            selectionSet: {
              kind: 'SelectionSet',
              selections,
            },
          };
        }
        return selection;
      }),
      options,
    );
  };

  render() {
    const { field, schema, getDefaultFieldNames, getScalarArgInput, styleConfig } = this.props;
    const selection = this._getSelection();
    const type = unwrapOutputType(field.type);
    const args = field.args.sort((a, b) => a.name.localeCompare(b.name));
    let className = `graphiql-explorer-node graphiql-explorer-${field.name}`;

    if (field.isDeprecated) {
      className += 'graphiql-explorer-deprecated';
    }

    const availableInterfaceFragments = isObjectType(type)
      ? type.getInterfaces().reduce((acc, next) => {
        if (next.name !== type.name) {
          return [
            ...acc,
            ...((this.props.availableFragments || {})[next.name] || []),
          ];
        }

        // Don't add these matches, since they'll be picked up by the simpler next check
        return acc;
      }, [])
      : null;

    const basicApplicableFragments =
      isObjectType(type) || isInterfaceType(type) || isUnionType(type)
        ? this.props.availableFragments &&
          this.props.availableFragments[type.name]
        : null;

    const applicableFragments = [
      ...(basicApplicableFragments || []),
      ...(availableInterfaceFragments || []),
    ];

    const containsMeaningfulSubselection =
      (isObjectType(type) || isInterfaceType(type)) &&
      selection &&
      selection.selectionSet &&
      selection.selectionSet.selections.filter(
        selection => selection.kind !== 'FragmentSpread',
      ).length > 0;

    const node = (
      <div className={className}>
        <Tooltip
          transitionName={null}
          arrowPointAtCenter
          placement="rightTop"
          title={field.description || ''}
        >
          <span
            style={{
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              minHeight: '16px',
              WebkitUserSelect: 'none',
              userSelect: 'none',
            }}
            data-field-name={field.name}
            data-field-type={type.name}
            onClick={this._handleUpdateSelections}
          >
            {(isObjectType(type) || args.length) ? (
              <span>
                {selection
                  ? this.props.styleConfig.arrowOpen
                  : this.props.styleConfig.arrowClosed}
              </span>
            ) : null}
            <Checkbox checked={!!selection} styleConfig={this.props.styleConfig} />
            <span style={{ color: styleConfig.colors.property }}>{field.name}</span>
          </span>
        </Tooltip>
        {!containsMeaningfulSubselection ? null : (
          <Fragment>
            {' '}
            <Tooltip
              transitionName={null}
              title="Extract selections into a new reusable fragment"
            >
              <span style={{ cursor: 'pointer' }}>
                <button
                  type="submit"
                  className="toolbar-button"
                  onClick={event => {
                    event.preventDefault();
                    event.stopPropagation();
                    // 1. Create a fragment spread node
                    // 2. Copy selections from this object to fragment
                    // 3. Replace selections in this object with fragment spread
                    // 4. Add fragment to document
                    const typeName = type.name;
                    let newFragmentName = `${typeName}Fragment`;

                    const conflictingNameCount = (applicableFragments || []).filter(
                      (fragment : FragmentDefinitionNode) => {
                        return fragment.name.value.startsWith(newFragmentName);
                      },
                    ).length;

                    if (conflictingNameCount > 0) {
                      newFragmentName = `${newFragmentName}${conflictingNameCount}`;
                    }

                    const childSelections = selection
                      ? selection.selectionSet
                        ? selection.selectionSet.selections
                        : []
                      : [];

                    const nextSelections = [
                      {
                        kind: 'FragmentSpread',
                        name: {
                          kind: 'Name',
                          value: newFragmentName,
                        },
                        directives: [],
                      },
                    ];

                    const newFragmentDefinition : FragmentDefinitionNode = {
                      kind: 'FragmentDefinition',
                      name: {
                        kind: 'Name',
                        value: newFragmentName,
                      },
                      typeCondition: {
                        kind: 'NamedType',
                        name: {
                          kind: 'Name',
                          value: type.name,
                        },
                      },
                      directives: [],
                      selectionSet: {
                        kind: 'SelectionSet',
                        selections: childSelections,
                      },
                    };

                    const newDoc = this._modifyChildSelections(
                      nextSelections,
                      false,
                    );

                    if (newDoc) {
                      const newDocWithFragment = {
                        ...newDoc,
                        definitions: [...newDoc.definitions, newFragmentDefinition],
                      };

                      this.props.onCommit(newDocWithFragment);
                    } else {
                      console.warn('Unable to complete extractFragment operation');
                    }
                  }}
                  style={{
                    ...styleConfig.styles.actionButtonStyle,
                  }}>
                  <span>{'…'}</span>
                </button>
              </span>
            </Tooltip>
          </Fragment>
        )}
        {selection && args.length ? (
          <div
            style={{ marginLeft: 16 }}
            className="graphiql-explorer-graphql-arguments"
          >
            {args.map(arg => (
              <ArgView
                key={arg.name}
                parentField={field}
                arg={arg}
                selection={selection}
                modifyArguments={this._setArguments}
                getDefaultScalarArgValue={this.props.getDefaultScalarArgValue}
                getScalarArgInput={getScalarArgInput}
                makeDefaultArg={this.props.makeDefaultArg}
                onRunOperation={this.props.onRunOperation}
                styleConfig={this.props.styleConfig}
                onCommit={this.props.onCommit}
                definition={this.props.definition}
              />
            ))}
          </div>
        ) : null}
      </div>
    );

    if (selection && (isObjectType(type) || isInterfaceType(type) || isUnionType(type))) {
      const fields = isUnionType(type) ? {} : type.getFields();
      const childSelections = selection
        ? selection.selectionSet
          ? selection.selectionSet.selections
          : []
        : [];
      return (
        <div className={`graphiql-explorer-${field.name}`}>
          {node}
          <div style={{ marginLeft: 16 }}>
            {!!applicableFragments
              ? applicableFragments.map(fragment => {
                const type = schema.getType(
                  fragment.typeCondition.name.value,
                );
                const fragmentName = fragment.name.value;
                return !type ? null : (
                  <FragmentView
                    key={fragmentName}
                    fragment={fragment}
                    selections={childSelections}
                    modifySelections={this._modifyChildSelections}
                    schema={schema}
                    styleConfig={this.props.styleConfig}
                    onCommit={this.props.onCommit}
                  />
                );
              })
              : null}
            {Object.keys(fields)
              .sort()
              .map(fieldName => (
                <FieldView
                  key={fieldName}
                  field={fields[fieldName]}
                  selections={childSelections}
                  modifySelections={this._modifyChildSelections}
                  schema={schema}
                  getDefaultFieldNames={getDefaultFieldNames}
                  getDefaultScalarArgValue={this.props.getDefaultScalarArgValue}
                  getScalarArgInput={getScalarArgInput}
                  makeDefaultArg={this.props.makeDefaultArg}
                  onRunOperation={this.props.onRunOperation}
                  styleConfig={this.props.styleConfig}
                  onCommit={this.props.onCommit}
                  definition={this.props.definition}
                  availableFragments={this.props.availableFragments}
                />
              ))}
            {isInterfaceType(type) || isUnionType(type)
              ? schema
                .getPossibleTypes(type)
                .map(type => (
                  <AbstractView
                    key={type.name}
                    implementingType={type}
                    selections={childSelections}
                    modifySelections={this._modifyChildSelections}
                    schema={schema}
                    getDefaultFieldNames={getDefaultFieldNames}
                    getDefaultScalarArgValue={this.props.getDefaultScalarArgValue}
                    getScalarArgInput={getScalarArgInput}
                    makeDefaultArg={this.props.makeDefaultArg}
                    onRunOperation={this.props.onRunOperation}
                    styleConfig={this.props.styleConfig}
                    onCommit={this.props.onCommit}
                    definition={this.props.definition}
                  />
                ))
              : null}
          </div>
        </div>
      );
    }
    return node;
  }
}

function parseQuery(text : string) : DocumentNode | Error | null {
  try {
    if (!text.trim()) {
      return null;
    }
    return parse(
      text,
      // Tell graphql to not bother track locations when parsing, we don't need
      // it and it's a tiny bit more expensive.
      { noLocation: true }
    );
  } catch (e) {
    return new Error(e);
  }
}

const DEFAULT_QUERY_OPERATION = {
  kind: 'OperationDefinition',
  operation: 'query',
  variableDefinitions: [],
  name: { kind: 'Name', value: 'MyQuery' },
  directives: [],
  selectionSet: {
    kind: 'SelectionSet',
    selections: [],
  },
} as OperationDefinitionNode;

const DEFAULT_MUTATION_OPERATION = {
  kind: 'OperationDefinition',
  operation: 'mutation',
  variableDefinitions: [],
  name: { kind: 'Name', value: 'MyMutation' },
  directives: [],
  selectionSet: {
    kind: 'SelectionSet',
    selections: [],
  },
} as OperationDefinitionNode;

const DEFAULT_DOCUMENT : DocumentNode = {
  kind: 'Document',
  definitions: [DEFAULT_QUERY_OPERATION, DEFAULT_MUTATION_OPERATION],
};
let parseQueryMemoize : [string, DocumentNode] | null = null;
function memoizeParseQuery(query : string) : DocumentNode {
  if (parseQueryMemoize && parseQueryMemoize[0] === query) {
    return parseQueryMemoize[1];
  } else {
    const result = parseQuery(query);
    if (!result) {
      return DEFAULT_DOCUMENT;
    } else if (result instanceof Error) {
      if (parseQueryMemoize) {
        // Most likely a temporarily invalid query while they type
        return parseQueryMemoize[1];
      } else {
        return DEFAULT_DOCUMENT;
      }
    } else {
      const isQueryAbsent = !result?.definitions.find(definition =>
        (definition?.operation === 'query' &&
        (definition?.name?.value === 'MyQuery' || typeof definition?.name?.value === 'undefined')));
      const isMutationAbsent = !result?.definitions.find(definition =>
        (definition?.operation === 'mutation' &&
        (definition?.name?.value === 'MyMutation' || typeof definition?.name?.value === 'undefined')));

      if (isQueryAbsent) {
        result.definitions.unshift(DEFAULT_QUERY_OPERATION);
      }

      if (isMutationAbsent) {
        result.definitions.push(DEFAULT_MUTATION_OPERATION);
      }

      result.definitions.sort((a, b) => {
        if (a?.operation === b?.operation) {
          return a.name?.value < b.name?.value ? -1 : 1
        } else {
          return a?.operation === 'query' ? -1 : 1
        }
      });

      parseQueryMemoize = [query, result];
      return result;
    }
  }
}

const defaultStyles : Styles = {
  buttonStyle: {
    fontSize: '1.2em',
    padding: '0px',
    backgroundColor: 'white',
    border: 'none',
    margin: '5px 0px',
    height: '40px',
    width: '100%',
    display: 'block',
    maxWidth: 'none',
  },

  actionButtonStyle: {
    padding: '0px',
    backgroundColor: 'white',
    border: 'none',
    margin: '0px',
    maxWidth: 'none',
    height: '16px',
    width: '16px',
    display: 'inline-block',
    fontSize: 'smaller',
    textAlign: 'center',
  },

  explorerActionsStyle: {
    margin: 'auto',
    padding: '4px',
    bottom: '0px',
    width: '100%',
    textAlign: 'center',
    background: 'none',
    borderTop: 'none',
    borderBottom: 'none',
  },
};

type RootViewProps = {
  schema : GraphQLSchema;
  isLast : boolean;
  fields ?: GraphQLFieldMap<any, any>;
  operationType : OperationType,
  name ?: string;
  onTypeName ?: string;
  definition : FragmentDefinitionNode | OperationDefinitionNode;
  onEdit : (
    operationDef ?: OperationDefinitionNode | FragmentDefinitionNode,
    commit : boolean,
  ) => DocumentNode;
  onCommit : (document : DocumentNode) => void;
  onOperationRename : (query : string) => void;
  onOperationDestroy : () => void;
  onOperationClone : () => void;
  onRunOperation : (name ?: string) => void;
  onMount : (rootViewElId : string) => void;
  getDefaultFieldNames : (type : GraphQLObjectType) => Array<string>;
  getDefaultScalarArgValue : GetDefaultScalarArgValue;
  getScalarArgInput : GetScalarArgInput;
  makeDefaultArg ?: MakeDefaultArg;
  styleConfig : StyleConfig;
  availableFragments : AvailableFragments;
};

class RootView extends React.PureComponent<
  RootViewProps,
  {NewOperationType : NewOperationType, displayTitleActions : boolean}
> {
  state = {NewOperationType: 'query', displayTitleActions: true};
  _previousOperationDef ?: OperationDefinitionNode | FragmentDefinitionNode;

  _modifySelections = (
    selections : Selections,
    options ?: {commit : boolean},
  ) : DocumentNode => {
    let operationDef : FragmentDefinitionNode | OperationDefinitionNode = this.props.definition;

    if (operationDef.selectionSet.selections.length === 0 && this._previousOperationDef) {
      operationDef = this._previousOperationDef;
    }

    let newOperationDef : OperationDefinitionNode | FragmentDefinitionNode | undefined;

    if (operationDef.kind === 'FragmentDefinition') {
      newOperationDef = {
        ...operationDef,
        selectionSet: {
          ...operationDef.selectionSet,
          selections,
        },
      };
    } else if (operationDef.kind === 'OperationDefinition') {
      let cleanedSelections = selections.filter(selection => {
        return !(
          selection.kind === 'Field' && selection.name.value === '__typename'
        );
      });

      if (cleanedSelections.length === 0) {
        cleanedSelections = [
          {
            kind: 'Field',
            name: {
              kind: 'Name',
              value: '__typename',
            },
          },
        ];
      }

      newOperationDef = {
        ...operationDef,
        selectionSet: {
          ...operationDef.selectionSet,
          selections: cleanedSelections,
        },
      };
    }

    return this.props.onEdit(newOperationDef, options);
  };

  _onOperationRename = (event : React.ChangeEvent<HTMLInputElement>) =>
    this.props.onOperationRename(event.target.value);

  _handlePotentialRun = (event : React.KeyboardEvent<HTMLInputElement>) => {
    if (isRunShortcut(event) && canRunOperation(this.props.definition.kind)) {
      this.props.onRunOperation(this.props.name);
    }
  };

  _rootViewElId = () => {
    const {operationType, name} = this.props;
    const rootViewElId = `${operationType}-${name || 'unknown'}`;
    return rootViewElId;
  };

  componentDidMount() {
    const rootViewElId = this._rootViewElId();

    this.props.onMount(rootViewElId);
  }

  render() {
    const {
      operationType,
      definition,
      schema,
      getDefaultFieldNames,
      getScalarArgInput,
      styleConfig,
    } = this.props;
    const rootViewElId = this._rootViewElId();

    const fields = this.props.fields || {};
    const operationDef = definition;
    const selections = operationDef.selectionSet.selections;

    const operationDisplayName = `${capitalize(operationType)} Name`;

    return (
      <div
        id={rootViewElId}
        tabIndex='0'
        onKeyDown={this._handlePotentialRun}
        style={{
          borderBottom: this.props.isLast ? 'none' : '1px solid #d6d6d6',
          marginLeft: 16,
          marginBottom: '0em',
          paddingBottom: '1em',
        }}
      >
        <div
          style={{
            color: styleConfig.colors.keyword,
            paddingBottom: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
          className="graphiql-operation-title-bar"
        >
          <div style={{ width: '10ch', minWidth: '10ch'}}>
            {operationType}
          </div>
          {' '}
          <span style={{ color: styleConfig.colors.def }}>
            <input
              style={{
                color: styleConfig.colors.def,
                border: 'none',
                borderBottom: '1px solid #888',
                outline: 'none',
                width: `${Math.max(15, this.props?.name?.length ?? 0)}ch`
              }}
              autoComplete="false"
              placeholder={operationDisplayName}
              value={this.props.name || undefined}
              onKeyDown={this._handlePotentialRun}
              onChange={this._onOperationRename}
            />
          </span>
          <div
            style={{float: 'right', paddingTop: '4px' }}
          >
            {!!this.state.displayTitleActions ? (
              <React.Fragment>
                <Fragment>
                  {' '}
                  <Tooltip
                    transitionName={null}
                    title="Remove"
                  >
                    <span style={{ cursor: 'pointer' }}>
                      <button
                        type="submit"
                        className="toolbar-button"
                        onClick={() => this.props.onOperationDestroy()}
                        style={{
                          ...styleConfig.styles.actionButtonStyle,
                        }}>
                        <span><b>{'\u2715'}</b></span>
                      </button>
                    </span>
                  </Tooltip>
                  {' '}
                </Fragment>
                <Fragment>
                  <Tooltip
                    transitionName={null}
                    title="Copy"
                  >
                    <span style={{ cursor: 'pointer' }}>
                      <button
                        type="submit"
                        className="toolbar-button"
                        onClick={() => this.props.onOperationClone()}
                        style={{
                          ...styleConfig.styles.actionButtonStyle,
                        }}>
                        <span>{'⧉'}</span>
                      </button>
                    </span>
                    <span>&nbsp;</span>
                  </Tooltip>
                </Fragment>
              </React.Fragment>
            ) : (
              ''
            )
            }
          </div>
        </div>
        {this.props.onTypeName ? (
          <div
            style={{
              paddingBottom: 2,
              display: 'flex',
            }}
          >
            <span style={{ color: styleConfig.colors.keyword }}>
              on&nbsp;
            </span>
            <span style={{ color: styleConfig.colors.atom }}>
              {`${this.props.onTypeName}`}
            </span>
          </div>
        ) : (
          ''
        )}

        {Object.keys(fields)
          .sort()
          .map((fieldName : string) => (
            <FieldView
              key={fieldName}
              field={fields[fieldName]}
              selections={selections}
              modifySelections={this._modifySelections}
              schema={schema}
              getDefaultFieldNames={getDefaultFieldNames}
              getDefaultScalarArgValue={this.props.getDefaultScalarArgValue}
              getScalarArgInput={getScalarArgInput}
              makeDefaultArg={this.props.makeDefaultArg}
              onRunOperation={this.props.onRunOperation}
              styleConfig={this.props.styleConfig}
              onCommit={this.props.onCommit}
              definition={this.props.definition}
              availableFragments={this.props.availableFragments}
            />
          ))}
      </div>
    );
  }
}

class Explorer extends React.PureComponent<Props, State> {
  static defaultProps = {
    getDefaultFieldNames: defaultGetDefaultFieldNames,
    getDefaultScalarArgValue: defaultGetDefaultScalarArgValue,
    getScalarArgInput: () => false,
  };

  state = {
    newOperationType: 'query',
    operation: null,
    operationToScrollTo: null,
  };

  _ref ?: any;
  _resetScroll = () => {
    const container = this._ref;
    if (container) {
      container.scrollLeft = 0;
    }
  };
  componentDidMount() {
    this._resetScroll();
  }
  _onEdit = (query : string) : void => this.props.onEdit(query);

  _setAddOperationType = (value : NewOperationType) => {
    this.setState({newOperationType: value});
  };

  _handleRootViewMount = (rootViewElId : string) => {
    if (
      !!this.state.operationToScrollTo &&
      this.state.operationToScrollTo === rootViewElId
    ) {
      const selector = `.graphiql-explorer-root #${rootViewElId}`;

      const el = document.querySelector(selector);
      el && el.scrollIntoView();
    }
  };

  render() {
    const { schema, query, makeDefaultArg, getScalarArgInput } = this.props;

    if (!schema) {
      return (
        <div style={{ fontFamily: 'sans-serif' }} className="error-container">
          No Schema Available
        </div>
      );
    }
    const styleConfig : StyleConfig = {
      colors: this.props.colors || defaultColors,
      checkboxChecked: this.props.checkboxChecked || defaultCheckboxChecked,
      checkboxUnchecked: this.props.checkboxUnchecked || defaultCheckboxUnchecked,
      arrowClosed: this.props.arrowClosed || defaultArrowClosed,
      arrowOpen: this.props.arrowOpen || defaultArrowOpen,
      styles: this.props.styles
        ? {
          ...defaultStyles,
          ...this.props.styles,
        }
        : defaultStyles,
    };
    const queryType = schema.getQueryType();
    const mutationType = schema.getMutationType();
    const subscriptionType = schema.getSubscriptionType();
    if (!queryType && !mutationType && !subscriptionType) {
      return <div>Missing any query or mutation or subscription</div>;
    }
    const queryFields = queryType ? queryType.getFields() : undefined;
    const mutationFields = mutationType ? mutationType.getFields() : undefined;
    const subscriptionFields = subscriptionType ? subscriptionType.getFields() : undefined;

    const parsedQuery : DocumentNode = memoizeParseQuery(query);
    const getDefaultFieldNames = this.props.getDefaultFieldNames || defaultGetDefaultFieldNames;
    const getDefaultScalarArgValue =
      this.props.getDefaultScalarArgValue || defaultGetDefaultScalarArgValue;

    const definitions = parsedQuery.definitions;

    const _relevantOperations = definitions.filter(
      ({ kind }) => kind === 'FragmentDefinition' || kind === 'OperationDefinition'
    );

    const relevantOperations =
      // If we don't have any relevant definitions from the parsed document,
      // then at least show an expanded Query selection
      _relevantOperations.length === 0 ? DEFAULT_DOCUMENT.definitions : _relevantOperations;

    const renameOperation = (
      targetOperation : OperationDefinitionNode | FragmentDefinitionNode,
      name ?: string
    ) => {
      const targetOperationExistingName =
        (targetOperation.name && targetOperation.name.value) || 'unknown';

      const newName : NameNode = { kind: 'Name', value: name || '', loc: undefined };

      const targetOperationIsFragment =
        targetOperation.kind === 'FragmentDefinition';

      return visit(parsedQuery, {
        OperationDefinition: node => {
          if (
            !targetOperationIsFragment &&
            !!newName &&
            node?.name?.value === targetOperation?.name?.value
          ) {
            return {...node, name: newName};
          }
        },
        FragmentDefinition: node => {
          if (
            targetOperationIsFragment &&
            !!newName &&
            node?.name?.value === targetOperation?.name?.value
          ) {
            return {...node, name: newName};
          }
        },
        FragmentSpread: node => {
          if (
            targetOperationIsFragment &&
            node.name.value === targetOperationExistingName
          ) {
            return {...node, name: {...newName}};
          }
        },
      });

    };

    const cloneOperation = (
      targetOperation : OperationDefinitionNode | FragmentDefinitionNode,
    ) => {
      let kind;
      if (targetOperation.kind === 'FragmentDefinition') {
        kind = 'fragment';
      } else {
        kind = targetOperation.operation;
      }

      const newOperationName =
        ((targetOperation.name && targetOperation.name.value) || '') + 'Copy';

      const newName = {
        kind: 'Name',
        value: newOperationName,
        loc: undefined,
      };

      const clonedOperation = JSON.parse(JSON.stringify(targetOperation));

      if (clonedOperation.selectionSet.selections.length === 0) {
        clonedOperation.selectionSet.selections = [
          {
            kind: 'Field',
            name: {
              kind: 'Name',
              value: '__typename',
            },
          },
        ];
      }

      const newOperation = {...clonedOperation, name: newName};

      const existingDefs = parsedQuery.definitions;

      const newDefinitions = [...existingDefs, newOperation];

      this.setState({operationToScrollTo: `${kind}-${newOperationName}`});

      return {
        ...parsedQuery,
        definitions: newDefinitions,
      };
    };

    const destroyOperation = targetOperation => {
      const targetOperationExistingName =
        (targetOperation.name && targetOperation.name.value) || 'unknown';

      const targetOperationIsFragment =
        targetOperation.kind === 'FragmentDefinition';

      const existingDefs = parsedQuery.definitions;

      let newDefinitions = existingDefs.filter(existingOperation => {
        if (targetOperation === existingOperation) {
          return false;
        } else {
          return true;
        }
      });

      if (targetOperationIsFragment) {
        newDefinitions = visit(newDefinitions, {
          FragmentSpread: node => {
            if (
              targetOperationIsFragment &&
              node.name.value === targetOperationExistingName
            ) {
              return null;
            }
          },
        });
      }

      return {
        ...parsedQuery,
        definitions: newDefinitions,
      };
    };

    const addOperation = (kind : NewOperationType) => {
      const existingDefs = parsedQuery.definitions;

      const viewingDefaultOperation =
        parsedQuery.definitions.length === 2 &&
        parsedQuery.definitions[0] === DEFAULT_DOCUMENT.definitions[0] &&
        parsedQuery.definitions[1] === DEFAULT_DOCUMENT.definitions[1];


      const MySiblingDefs = existingDefs.filter(def => {
        if (def.kind === 'OperationDefinition') {
          return def.operation === kind;
        } else {
          // Don't support adding fragments from explorer
          return false;
        }
      });

      const newOperationName = `My${capitalize(kind)}${
        MySiblingDefs.length === 0 ? '' : MySiblingDefs.length
      }`;

      // Add this as the default field as it guarantees a valid selectionSet
      const firstFieldName = '__typename';

      const selectionSet : SelectionSetNode = {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: {
              kind: 'Name',
              value: firstFieldName,
              loc: undefined,
            },
            arguments: [],
            directives: [],
            selectionSet: undefined,
            loc: undefined,
          },
        ],
        loc: undefined,
      };

      const newDefinition : OperationDefinitionNode = {
        kind: 'OperationDefinition',
        operation: kind,
        name: { kind: 'Name', value: newOperationName },
        variableDefinitions: [],
        directives: [],
        selectionSet: selectionSet,
        loc: undefined,
      };

      const newDefinitions =
        // If we only have our default operation in the document right now, then
        // just replace it with our new definition
        viewingDefaultOperation ? [newDefinition] : [...parsedQuery.definitions, newDefinition];

      const newOperationDef = {
        ...parsedQuery,
        definitions: newDefinitions,
      };

      this.setState({operationToScrollTo: `${kind}-${newOperationName}`});
      newOperationDef.definitions = newOperationDef.definitions.filter(
        operation => operation.selectionSet.selections.length !== 0);
      this.props.onEdit(prettify(print(newOperationDef)));
    };

    const actionsOptions = [
      !!queryFields ? (
        <option
          key='query'
          className={'toolbar-button'}
          style={styleConfig.styles.buttonStyle}
          type='link'
          value={'query'}>
          Query
        </option>
      ) : null,
      !!mutationFields ? (
        <option
          key='mutation'
          className={'toolbar-button'}
          style={styleConfig.styles.buttonStyle}
          type='link'
          value={'mutation'}>
          Mutation
        </option>
      ) : null,
      !!subscriptionFields ? (
        <option
          key='subscription'
          className={'toolbar-button'}
          style={styleConfig.styles.buttonStyle}
          type='link'
          value={'subscription'}>
          Subscription
        </option>
      ) : null,
    ].filter(Boolean);

    const actionsEl =
      actionsOptions.length === 0 ? null : (
        <div
          style={{
            minHeight: '40px',
            maxHeight: '40px',
            overflow: 'none',
            paddingLeft: '5px',
            paddingRight: '5px',
            justifyContent: 'space-between',
            borderTop: '1px solid rgb(214, 214, 214)',
            borderBottom: 'none',
            display: 'flex',
            alignItems: 'center',
          }}>
          <div
            style={{
              display: 'inline-block',
              flexGrow: '0',
              textAlign: 'right',
            }}>
            Add new
          </div>
          {' '}
          <form
            className="variable-editor-title graphiql-explorer-actions"
            style={{
              ...styleConfig.styles.explorerActionsStyle,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              padding: '4px 10px 4px 10px',
            }}
            onSubmit={event => event.preventDefault()}>
            <select
              onChange={event => this._setAddOperationType(event.target.value)}
              value={this.state.newOperationType}
              style={{
                flexGrow: 1,
                paddingRight: '10px',
              }}>
              {actionsOptions}
            </select>
          </form>
          {' '}
          <Tooltip
            transitionName={null}
            title="Add operation"
          >
            <span style={{ cursor: 'pointer' }}>
              <button
                type="submit"
                className="toolbar-button"
                onClick={() =>
                  this.state.newOperationType
                    ? addOperation(this.state.newOperationType)
                    : null
                }
                style={{
                  ...styleConfig.styles.buttonStyle,
                  height: '22px',
                  width: '22px',
                }}>
                <span><b>+</b></span>
              </button>
            </span>
          </Tooltip>
        </div>
      );

    const availableFragments : AvailableFragments = relevantOperations.reduce(
      (acc, operation) => {
        if (operation.kind === 'FragmentDefinition') {
          const fragmentTypeName = operation.typeCondition.name.value;
          const existingFragmentsForType = acc[fragmentTypeName] || [];
          const newFragmentsForType = [
            ...existingFragmentsForType,
            operation,
          ].sort((a, b) => a.name.value.localeCompare(b.name.value));
          return {
            ...acc,
            [fragmentTypeName]: newFragmentsForType,
          };
        }

        return acc;
      },
      {},
    );

    return (
      <div
        ref={ref => {
          this._ref = ref;
        }}
        style={{
          fontSize: 12,
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          margin: 0,
          padding: 0,
          fontFamily: 'Consolas, Inconsolata, "Droid Sans Mono", Monaco, monospace',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
        className="graphiql-explorer-root"
      >
        <div
          style={{
            flexGrow: '1',
            overflow: 'auto',
            display: 'block',
          }}>
          {relevantOperations.map(
            (
              operation : OperationDefinitionNode | FragmentDefinitionNode,
              index,
            ) => {
              const operationName =
                operation && operation.name && operation.name.value;

              const operationType =
                operation.kind === 'FragmentDefinition'
                  ? 'fragment'
                  : (operation && operation.operation) || 'query';

              const onOperationRename = newName => {
                const newOperationDef = renameOperation(operation, newName);
                newOperationDef.definitions = newOperationDef.definitions.filter(
                  operation => operation.selectionSet.selections.length !== 0);
                this.props.onEdit(prettify(print(newOperationDef)));
              };

              const onOperationClone = () => {
                const newOperationDef = cloneOperation(operation);
                newOperationDef.definitions = newOperationDef.definitions.filter(
                  operation => operation.selectionSet.selections.length !== 0);

                this.props.onEdit(prettify(print(newOperationDef)));
              };

              const onOperationDestroy = () => {
                const newOperationDef = destroyOperation(operation);
                newOperationDef.definitions = newOperationDef.definitions.filter(
                  operation => operation.selectionSet.selections.length !== 0);

                this.props.onEdit(prettify(print(newOperationDef)));
              };

              const fragmentType =
                operation.kind === 'FragmentDefinition' &&
                operation.typeCondition.kind === 'NamedType' &&
                schema.getType(operation.typeCondition.name.value);

              const fragmentFields =
                fragmentType instanceof GraphQLObjectType ||
                fragmentType instanceof GraphQLInterfaceType
                  ? fragmentType.getFields()
                  : null;

              const fields =
                operationType === 'query'
                  ? queryFields
                  : operationType === 'mutation'
                    ? mutationFields
                    : operationType === 'subscription'
                      ? subscriptionFields
                      : operation.kind === 'FragmentDefinition'
                        ? fragmentFields
                        : null;

              const onCommit = (parsedDocument : DocumentNode) => {
                const filteredDocument = Object.assign({}, parsedDocument);
                filteredDocument.definitions = filteredDocument.definitions.filter(
                  operation => operation.selectionSet.selections.length !== 0);

                const textualNewDocument = prettify(print(filteredDocument));
                this.props.onEdit(textualNewDocument);
              };

              const fragmentTypeName =
                operation.kind === 'FragmentDefinition'
                  ? operation.typeCondition.name.value
                  : null;

              return (
                <RootView
                  key={index}
                  isLast={index === relevantOperations.length - 1}
                  fields={fields}
                  operationType={operationType}
                  name={operationName}
                  definition={operation}
                  onOperationRename={onOperationRename}
                  onOperationDestroy={onOperationDestroy}
                  onOperationClone={onOperationClone}
                  onTypeName={fragmentTypeName}
                  onMount={this._handleRootViewMount}
                  onCommit={onCommit}
                  onEdit={(
                    newDefinition ?: DefinitionNode,
                    options ?: {commit : boolean},
                  ) : DocumentNode => {
                    let commit;
                    if (
                      typeof options === 'object' &&
                      typeof options.commit !== 'undefined'
                    ) {
                      commit = options.commit;
                    } else {
                      commit = true;
                    }

                    if (!!newDefinition) {
                      const newQuery : DocumentNode = {
                        ...parsedQuery,
                        definitions: parsedQuery.definitions.map(
                          existingDefinition =>
                            existingDefinition === operation
                              ? newDefinition
                              : existingDefinition,
                        ),
                      };

                      if (commit) {
                        onCommit(newQuery);
                        return newQuery;
                      } else {
                        return newQuery;
                      }
                    } else {
                      return parsedQuery;
                    }
                  }}
                  schema={schema}
                  getDefaultFieldNames={getDefaultFieldNames}
                  getDefaultScalarArgValue={getDefaultScalarArgValue}
                  getScalarArgInput={getScalarArgInput}
                  makeDefaultArg={makeDefaultArg}
                  onRunOperation={() => {
                    if (!!this.props.onRunOperation) {
                      this.props.onRunOperation(operationName);
                    }
                  }}
                  styleConfig={styleConfig}
                  availableFragments={availableFragments}
                />
              );
            }
          )}
        </div>
        {actionsEl}
      </div>
    );
  }
}

type ErrorBoundaryState = {
  hasError : boolean;
  error ?: Error;
  errorInfo ?: React.ErrorInfo;
};

class ErrorBoundary extends React.Component<any, ErrorBoundaryState> {
  state = { hasError: false, error: undefined, errorInfo: undefined };

  componentDidCatch(error : Error, errorInfo : React.ErrorInfo) {
    this.setState({ hasError: true, error, errorInfo });
    console.error('Error in component', error, errorInfo);
  }

  render() {
    const { error, errorInfo, hasError } = this.state;
    if (hasError) {
      return (
        <div style={{ padding: 18, fontFamily: 'sans-serif' }}>
          <div>Something went wrong</div>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {(error || '').toString()}
            <br />
            {(errorInfo || ({} as React.ErrorInfo)).componentStack}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

const DEFAULT_EXPLORER_WIDTH = 300;
const MIN_EXPLORER_WIDTH = 260;

type GraphiQLExplorerState = {
  explorerWidth : number,
};

class GraphiQLExplorer extends React.PureComponent<GraphiQLExplorerProps, GraphiQLExplorerState> {
  static defaultValue = defaultValue;
  static defaultProps = {
    explorerWidth: DEFAULT_EXPLORER_WIDTH,
    title: 'Explorer',
  };

  state = {
    explorerWidth : Number(this.props.storage.getItem('graphiql:explorerWidth') ?? this.props.explorerWidth),
  };

  explorerContainer : Maybe<HTMLDivElement>;

  private getLeft = (initialElem : HTMLElement) => {
    let pt = 0;
    let elem = initialElem;
    while (elem.offsetParent) {
      pt += elem.offsetLeft;
      elem = elem.offsetParent as HTMLElement;
    }
    return pt;
  }

  private handleDocsResetResize = () => {
    this.setState({
      explorerWidth: this.props.explorerWidth,
    });
    debounce(500, () =>
      this.props.storage.setItem(
        'graphiql:explorerWidth',
        JSON.stringify(this.state.explorerWidth),
      ),
    )();
  };

  private handleDocsResizeStart : MouseEventHandler<
    HTMLDivElement
  > = downEvent => {
      downEvent.preventDefault();

      const hasWidth = this.state.explorerWidth;
      const offset = downEvent.clientX - this.getLeft(downEvent.target as HTMLElement);

      let onMouseMove : OnMouseMoveFn = moveEvent => {
        if (moveEvent.buttons === 0) {
          return onMouseUp();
        }

        const app = this.explorerContainer as HTMLElement;
        const newWidth = moveEvent.clientX - this.getLeft(app) - offset

        if (newWidth < MIN_EXPLORER_WIDTH) {
          this.props.explorerIsOpen = !this.props.explorerIsOpen;
          this.setState({
            explorerWidth: hasWidth,
          });
        } else {
          this.setState({
            explorerWidth: newWidth,
          });
        }
        debounce(500, () =>
          this.props.storage.setItem(
            'graphiql:explorerWidth',
            JSON.stringify(this.state.explorerWidth),
          ),
        )();
        this.props.storage.setItem(
          'graphiql:explorerIsOpen',
          JSON.stringify(this.props.explorerIsOpen),
        )
      };

      let onMouseUp : OnMouseUpFn = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        onMouseMove = null;
        onMouseUp = null;
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

  render() {
    return (
      <div
        ref={n => {
          this.explorerContainer = n;
        }}
        className="docExplorerWrap"
        style={{
          height: '100%',
          width: this.state.explorerWidth,
          zIndex: 7,
          display: this.props.explorerIsOpen ? 'flex' : 'none',
          flexDirection: 'column',
          padding: '0px',
        }}
      >
        <div
          className="doc-explorer-title-bar"
          style={{width: 'inherit'}}
        >
          <div className="doc-explorer-title">{this.props.title}</div>
          <div className="doc-explorer-rhs">
            <div className="docExplorerHide" onClick={this.props.onToggleExplorer}>
              {'\u2715'}
            </div>
          </div>
        </div>
        <div
          className="doc-explorer-contents"
          style={{
            padding: '0px',
            /* Unset overflowY since docExplorerWrap sets it and it'll
            cause two scrollbars (one for the container and one for the schema tree) */
            overflowY: 'unset',
            minWidth: 0,
            width: 'inherit',
          }}>
          <ErrorBoundary>
            <Explorer {...this.props} />
          </ErrorBoundary>
        </div>
        <div
          className="explorerResizer"
          style={{
            cursor: 'col-resize',
            height: '100%',
            right: '-5px',
            position: 'absolute',
            top: 0,
            width: '10px',
            zIndex: 10,
          }}
          onDoubleClick={this.handleDocsResetResize}
          onMouseDown={this.handleDocsResizeStart}
        />
      </div>
    );
  }
}

export default GraphiQLExplorer;
