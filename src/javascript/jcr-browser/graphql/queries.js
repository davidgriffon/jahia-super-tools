import {gql} from '@apollo/client';

/*
 * Every document targets the module's own raw JCR API: admin.superTools.jcr(workspace), which mirrors javax.jcr on
 * the session of the default provider. Nothing here goes through Jahia's content-oriented `jcr` root.
 */

/** Session arguments shared by every document: `${SESSION_VARS}` in the operation, `${SESSION_ARGS}` on jcr(). */
export const SESSION_VARS = '$workspace: String!, $mode: String, $language: String, $user: String';
export const SESSION_ARGS = 'workspace: $workspace, mode: $mode, language: $language, user: $user';

const NODE_FIELDS = `
        uuid
        name
        path
        depth
        index
        primaryType
        mixins
        supertypes
        hasOrderableChildNodes
        childrenCount
        hasChildren
        locked
        versionable
        checkedOut
        baseVersion
        referencesCount
        parent { uuid name path }
        ancestors { uuid name path primaryType }
        definition { name declaringNodeType protected mandatory autoCreated allowsSameNameSiblings requiredPrimaryTypes }
        lock { owner deep sessionScoped lockOwningSession nodePath live }
        jahia {
            displayableName
            language
            existingLocales
            visible
            valid
            hasVisibilityConditions
            markedForDeletion
            lastPublished
            siteKey
            lockInfos
            lockedLocales
            nodeTypes
        }
        properties {
            name
            path
            type
            multiple
            value
            values
            lengths
            protected
            locale
            internationalized
            definition { name declaringNodeType mandatory autoCreated requiredType multiple }
            referencedNodes { uuid path primaryType }
        }
`;

export const NODE_BY_ID = gql`
    query SuperToolsJcrNodeById($uuid: String!, ${SESSION_VARS}) {
        admin { superTools { jcr(${SESSION_ARGS}) { workspace node(uuid: $uuid) { ${NODE_FIELDS} } } } }
    }
`;

export const NODE_BY_PATH = gql`
    query SuperToolsJcrNodeByPath($path: String!, ${SESSION_VARS}) {
        admin { superTools { jcr(${SESSION_ARGS}) { workspace node(path: $path) { ${NODE_FIELDS} } } } }
    }
`;

/** One level of the tree, paginated. */
export const NODE_CHILDREN = gql`
    query SuperToolsJcrNodeChildren($uuid: String!, $offset: Int!, $limit: Int!, ${SESSION_VARS}) {
        admin { superTools { jcr(${SESSION_ARGS}) {
            node(uuid: $uuid) {
                uuid
                children(offset: $offset, limit: $limit) {
                    totalCount
                    hasMore
                    nodes { uuid name path index primaryType locked hasChildren }
                }
            }
        } } }
    }
`;

export const NODE_REFERENCES = gql`
    query SuperToolsJcrNodeReferences($uuid: String!, ${SESSION_VARS}) {
        admin { superTools { jcr(${SESSION_ARGS}) {
            node(uuid: $uuid) {
                uuid
                referencesCount
                references(limit: 200) { propertyName propertyPath weak node { uuid path primaryType } }
            }
        } } }
    }
`;

export const NODE_VERSIONS = gql`
    query SuperToolsJcrNodeVersions($uuid: String!, ${SESSION_VARS}) {
        admin { superTools { jcr(${SESSION_ARGS}) {
            node(uuid: $uuid) {
                uuid
                checkedOut
                baseVersion
                versions { name uuid created labels predecessors successors frozenPrimaryType rootVersion }
            }
        } } }
    }
`;

export const NODE_TYPES = gql`
    query SuperToolsJcrNodeTypes($mixinsOnly: Boolean, $nameContains: String, ${SESSION_VARS}) {
        admin { superTools { jcr(${SESSION_ARGS}) {
            nodeTypes(mixinsOnly: $mixinsOnly, nameContains: $nameContains) { name mixin abstract }
        } } }
    }
`;

export const NODE_TYPE = gql`
    query SuperToolsJcrNodeType($name: String!, ${SESSION_VARS}) {
        admin { superTools { jcr(${SESSION_ARGS}) {
            nodeType(name: $name) {
                name mixin abstract queryable hasOrderableChildNodes primaryItemName supertypes
                propertyDefinitions { name requiredType multiple protected mandatory autoCreated declaringNodeType valueConstraints defaultValues }
                childNodeDefinitions { name requiredPrimaryTypes defaultPrimaryType protected mandatory autoCreated allowsSameNameSiblings declaringNodeType }
            }
        } } }
    }
`;

export const SESSION_INFO = gql`
    query SuperToolsJcrSession(${SESSION_VARS}) {
        admin { superTools { jcr(${SESSION_ARGS}) {
            session { workspace mode language userId impersonated system live }
            languages
        } } }
    }
`;

export const NODE_PERMISSION = gql`
    query SuperToolsJcrNodePermission($uuid: String!, $permission: String!, ${SESSION_VARS}) {
        admin { superTools { jcr(${SESSION_ARGS}) { node(uuid: $uuid) { uuid jahia { hasPermission(name: $permission) } } } } }
    }
`;
