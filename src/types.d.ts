declare module "graphiql" {
  import * as React from "react";
  export default class GraphiQL extends React.Component<{
    fetcher: (graphQLParams: any) => Promise<any>;
    defaultQuery: string;
  }> { }
}