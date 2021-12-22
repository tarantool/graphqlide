type SchemaData = { [key in string] : string };

export class CustomStorage implements Storage {
  private storage : Storage = localStorage;
  static schema = 'graphqlide:unknown';

  get length() : number {
    throw new Error('Method not implemented.');
  }

  clear() : void {
    this.storage.removeItem(this.schema);
  }

  getItem(key : string) : string | null {
    return this.read()?.[key] ?? null;
  }

  key() : never {
    throw new Error('Method not implemented.');
  }

  removeItem(key : string) : void {
    const data = this.read();
    if (!data) {
      return;
    }

    if (key in data) {
      delete data[key];
      this.write(data);
    }
  }

  setItem(key : string, value : string) : void {
    const data = this.read() ?? {};
    data[key] = value;
    this.write(data);
  }

  private read() : SchemaData | undefined {
    const schemaValue = this.storage.getItem(this.schema);
    if (!schemaValue) {
      return undefined;
    }

    try {
      return JSON.parse(schemaValue);
    } catch {
      return undefined;
    }
  }

  private write(data : SchemaData) {
    this.storage.setItem(this.schema, JSON.stringify(data));
  }
}
