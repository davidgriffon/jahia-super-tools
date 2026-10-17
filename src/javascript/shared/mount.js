import {createRoot} from 'react-dom/client';
import {ApolloProvider} from '@apollo/client';
import {ThemeProvider} from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {createApolloClient} from './apollo';
import theme from './theme';

/**
 * Mounts a tool inside the element rendered by its JSP shell. The shell passes the context path and the GraphQL
 * endpoint through data attributes so the bundle stays independent from the servlet context name.
 *
 * @param {string} rootId id of the element to render into
 * @param {function} render receives {contextPath, graphqlEndpoint} and returns the root element
 */
export function mountTool(rootId, render) {
    const rootElement = document.getElementById(rootId);
    if (!rootElement) {
        console.error(`Super Tools: element #${rootId} not found`);
        return;
    }
    const config = {
        contextPath: rootElement.dataset.contextPath || '',
        graphqlEndpoint: rootElement.dataset.graphqlEndpoint || '/modules/graphql'
    };
    const client = createApolloClient(config.graphqlEndpoint);
    createRoot(rootElement).render(
        <ApolloProvider client={client}>
            <ThemeProvider theme={theme}>
                <CssBaseline enableColorScheme/>
                {render(config)}
            </ThemeProvider>
        </ApolloProvider>
    );
}
