/**
 * Client of tools/api/springBeanEditor.jsp. Every request carries the Support Tools access token as a request
 * parameter, the way the tools CSRF filter expects it; the token is renewed through the filter's token endpoint
 * before it expires. When the tools module is absent the filter is absent too, so a failed renewal is not fatal.
 */
const TOKEN_MAX_AGE = 10 * 60 * 1000;

export function createApi(config) {
    let token = {value: config.token || '', fetchedAt: Date.now()};
    // The module's own CSRF token (per session), sent as a header on every write.
    const csrfHeaders = config.csrf ? {'X-SuperTools-Csrf': config.csrf} : {};

    const getToken = async () => {
        if (token.value && Date.now() - token.fetchedAt < TOKEN_MAX_AGE) {
            return token.value;
        }
        try {
            const response = await fetch(config.tokenUrl, {method: 'POST', credentials: 'same-origin'});
            if (response.ok) {
                const body = await response.json();
                token = {value: body.token, fetchedAt: Date.now()};
            }
        } catch (error) {
            console.warn('Super Tools: unable to renew the tools access token', error);
        }
        return token.value;
    };

    const call = async (params, method = 'GET') => {
        const accessToken = await getToken();
        const search = new URLSearchParams(accessToken ? {...params, toolAccessToken: accessToken} : params);
        const response = method === 'GET' ?
            await fetch(`${config.apiUrl}?${search}`, {credentials: 'same-origin'}) :
            await fetch(config.apiUrl, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {'Content-Type': 'application/x-www-form-urlencoded', ...csrfHeaders},
                body: search
            });
        const text = await response.text();
        let body;
        try {
            body = JSON.parse(text);
        } catch {
            throw new Error(`Unexpected response from the server (${response.status})`);
        }
        if (!response.ok) {
            throw new Error(body.error || `Request failed (${response.status})`);
        }
        return body;
    };

    return {
        contexts: () => call({action: 'contexts'}),
        overrides: () => call({action: 'overrides'}),
        beans: context => call({action: 'beans', context}),
        bean: (context, bean) => call({action: 'bean', context, bean}),
        save: (context, bean, mode, fields) => call({action: 'save', context, bean, mode, ...fields}, 'POST')
    };
}

/** Turns the per-row edits into the form fields the API expects. */
export function fieldsFor(edits) {
    const fields = {};
    Object.entries(edits).forEach(([name, edit]) => {
        if (edit.restore) {
            fields[`restore_${name}`] = 'true';
        }
        if (edit.unpersist) {
            fields[`unpersist_${name}`] = 'true';
        }
        if (edit.persistCurrent) {
            fields[`persist_${name}`] = 'true';
        }
        if (edit.text !== undefined || edit.isNull !== undefined) {
            fields[`prop_${name}`] = edit.isNull ? '' : (edit.text || '');
            if (edit.isNull) {
                fields[`null_${name}`] = 'true';
            }
        }
    });
    return fields;
}
