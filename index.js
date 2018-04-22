const genOne = require('./genOne')

const max = 25

;(async () => {
    for (let i = 0; i < max; i++) {
        await genOne().catch(console.error);
        console.log('> ' + (i + 1) + '/' + max + ' done.')
    }
})()