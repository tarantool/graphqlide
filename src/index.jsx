// @flow
import React from 'react'
import { css, cx } from 'emotion'
import GraphiQLBuilder from './GraphiQLBuilder'

import 'graphiql/graphiql.css'
import './index.css'
import { IconChip } from '@tarantool.io/ui-kit'

const core = window.tarantool_enterprise_core;

const PROJECT_NAME = 'graphqlide'
const GQLIDE_MENU_LABEL = 'Admin API'
const GQLIDE_PATH = '/graphqlide'
const GQLIDE_CLASS_NAME = 'graphqlide'

const styles = {
    area: css`
        display: flex;
        flex-direction: column;
        height: calc(100% - 69px - 0px);
        padding: 0px;
        margin-left: 0px;
        margin-rigth: 0px;
        margin-top: 4px;
        margin-bottom: 0px;
        border-radius: 4px;
        box-sizing: border-box;
        background-color: #ffffff;
  `,
    areaWithPane: css`
        height: calc(100% - 69px - 112px - 16px);
  `
}

class Root extends React.Component {
    render() {
        return (
            <div
                className={cx(
                    styles.area,
                    { [styles.areaWithPane]: false },
                    GQLIDE_CLASS_NAME
                )}
            >
                <GraphiQLBuilder />
            </div>
        )
    }
}

const menuItems = [
    {
        label: GQLIDE_MENU_LABEL,
        path: GQLIDE_PATH,
        selected: false,
        expanded: false,
        loading: false,
        icon: <IconChip className={css`width: 14px; height: 14px; fill: #fff;`} />
    }
]

const menuInitialState = menuItems

const matchPath = (path, link) => {
    if (path.length === 0)
        return false;
    const point = path.indexOf(link);
    return point === 0 && (link.length === path.length || path[link.length] === '/')
}

const updateLink = path => menuItem => ({ ...menuItem, selected: matchPath(path, menuItem.path) })

export const menuReducer = (state: MenuItemType[] = menuInitialState, { type, payload }: FSA): MenuItemType[] => {
    switch (type) {
        case '@@router/LOCATION_CHANGE':
            if (payload && payload.location && payload.location.pathname) {
                return state.map(updateLink(payload.location.pathname))
            } else {
                return state;
            }

        case 'RESET':
            if (payload) {
                return menuInitialState.map(updateLink(payload.path))
            } else {
                return state;
            }

        default:
            return state;
    }
};


core.register(
    PROJECT_NAME,
    menuReducer,
    Root,
    'react'
);
