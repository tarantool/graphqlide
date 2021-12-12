/**
 * Copied from https://github.com/OneGraph/graphiql-explorer (0.4.5)
 * We fork because we need to support customizable fields and could not wait for
 * the PR process to finish. Also converted Flow type to TypeScript.
 */
import { Tooltip } from 'antd';
import prettier from 'prettier/standalone';
import parserGraphql from 'prettier/parser-graphql';
import React, { Fragment } from 'react';

import {
  getNamedType,
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
  parse,
  print,
} from 'graphql';

import {
  ArgumentNode,
  DocumentNode,
  FieldNode,
  GraphQLArgument,
  GraphQLEnumType,
  GraphQLField,
  GraphQLFieldMap,
  GraphQLInputField,
  GraphQLInputType,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLScalarType,
  GraphQLSchema,
  InlineFragmentNode,
  FragmentDefinitionNode,
  ListValueNode,
  NameNode,
  OperationDefinitionNode,
  ObjectFieldNode,
  ObjectValueNode,
  SelectionNode,
  SelectionSetNode,
  ValueNode,
} from 'graphql';

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
};

type StyleConfig = {
  colors : Colors;
  arrowOpen : React.ReactNode;
  arrowClosed : React.ReactNode;
  checkboxChecked : React.ReactNode;
  checkboxUnchecked : React.ReactNode;
  styles : Styles;
};

type Props = {
  query : string;
  width ?: number;
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
  styles ?: {
    explorerActionsStyle ?: React.CSSProperties;
    buttonStyle ?: React.CSSProperties;
  },
};

type OperationType = 'query' | 'mutation' | 'subscription' | 'fragment';
type NewOperationType = 'query' | 'mutation' | 'subscription';

type State = {
  operation ?: OperationDefinitionNode;
  newOperationType : NewOperationType;
};

type Selections = readonly SelectionNode[];

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
      fill="#CCC"
    />
  </svg>
);

function Checkbox(props : { checked : boolean; styleConfig : StyleConfig }) {
  return (
    <Fragment>
      {props.checked ? props.styleConfig.checkboxChecked : props.styleConfig.checkboxUnchecked}
    </Fragment>
  );
}

function defaultGetDefaultFieldNames(type : GraphQLObjectType) : Array<string> {
  const fields = type.getFields();

  // Is there an `id` field?
  if (fields['id']) {
    const res = ['id'];
    if (fields['email']) {
      res.push('email');
    } else if (fields['name']) {
      res.push('name');
    }
    return res;
  }

  // Is there an `edges` field?
  if (fields['edges']) {
    return ['edges'];
  }

  // Is there an `node` field?
  if (fields['node']) {
    return ['node'];
  }

  if (fields['nodes']) {
    return ['nodes'];
  }

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
  return isNonNullType(arg.type) && arg.defaultValue === undefined;
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

function coerceArgValue(argType : GraphQLScalarType | GraphQLEnumType, value : string) : ValueNode {
  if (isScalarType(argType)) {
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
        case 'Int':
          return {
            kind: 'IntValue',
            value: String(argType.parseValue(parseInt(value, 10))),
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
        return { kind: 'EnumValue', value: argType.getValues()[0].name };
      }
    } catch (e) {
      return { kind: 'EnumValue', value: argType.getValues()[0].name };
    }
  }
}

const prettify = (query : string) : string =>
  prettier.format(query, {
    parser: 'graphql',
    plugins: [parserGraphql],
  });

