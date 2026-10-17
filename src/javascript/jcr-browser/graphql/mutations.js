import {gql} from '@apollo/client';
import {SESSION_ARGS, SESSION_VARS} from './queries';

const MUTATE = (body, variables = '') => gql`
    mutation SuperToolsJcrMutation($uuid: String!, $acknowledgeSensitive: Boolean, ${SESSION_VARS}${variables}) {
        admin { superTools { jcr(${SESSION_ARGS}) { mutateNode(uuid: $uuid, acknowledgeSensitive: $acknowledgeSensitive) { ${body} } } } }
    }
`;

export const SET_PROPERTY = MUTATE('setProperty(name: $name, value: $value, values: $values, type: $type) { name type multiple value values }',
    ', $name: String!, $value: String, $values: [String], $type: String');
export const REMOVE_PROPERTY = MUTATE('removeProperty(name: $name)', ', $name: String!');
export const ADD_MIXIN = MUTATE('addMixin(mixin: $mixin) { uuid mixins }', ', $mixin: String!');
export const REMOVE_MIXIN = MUTATE('removeMixin(mixin: $mixin) { uuid mixins }', ', $mixin: String!');
export const ADD_NODE = MUTATE('addNode(name: $name, primaryType: $primaryType, mixins: $mixins) { uuid path }',
    ', $name: String!, $primaryType: String, $mixins: [String]');
export const RENAME_NODE = MUTATE('rename(name: $name)', ', $name: String!');
export const MOVE_NODE = MUTATE('move(destinationPath: $destinationPath)', ', $destinationPath: String!');
export const REMOVE_NODE = MUTATE('remove');
export const LOCK_NODE = MUTATE('lock(deep: $deep, sessionScoped: false) { owner deep }', ', $deep: Boolean');
export const UNLOCK_NODE = MUTATE('unlock');
export const CHECKIN_NODE = MUTATE('checkin');
export const CHECKOUT_NODE = MUTATE('checkout');
export const RESTORE_VERSION = MUTATE('restoreVersion(versionName: $versionName, removeExisting: $removeExisting)',
    ', $versionName: String!, $removeExisting: Boolean');
