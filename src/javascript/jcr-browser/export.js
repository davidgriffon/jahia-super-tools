import {escapeXml} from '../shared/export';
import {propertyValues} from './utils';

/** What the JCR Explorer exports for the node on screen: the node, its session and its properties as shown. */
function nodeDocument(node, sessionVars) {
    return {
        session: {
            workspace: sessionVars.workspace,
            mode: sessionVars.mode || 'RAW',
            language: sessionVars.language || null,
            user: sessionVars.user || null
        },
        node: {
            uuid: node.uuid,
            name: node.name,
            path: node.path,
            depth: node.depth,
            index: node.index,
            primaryType: node.primaryType,
            mixins: node.mixins || [],
            supertypes: node.supertypes || [],
            childrenCount: node.childrenCount,
            referencesCount: node.referencesCount,
            locked: node.locked,
            versionable: node.versionable,
            checkedOut: node.checkedOut,
            baseVersion: node.baseVersion,
            lock: node.lock || null,
            definition: node.definition || null,
            jahia: node.jahia || null
        },
        properties: (node.properties || []).map(property => ({
            name: property.name,
            type: property.type,
            multiple: property.multiple,
            values: propertyValues(property),
            protected: property.protected,
            internationalized: property.internationalized,
            locale: property.locale || null,
            declaringNodeType: property.definition?.declaringNodeType || null,
            definition: property.definition?.name || null,
            references: (property.referencedNodes || []).map(reference => reference.path)
        }))
    };
}

const SV = 'http://www.jcp.org/jcr/sv/1.0';

/** JCR 2.0 system view of the node and its properties (child nodes are not included). */
function systemView(node) {
    const lines = ['<?xml version="1.0" encoding="UTF-8"?>', `<sv:node xmlns:sv="${SV}" sv:name="${escapeXml(node.name || '')}">`];
    (node.properties || []).forEach(property => {
        const multiple = property.multiple ? ' sv:multiple="true"' : '';
        const type = property.type.charAt(0) + property.type.slice(1).toLowerCase().replace(/reference$/, 'Reference').replace(/^weakReference$/, 'WeakReference');
        lines.push(`  <sv:property sv:name="${escapeXml(property.name)}" sv:type="${escapeXml(type)}"${multiple}>`);
        propertyValues(property).forEach(value => lines.push(`    <sv:value>${escapeXml(value)}</sv:value>`));
        lines.push('  </sv:property>');
    });
    lines.push('</sv:node>');
    return lines.join('\n') + '\n';
}

const PROPERTY_COLUMNS = [
    {key: 'name', label: 'Name'},
    {key: 'type', label: 'Type'},
    {key: 'multiple', label: 'Multiple'},
    {key: 'values', label: 'Value'},
    {key: 'protected', label: 'Protected'},
    {key: 'locale', label: 'Locale'},
    {key: 'declaringNodeType', label: 'Declaring type'},
    {key: 'references', label: 'Referenced paths'}
];

export function nodeExportSpec(node, sessionVars) {
    return {
        tool: 'jcr-explorer',
        suffix: `${sessionVars.workspace}${node.path === '/' ? '-root' : node.path}`,
        json: () => nodeDocument(node, sessionVars),
        csv: () => ({columns: PROPERTY_COLUMNS, rows: nodeDocument(node, sessionVars).properties}),
        xml: () => systemView(node)
    };
}
