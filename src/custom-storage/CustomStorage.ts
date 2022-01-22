type SchemaData = { [key in string] : string };

const prefix = 'graphqlide'

const root_values = [
  'docExplorerOpen',
  'docExplorerWidth',
  'editorFlex',
  'historyPaneOpen',
  'explorerIsOpen',
  'explorerWidth',
  'secondaryEditorHeight',
  'variableEditorActive',
  'headerEditorActive',
];

export class CustomStorage implements Storage {
  private storage : Storage = localStorage;
  static schema = 'unknown';

  private is_root(value : string) {
    return (root_values.indexOf(value) > -1)
  }

  get length() : number {
    throw new Error('Method not implemented.');
  }

  clear() : void {
    this.storage.removeItem(this.schema);
  }

  getItem(key : string) : string | null {
    try {
      key = key.substring(9)
    } catch {
      return
    }
    const res = this.read(this.is_root(key))?.[key] ?? null;
    return res;
  }

  key() : never {
    throw new Error('Method not implemented.');
  }

  removeItem(key : string) : void {
    try {
      key = key.substring(9)
    } catch {
      return
    }
    const data = this.read(this.is_root(key));
    if (!data) {
      return;
    }

    if (key in data) {
      delete data[key];
      this.write(data, this.is_root(key));
    }
  }

  setItem(key : string, value : string) : void {
    try {
      key = key.substring(9)
    } catch {
      return
    }
    const data = this.read(this.is_root(key)) ?? {};
    data[key] = value;
    this.write(data, this.is_root(key));
  }

  private read(isRoot : boolean) : SchemaData | undefined {
    const schemaValue = isRoot
      ? this.storage.getItem(prefix)
      : this.storage.getItem(prefix + ':' + this.schema);
    if (!schemaValue) {
      return undefined;
    }

    try {
      return JSON.parse(schemaValue);
    } catch {
      return undefined;
    }
  }

  private write(data : SchemaData, isRoot : boolean) {
    const key = isRoot
      ? prefix
      : prefix + ':' + this.schema;
    this.storage.setItem(key, JSON.stringify(data));
  }
}
