// @ts-check
import * as React from 'react';
import { css, cx } from 'emotion';
import { Icon, type GenericIconProps } from '@tarantool.io/ui-kit';
import GraphQLIDE from './GraphQLIDE';
import image from './graphql.svg';

import 'graphiql/graphiql.css';
import './index.css';

const PROJECT_NAME = 'graphqlide';

const styles = {
  area: css`
    display: flex;
    flex-direction: column;
    height: calc(100% - 69px - 4px);
    padding: 0px;
    margin-left: 0px;
    margin-rigth: 0px;
    margin-top: 4px;
    margin-bottom: 0px;
    border-radius: 0px;
    box-sizing: border-box;
    background-color: #ffffff;
  `,
  areaWithPane: css`
    height: calc(100% - 69px - 112px - 16px);
  `,
  icon: css`
    width: 16px;
    height: 16px;
    fill: #fff;
  `
};

const IconGraphQL = ({ className }: GenericIconProps) => <Icon className={cx(styles.icon, className)} glyph={image} />;

class Root extends React.PureComponent {
  render() {
    return (
      <div className={cx(styles.area, { [styles.areaWithPane]: false }, PROJECT_NAME)}>
        <GraphQLIDE />
      </div>
    );
  }
}

window.tarantool_enterprise_core.register(
  PROJECT_NAME,
  [{
    label: 'GraphQL IDE',
    path: `/${PROJECT_NAME}`,
    icon: IconGraphQL
  }],
  Root,
  'react'
);

if (window.tarantool_enterprise_core.install) {
  window.tarantool_enterprise_core.install();
}
