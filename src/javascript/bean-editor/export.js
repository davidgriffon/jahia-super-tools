import {escapeXml} from '../shared/export';

const COLUMNS = [
    {key: 'name', label: 'Property'},
    {key: 'type', label: 'Type'},
    {key: 'value', label: 'Value'},
    {key: 'status', label: 'Status'},
    {key: 'configuredValue', label: 'Configured value'},
    {key: 'persistedValue', label: 'Persisted value'},
    {key: 'writable', label: 'Writable'},
    {key: 'sensitive', label: 'Sensitive (masked)'}
];

function beanDocument(context, bean) {
    return {
        exportedAt: new Date().toISOString(),
        context: {id: context.id, label: context.label, editable: Boolean(bean.editable)},
        bean: {
            name: bean.name,
            className: bean.className,
            definitionResource: bean.definitionResource || null,
            definitionOverridden: Boolean(bean.definitionOverridden)
        },
        properties: bean.properties.map(property => ({
            name: property.name,
            type: property.type,
            value: property.value,
            status: property.status,
            configuredValue: property.configuredValue,
            persistedValue: property.persistedValue,
            writable: property.writable,
            readable: property.readable,
            sensitive: Boolean(property.sensitive)
        }))
    };
}

/** A Spring XML bean definition carrying the current values; masked and unreadable properties are left out. */
function springXml(document) {
    const exported = document.properties.filter(property => !property.sensitive && property.readable);
    const skipped = document.properties.length - exported.length;
    const lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        `<!-- Current values of bean ${escapeXml(document.bean.name)} (${escapeXml(document.context.label)}), exported ${document.exportedAt}.`,
        skipped > 0 ? `     ${skipped} masked or unreadable propert${skipped > 1 ? 'ies are' : 'y is'} not included. -->` : '-->',
        '<beans xmlns="http://www.springframework.org/schema/beans"',
        '       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
        '       xsi:schemaLocation="http://www.springframework.org/schema/beans http://www.springframework.org/schema/beans/spring-beans.xsd">',
        `    <bean id="${escapeXml(document.bean.name)}" class="${escapeXml(document.bean.className)}">`
    ];
    exported.forEach(property => {
        lines.push(property.value === null ?
            `        <property name="${escapeXml(property.name)}"><null/></property>` :
            `        <property name="${escapeXml(property.name)}" value="${escapeXml(property.value)}"/>`);
    });
    lines.push('    </bean>', '</beans>');
    return lines.join('\n') + '\n';
}

export function beanExportSpec(context, bean) {
    return {
        tool: 'spring-bean',
        suffix: `${context.id}-${bean.name}`,
        json: () => beanDocument(context, bean),
        csv: () => ({columns: COLUMNS, rows: beanDocument(context, bean).properties}),
        xml: () => springXml(beanDocument(context, bean))
    };
}
