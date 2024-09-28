process.on('unhandledRejection', (reason, promise) => {
    console.log('unhandledRejection', reason, promise);
});

const fs = require('fs-extra');
const concat = require('concat');


(async build => {
    console.info('Starting elements build');
    const files = [
        './dist/common-ui-components/browser/polyfills.js',
        './dist/common-ui-components/browser/main.js',
        './dist/common-ui-components/browser/scripts.js',
    ];

    await fs.ensureDir('dist');
    await concat(files, 'dist/common-ui-components/browser/thuis-components.js');
    console.info('Elements Build Success!')
})();