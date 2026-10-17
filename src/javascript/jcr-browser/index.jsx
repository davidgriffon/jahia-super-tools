import {mountTool} from '../shared/mount';
import JcrBrowserApp from './components/JcrBrowserApp';

mountTool('jcr-browser-root', config => <JcrBrowserApp contextPath={config.contextPath}/>);
