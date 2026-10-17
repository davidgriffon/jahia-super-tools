/** javax.jcr.PropertyType names a value can be typed in; BINARY and UNDEFINED are not editable here. */
export const PROPERTY_TYPES = ['STRING', 'LONG', 'DOUBLE', 'DECIMAL', 'BOOLEAN', 'DATE', 'NAME', 'PATH', 'URI', 'REFERENCE', 'WEAKREFERENCE'];

export const REFERENCE_TYPES = ['REFERENCE', 'WEAKREFERENCE'];

/** Mirrors the server rule: writes under these subtrees need an explicit acknowledgement. */
export function isSensitivePath(path) {
    return Boolean(path) && /^\/(users|groups|roles|permissions|settings)(\/.*)?$|^\/sites\/[^/]+\/(users|groups)(\/.*)?$|(^|.*\/)j:acl(\/.*)?$/.test(path);
}

export function parentPath(path) {
    if (!path || path === '/') {
        return null;
    }
    const index = path.lastIndexOf('/');
    return index <= 0 ? '/' : path.substring(0, index);
}

export function toDateTimeLocal(value) {
    if (!value) {
        return '';
    }
    const date = new Date(value);
    if (isNaN(date.getTime())) {
        return '';
    }
    const pad = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function fromDateTimeLocal(value) {
    if (!value) {
        return '';
    }
    const date = new Date(value);
    return isNaN(date.getTime()) ? value : date.toISOString();
}

/** The values of a property as an array of strings, whatever its cardinality. */
export function propertyValues(property) {
    if (!property) {
        return [];
    }
    if (property.multiple) {
        return property.values || [];
    }
    return property.value === null || property.value === undefined ? [] : [property.value];
}

export function compareNames(a, b) {
    return a.name.localeCompare(b.name);
}

/** Name with the same-name-sibling index, as JCR paths spell it. */
export function displayName(node) {
    if (!node) {
        return '';
    }
    const name = node.name || '/';
    return node.index > 1 ? `${name}[${node.index}]` : name;
}