type InputArgViewProps = {
  arg : GraphQLArgument;
  argName ?: string;
  selection : ObjectValueNode;
  parentField : Field;
  directParentArg : GraphQLArgument;
  modifyFields : (fields : readonly ObjectFieldNode[]) => void;
  getDefaultScalarArgValue : GetDefaultScalarArgValue;
  getScalarArgInput : GetScalarArgInput;
  makeDefaultArg ?: MakeDefaultArg;
  onRunOperation : (e : React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => void;
  styleConfig : StyleConfig;
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
    this.props.modifyFields(selection.fields.filter(field => field !== argSelection));
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

  _setArgValue = (event : React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { selection } = this.props;
    const argSelection = this._getArgSelection();
    if (!argSelection) {
      console.error('missing arg selection when setting arg value');
      return;
    }
    const argType = unwrapInputType(this.props.arg.type);
    if (!isLeafType(argType)) {
      console.warn('Unable to handle non leaf types in setArgValue');
      return;
    }
    const targetValue = event.target.value;
    this.props.modifyFields(
      (selection.fields || []).map(field =>
        field === argSelection
          ? {
              ...field,
              value: coerceArgValue(argType, targetValue),
            }
          : field
      )
    );
  };

  _modifyChildFields = (fields : ObjectFieldNode[] | ListValueNode) => {
    const { modifyFields, selection } = this.props;
    if ((fields as ListValueNode).kind === 'ListValue') {
      modifyFields(
        selection.fields.map(field =>
          field.name.value === this.props.arg.name
            ? {
                ...field,
                value: fields as ListValueNode,
              }
            : field
        )
      );
    } else {
      modifyFields(
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
        )
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
  modifyArguments : (argumentNodes : readonly ArgumentNode[]) => void;
  getDefaultScalarArgValue : GetDefaultScalarArgValue;
  getScalarArgInput : GetScalarArgInput;
  makeDefaultArg ?: MakeDefaultArg;
  onRunOperation : () => void;
  styleConfig : StyleConfig;
};

type ArgViewState = Record<string, unknown>;

export function defaultValue(argType : GraphQLEnumType | GraphQLScalarType) : ValueNode {
  if (isEnumType(argType)) {
    return { kind: 'EnumValue', value: argType.getValues()[0].name };
  } else {
    switch (argType.name) {
      case 'String':
        return { kind: 'StringValue', value: '' };
      case 'Float':
        return { kind: 'FloatValue', value: '1.5' };
      case 'Int':
        return { kind: 'IntValue', value: '10' };
      case 'Boolean':
        return { kind: 'BooleanValue', value: false };
      default:
        return { kind: 'StringValue', value: '' };
    }
  }
}

function defaultGetDefaultScalarArgValue(
  parentField : Field,
  arg : GraphQLArgument | GraphQLInputField,
  argType : GraphQLEnumType | GraphQLScalarType,
  // directParentArg?: GraphQLArgument | GraphQLInputField
) : ValueNode {
  return defaultValue(argType);
}

class ArgView extends React.PureComponent<ArgViewProps, ArgViewState> {
  _previousArgSelection ?: ArgumentNode;

  _getArgSelection = () => {
    const { selection } = this.props;
    return (selection.arguments || []).find(arg => arg.name.value === this.props.arg.name);
  };

  _removeArg = () => {
    const { selection } = this.props;
    const argSelection = this._getArgSelection();
    this._previousArgSelection = argSelection;
    this.props.modifyArguments((selection.arguments || []).filter(arg => arg !== argSelection));
  };

  _addArg = () => {
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
      } else {
        this.props.modifyArguments([...(selection.arguments || []), argSelection]);
      }
    }
  };

  _setArgValue = (event : React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { selection } = this.props;
    const argSelection = this._getArgSelection();
    if (!argSelection) {
      console.error('missing arg selection when setting arg value');
      return;
    }
    const argType = unwrapInputType(this.props.arg.type);
    if (!isLeafType(argType)) {
      console.warn('Unable to handle non leaf types in setArgValue');
      return;
    }

    const targetValue = event.target.value;
    this.props.modifyArguments(
      (selection.arguments || []).map(a =>
        a === argSelection
          ? {
              ...a,
              value: coerceArgValue(argType, targetValue),
            }
          : a
      )
    );
  };

  /**
   * When fields is ObjectFieldNode[], we are modifying fields of an InputObject. But if it
   * is a ListValueNode, then the argument is a list, in which case we return the entire list.
   */
  _setArgFields = (fields : ObjectFieldNode[] | ListValueNode) => {
    const { selection } = this.props;
    const argSelection = this._getArgSelection();
    if (!argSelection) {
      console.error('missing arg selection when setting arg value');
      return;
    }

    if ((fields as ListValueNode).kind === 'ListValue') {
      this.props.modifyArguments(
        (selection.arguments || []).map(a =>
          a === argSelection
            ? {
                ...a,
                value: fields as ListValueNode,
              }
            : a
        )
      );
    } else {
      this.props.modifyArguments(
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
        )
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
      />
    );
  }
}

function isRunShortcut(event : React.KeyboardEvent<HTMLInputElement>) {
  return event.metaKey && event.key === 'Enter';
}

type AbstractArgViewProps = {
  argValue ?: ValueNode;
  arg : GraphQLArgument;
  parentField : Field;
  directParentArg ?: GraphQLArgument;
  setArgValue : (event : React.SyntheticEvent) => void;
  setArgFields : (fields : readonly ObjectFieldNode[] | ListValueNode) => void;
  addArg : () => void;
  removeArg : () => void;
  getDefaultScalarArgValue : GetDefaultScalarArgValue;
  getScalarArgInput : GetScalarArgInput;
  makeDefaultArg ?: MakeDefaultArg;
  onRunOperation : (e : React.KeyboardEvent<HTMLInputElement>) => void;
  styleConfig : StyleConfig;
};

type ScalarInputProps = {
  arg : GraphQLArgument;
  argValue : ValueNode;
  setArgValue : (event : React.SyntheticEvent) => void;
  onRunOperation : (e : React.KeyboardEvent<HTMLInputElement>) => void;
  styleConfig : StyleConfig;
};

class ScalarInput extends React.PureComponent<ScalarInputProps, any> {
  _ref ?: any;
  _handleChange = (event : React.SyntheticEvent) => {
    this.props.setArgValue(event);
  };

  componentDidMount() {
    const input = this._ref;
    const activeElement = document.activeElement;
    if (input && activeElement && !(activeElement instanceof HTMLTextAreaElement)) {
      input.focus();
      input.setSelectionRange(0, input.value.length);
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
            width: `${Math.max(1, value.length)}ch`,
            color,
          }}
          ref={ref => {
            this._ref = ref;
          }}
          type="text"
          onKeyDown={event => {
            if (isRunShortcut(event)) {
              this.props.onRunOperation(event);
            }
          }}
          onChange={this._handleChange}
          value={value}
        />
        {argType.name === 'String' ? '"' : ''}
      </span>
    );
  }
}

