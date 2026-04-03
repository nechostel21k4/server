const { transliterateName } = require('./utils/transliterationUtils');

async function run() {
    const names = ['Sandeep', 'Rahul', 'Priya', 'Venkatesh', 'Sai'];

    console.log('--- Testing transliterationUtils ---');
    for (const name of names) {
        const start = Date.now();
        const telugu = await transliterateName(name);
        console.log(`${name} -> ${telugu} (took ${Date.now() - start}ms)`);
    }
}

run();
