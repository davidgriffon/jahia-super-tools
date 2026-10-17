import {defineConfig} from 'cypress';

export default defineConfig({
    env: {
        // Every page of the module, relative to /modules/jahia-super-tools/. access.spec.ts checks that each one
        // denies an anonymous request and serves an administrator. Keep in sync with src/main/resources.
        SUPER_TOOLS_PAGES: [
            'index.jsp',
            'tools/jcrBrowser.jsp',
            'tools/cacheBrowser.jsp',
            'tools/permissionTester.jsp',
            'tools/assetsUsage.jsp',
            'tools/springBeanEditor.jsp',
            'tools/api/springBeanEditor.jsp?action=contexts'
        ]
    },
    chromeWebSecurity: false,
    defaultCommandTimeout: 30000,
    video: false,
    reporter: 'cypress-multi-reporters',
    reporterOptions: {
        configFile: 'reporter-config.json'
    },
    screenshotsFolder: './results/screenshots',
    videosFolder: './results/videos',
    viewportWidth: 1366,
    viewportHeight: 900,
    watchForFileChanges: false,
    retries: {runMode: 1, openMode: 0},
    e2e: {
        setupNodeEvents(on, config) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            require('cypress-terminal-report/src/installLogsPrinter')(on);
            // Reads JAHIA_URL, JAHIA_PROCESSING_URL and SUPER_USER_PASSWORD from the process environment.
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            require('@jahia/cypress/dist/plugins/registerPlugins').registerPlugins(on, config);
            return config;
        },
        specPattern: 'cypress/e2e/**/*.spec.ts',
        supportFile: 'cypress/support/e2e.ts',
        baseUrl: 'http://localhost:8080'
    }
});