class AbstractArgView extends React.PureComponent<AbstractArgViewProps, any> {
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
        input = <span style={{ color: styleConfig.colors.variable }}>${argValue.name.value}</span>;
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
              {argType.getValues().map(value => (
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
                  />
                ))}
            </div>
          );
        } else {
          console.error('arg mismatch between arg and selection', argType, argValue);
        }
      }
    }

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
      >
        <span>
          <span
            style={{ cursor: 'pointer' }}
            onClick={argValue ? this.props.removeArg : this.props.addArg}
          >
            {isInputObjectType(argType) &&
              (argValue ? this.props.styleConfig.arrowOpen : this.props.styleConfig.arrowClosed)}
            <Checkbox checked={!!argValue} styleConfig={this.props.styleConfig} />
            <Tooltip transitionName={null} arrowPointAtCenter placement="rightTop" title={arg.description || ''}>
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
              <Tooltip transitionName={null} title="Add array item">
                <span onClick={this.props.addArg} style={{ cursor: 'pointer' }}>
                  ＋
                </span>
              </Tooltip>
            </Fragment>
          )}
        </span>{' '}
        {input || <span />}
      </div>
    );
  }
}

type AbstractViewProps = {
  implementingType : GraphQLObjectType;
  selections : Selections;
  modifySelections : (selections : Selections) => void;
  schema : GraphQLSchema;
  getDefaultFieldNames : (type : GraphQLObjectType) => Array<string>;
  getDefaultScalarArgValue : GetDefaultScalarArgValue;
  getScalarArgInput : GetScalarArgInput;
  makeDefaultArg ?: MakeDefaultArg;
  onRunOperation : () => void;
  styleConfig : StyleConfig;
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

  _modifyChildSelections = (selections : Selections) => {
    const thisSelection = this._getSelection();
    this.props.modifySelections(
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
      })
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
      <div>
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
                  styleConfig={this.props.styleConfig}
                />
              ))}
          </div>
        ) : null}
      </div>
    );
  }
}

