import {ApolloClient, HttpLink, InMemoryCache} from '@apollo/client';

/**
 * Apollo client bound to the Jahia GraphQL endpoint of the current context.
 *
 * Normalization is disabled on purpose: the same node uuid exists in both workspaces and DXM node types share
 * their ids, so a normalized cache would mix EDIT and LIVE data. Every query is fetched from the network anyway,
 * the tools always show the live state of the server.
 */
export function createApolloClient(graphqlEndpoint) {
    return new ApolloClient({
        link: new HttpLink({uri: graphqlEndpoint, credentials: 'same-origin'}),
        cache: new InMemoryCache({dataIdFromObject: () => undefined}),
        defaultOptions: {
            watchQuery: {fetchPolicy: 'network-only', errorPolicy: 'all'},
            query: {fetchPolicy: 'network-only', errorPolicy: 'all'},
            mutate: {errorPolicy: 'all'}
        }
    });
}

/**
 * Turns an Apollo error or a mutation result into a readable sentence.
 */
export function errorMessage(error) {
    if (!error) {
        return '';
    }
    if (Array.isArray(error)) {
        return error.map(e => e.message).join('; ');
    }
    if (error.graphQLErrors && error.graphQLErrors.length > 0) {
        return error.graphQLErrors.map(e => e.message).join('; ');
    }
    if (error.networkError) {
        return `Network error: ${error.networkError.message}`;
    }
    return error.message || String(error);
}
