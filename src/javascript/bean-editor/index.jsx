import {createRoot} from 'react-dom/client';
import {ThemeProvider} from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from '../shared/theme';
import {createApi} from './api';
import BeanEditorApp from './components/BeanEditorApp';

// No GraphQL here: the editor talks to a JSON JSP, so it mounts without the Apollo provider.
const rootElement = document.getElementById('spring-bean-editor-root');
if (rootElement) {
    const api = createApi({
        apiUrl: rootElement.dataset.apiUrl,
        tokenUrl: rootElement.dataset.tokenUrl,
        token: rootElement.dataset.token,
        csrf: rootElement.dataset.csrf
    });
    createRoot(rootElement).render(
        <ThemeProvider theme={theme}>
            <CssBaseline enableColorScheme/>
            <BeanEditorApp api={api}/>
        </ThemeProvider>
    );
} else {
    console.error('Super Tools: element #spring-bean-editor-root not found');
}