type FieldViewProps = {
  field : Field;
  selections : Selections;
  modifySelections : (selections : Selections) => void;
  schema : GraphQLSchema;
  getDefaultFieldNames : (type : GraphQLObjectType) => Array<string>;
  getDefaultScalarArgValue : GetDefaultScalarArgValue;
  getScalarArgInput : GetScalarArgInput;
  makeDefaultArg ?: MakeDefaultArg;
  onRunOperation : () => void;
  styleConfig : StyleConfig;
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

class FieldView extends React.PureComponent<FieldViewProps, any> {
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

  _setArguments = (argumentNodes : readonly ArgumentNode[]) => {
    const selection = this._getSelection();
    if (!selection) {
      console.error('Missing selection when setting arguments', argumentNodes);
      return;
    }
    this.props.modifySelections(
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
      )
    );
  };

  _modifyChildSelections = (selections : Selections) => {
    this.props.modifySelections(
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
      })
    );
  };

  render() {
    const { field, schema, getDefaultFieldNames, getScalarArgInput, styleConfig } = this.props;
    const selection = this._getSelection();
    const type = unwrapOutputType(field.type);
    const args = field.args.sort((a, b) => a.name.localeCompare(b.name));
    let className = 'graphiql-explorer-node';

    if (field.isDeprecated) {
      className += 'graphiql-explorer-deprecated';
    }

    const node = (
      <div className={className}>
        <Tooltip transitionName={null} arrowPointAtCenter placement="rightTop" title={field.description || ''}>
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
            {isObjectType(type) ? (
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
        {selection && args.length ? (
          <div style={{ marginLeft: 16 }}>
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
        <div>
          {node}
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
                  styleConfig={this.props.styleConfig}
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

const DEFAULT_OPERATION = {
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
const DEFAULT_DOCUMENT : DocumentNode = {
  kind: 'Document',
  definitions: [DEFAULT_OPERATION],
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

  explorerActionsStyle: {
    margin: '4px -8px -8px',
    paddingLeft: '8px',
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
  operation : OperationType;
  name ?: string;
  onTypeName ?: string;
  definition : FragmentDefinitionNode | OperationDefinitionNode;
  onEdit : (operationDef ?: OperationDefinitionNode | FragmentDefinitionNode) => void;
  onOperationRename : (query : string) => void;
  onRunOperation : (name ?: string) => void;
  getDefaultFieldNames : (type : GraphQLObjectType) => Array<string>;
  getDefaultScalarArgValue : GetDefaultScalarArgValue;
  getScalarArgInput : GetScalarArgInput;
  makeDefaultArg ?: MakeDefaultArg;
  styleConfig : StyleConfig;
};

class RootView extends React.PureComponent<RootViewProps, any> {
  state = {newOperationType: 'query'};
  _previousOperationDef ?: OperationDefinitionNode | FragmentDefinitionNode;

  _modifySelections = (selections : Selections) => {
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

    this.props.onEdit(newOperationDef);
  };

  _onOperationRename = (event : React.ChangeEvent<HTMLInputElement>) =>
    this.props.onOperationRename(event.target.value);

  _handlePotentialRun = (event : React.KeyboardEvent<HTMLInputElement>) => {
    if (isRunShortcut(event)) {
      this.props.onRunOperation(this.props.name);
    }
  };

  render() {
    const {
      operation,
      name,
      definition,
      schema,
      getDefaultFieldNames,
      getScalarArgInput,
      styleConfig,
    } = this.props;
    const fields = this.props.fields || {};
    const operationDef = definition;
    const selections = operationDef.selectionSet.selections;

    // const operationDisplayName = this.props.name || `${capitalize(operation)} Name`;

    return (
      <div
        id={`${operation}-${name || 'unknown'}`}
        style={{
          borderBottom: this.props.isLast ? 'none' : '1px solid #d6d6d6',
          marginLeft: 16,
          marginBottom: '0em',
          paddingBottom: '1em',
        }}
      >
        <div style={{ color: styleConfig.colors.keyword, marginLeft: -16, paddingBottom: 4 }}>
          {operation}{' '}
          <span style={{ color: styleConfig.colors.def }}>
            <input
              style={{
                color: styleConfig.colors.def,
                border: 'none',
                borderBottom: '1px solid #888',
                outline: 'none'//,
                //width: `${Math.max(4, operationDisplayName.length)}ch`,
              }}
              autoComplete="false"
              placeholder={`${capitalize(operation)} Name`}
              value={this.props.name || undefined}
              onKeyDown={this._handlePotentialRun}
              onChange={this._onOperationRename}
            />
          </span>
          {this.props.onTypeName ? (
            <span>
              <br />
              {`on ${this.props.onTypeName}`}
            </span>
          ) : (
            ''
          )}
        </div>

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
    getScalarArgInput: () => true,
  };

  state = {newOperationType: 'query', operation: null};

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
      return <div>Missing query type</div>;
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
      const newName : NameNode = { kind: 'Name', value: name || '', loc: undefined };
      const newOperation = { ...targetOperation, name: newName };

      const existingDefs = parsedQuery.definitions;

      const newDefinitions = existingDefs.map(existingOperation => {
        if (targetOperation === existingOperation) {
          return newOperation;
        } else {
          return existingOperation;
        }
      });

      return {
        ...parsedQuery,
        definitions: newDefinitions,
      };
    };

    const addOperation = (kind : NewOperationType) => {
      const existingDefs = parsedQuery.definitions;

      const viewingDefaultOperation =
        parsedQuery.definitions.length === 1 &&
        parsedQuery.definitions[0] === DEFAULT_DOCUMENT.definitions[0];

      const MySiblingDefs = viewingDefaultOperation
        ? []
        : existingDefs.filter(def => {
            if (def.kind === 'OperationDefinition') {
              return def.operation === kind;
            } else {
              // Don't support adding fragments from explorer
              return false;
            }
          });

      const newOperationName = `My${capitalize(kind)}${
        MySiblingDefs.length === 0 ? '' : MySiblingDefs.length + 1
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

      this.props.onEdit(prettify(print(newOperationDef)));
    };

    const actionsOptions = [
      !!queryFields ? (
        <option
          className={'toolbar-button'}
          style={styleConfig.styles.buttonStyle}
          type='link'
          value={'query'}>
          New Query
        </option>
      ) : null,
      !!mutationFields ? (
        <option
          className={'toolbar-button'}
          style={styleConfig.styles.buttonStyle}
          type="link"
          value={'mutation'}>
          New Mutation
        </option>
      ) : null,
      !!subscriptionFields ? (
        <option
          className={'toolbar-button'}
          style={styleConfig.styles.buttonStyle}
          type="link"
          value={'subscription'}>
          New Subscription
        </option>
      ) : null,
    ].filter(Boolean);

    const actionsEl =
      actionsOptions.length === 0 ? null : (
        <div
          style={{
            minHeight: '50px',
            maxHeight: '50px',
            overflow: 'none',
          }}>
          <form
            className="variable-editor-title graphiql-explorer-actions"
            style={{
              ...styleConfig.styles.explorerActionsStyle,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              borderTop: '1px solid rgb(214, 214, 214)',
            }}
            onSubmit={event => event.preventDefault()}>
            <select
              onChange={event => this._setAddOperationType(event.target.value)}
              value={this.state.newOperationType}
              style={{flexGrow: '2'}}>
              {actionsOptions}
            </select>
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
              <span>+</span>
            </button>
          </form>
        </div>
      );

    return (
      <div
        ref={ref => {
          this._ref = ref;
        }}
        style={{
          fontSize: 12,
          //overflow: 'scroll',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          margin: 0,
          padding: 8,
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
            overflow: 'scroll',
          }}>
          {relevantOperations.map(
            (
              operation : OperationDefinitionNode | FragmentDefinitionNode,
              index,
            ) => {
              const operationName =
                operation && operation.name && operation.name.value;

              const operationKind =
                operation.kind === 'FragmentDefinition'
                  ? 'fragment'
                  : (operation && operation.operation) || 'query';

              const onOperationRename = newName => {
                const newOperationDef = renameOperation(operation, newName);
                this.props.onEdit(print(newOperationDef));
              };

              const fragmentType =
                operation.kind === 'FragmentDefinition' &&
                operation.typeCondition.kind === 'NamedType' &&
                schema.getType(operation.typeCondition.name.value);

              const fragmentFields =
                fragmentType instanceof GraphQLObjectType
                  ? fragmentType.getFields()
                  : null;

              const fields =
                operationKind === 'query'
                  ? queryFields
                  : operationKind === 'mutation'
                  ? mutationFields
                  : operationKind === 'subscription'
                  ? subscriptionFields
                  : operation.kind === 'FragmentDefinition'
                  ? fragmentFields
                  : null;

              const fragmentTypeName =
                operation.kind === 'FragmentDefinition'
                  ? operation.typeCondition.name.value
                  : null;

              return (
                <RootView
                  key={index}
                  isLast={index === relevantOperations.length - 1}
                  fields={fields}
                  operation={operationKind}
                  name={operationName}
                  definition={operation}
                  onOperationRename={onOperationRename}
                  onTypeName={fragmentTypeName}
                  onEdit={newDefinition => {
                    const newQuery = {
                      ...parsedQuery,
                      definitions: parsedQuery.definitions.map(
                        existingDefinition =>
                          existingDefinition === operation
                            ? newDefinition
                            : existingDefinition,
                      ),
                    };

                    const textualNewQuery = print(newQuery);

                    this.props.onEdit(textualNewQuery);
                  }}
                  schema={schema}
                  getDefaultFieldNames={getDefaultFieldNames}
                  getDefaultScalarArgValue={getDefaultScalarArgValue}
                  makeDefaultArg={makeDefaultArg}
                  onRunOperation={() => {
                    if (!!this.props.onRunOperation) {
                      this.props.onRunOperation(operationName);
                    }
                  }}
                  styleConfig={styleConfig}
                />
              );
            },
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

class GraphiQLExplorer extends React.PureComponent<Props, any> {
  static defaultValue = defaultValue;
  static defaultProps = {
    width: 320,
    title: 'Explorer',
  };
  render() {
    return (
      <div
        className="docExplorerWrap"
        style={{
          height: '100%',
          width: this.props.width,
          minWidth: this.props.width,
          zIndex: 7,
          display: this.props.explorerIsOpen ? 'flex' : 'none',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div className="doc-explorer-title-bar">
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
          }}>
          <ErrorBoundary>
            <Explorer {...this.props} />
          </ErrorBoundary>
        </div>
      </div>
    );
  }
}

export default GraphiQLExplorer;