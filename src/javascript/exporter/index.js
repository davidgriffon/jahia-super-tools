import {runExport, toXml} from '../shared/export';

/**
 * Export buttons of the JSP tools. A page renders
 *   <script type="application/json" id="some-id">payload</script>
 *   <div data-st-export="some-id"><button type="button" data-format="csv">CSV</button>...</div>
 * where the payload is built by ExportPayloads on the server: {tool, suffix, data, csv, xmlRoot, xmlItems}.
 */
function bind(container) {
    const source = document.getElementById(container.dataset.stExport);
    if (!source) {
        return;
    }
    const payload = JSON.parse(source.textContent);
    const spec = {
        tool: payload.tool,
        suffix: payload.suffix,
        json: () => payload.data,
        csv: () => payload.csv,
        xml: () => toXml(payload.xmlRoot, payload.data, payload.xmlItems || {})
    };
    container.querySelectorAll('button[data-format]').forEach(button => {
        button.addEventListener('click', () => runExport(button.dataset.format, spec));
    });
}

function init() {
    document.querySelectorAll('[data-st-export]').forEach(bind);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
