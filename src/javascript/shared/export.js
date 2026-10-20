/**
 * Export of tool results: JSON, CSV and XML writers and a browser download helper. Shared by the React tools and,
 * through the `exporter` bundle, by the JSP tools.
 */

export const FORMATS = {
    json: {label: 'JSON', extension: 'json', mime: 'application/json'},
    csv: {label: 'CSV', extension: 'csv', mime: 'text/csv'},
    xml: {label: 'XML', extension: 'xml', mime: 'application/xml'}
};

export function toJson(data) {
    return JSON.stringify(data, null, 2) + '\n';
}

function csvCell(value) {
    if (value === null || value === undefined) {
        return '';
    }
    const text = Array.isArray(value) ? value.join(' | ') : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * @param {Array<{key: string, label: string}>} columns the CSV columns, in order
 * @param {Array<object>} rows one object per line, read by column key; array values are joined with " | "
 */
export function toCsv(columns, rows) {
    const lines = [columns.map(column => csvCell(column.label)).join(',')];
    rows.forEach(row => lines.push(columns.map(column => csvCell(row[column.key])).join(',')));
    return lines.join('\r\n') + '\r\n';
}

export function escapeXml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        // Characters XML 1.0 cannot carry, even escaped.
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

function elementName(name) {
    const cleaned = String(name).replace(/[^A-Za-z0-9_.-]/g, '_');
    return /^[A-Za-z_]/.test(cleaned) ? cleaned : `_${cleaned}`;
}

function singular(name) {
    if (name.endsWith('ies')) {
        return `${name.slice(0, -3)}y`;
    }
    return name.endsWith('s') && name.length > 1 ? name.slice(0, -1) : 'item';
}

function xmlNode(name, value, indent, itemNames) {
    const tag = elementName(name);
    if (value === null || value === undefined) {
        return `${indent}<${tag}/>`;
    }
    if (Array.isArray(value)) {
        if (value.length === 0) {
            return `${indent}<${tag}/>`;
        }
        const item = itemNames[name] || singular(name);
        return `${indent}<${tag}>\n${value.map(entry => xmlNode(item, entry, indent + '  ', itemNames)).join('\n')}\n${indent}</${tag}>`;
    }
    if (typeof value === 'object') {
        const entries = Object.entries(value);
        if (entries.length === 0) {
            return `${indent}<${tag}/>`;
        }
        return `${indent}<${tag}>\n${entries.map(([key, child]) => xmlNode(key, child, indent + '  ', itemNames)).join('\n')}\n${indent}</${tag}>`;
    }
    return `${indent}<${tag}>${escapeXml(value)}</${tag}>`;
}

/**
 * Generic XML of a JSON-like value: object keys become elements, array entries become elements named after the
 * singular of the array name (or `itemNames[arrayName]`).
 */
export function toXml(rootName, data, itemNames = {}) {
    return `<?xml version="1.0" encoding="UTF-8"?>\n${xmlNode(rootName, data, '', itemNames)}\n`;
}

export function exportFileName(tool, suffix, extension) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace(/-\d{3}Z$/, 'Z');
    const parts = [tool, suffix, stamp].filter(Boolean).map(part => String(part).replace(/[^A-Za-z0-9_.-]+/g, '-').replace(/^-+|-+$/g, ''));
    return `${parts.filter(Boolean).join('_')}.${extension}`;
}

/** Hands a text to the browser as a file to save. CSV gets a byte order mark so that spreadsheets read UTF-8. */
export function download(fileName, mime, content) {
    const text = mime === 'text/csv' ? `\uFEFF${content}` : content;
    const url = URL.createObjectURL(new Blob([text], {type: `${mime};charset=utf-8`}));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Builds and downloads one export.
 *
 * @param {string} format json, csv or xml
 * @param {object} spec {tool, suffix, json: () => data, csv: () => ({columns, rows}), xml: () => string}
 */
export function runExport(format, spec) {
    const definition = FORMATS[format];
    let content;
    if (format === 'json') {
        content = toJson(spec.json());
    } else if (format === 'csv') {
        const {columns, rows} = spec.csv();
        content = toCsv(columns, rows);
    } else {
        content = spec.xml();
    }
    const fileName = exportFileName(spec.tool, spec.suffix, definition.extension);
    download(fileName, definition.mime, content);
    return fileName;
}
