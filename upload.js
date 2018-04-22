const fs = require('fs')
const mega = require('megajs')

const [,, account, file] = process.argv

const MAX_STORAGE_SIZE = 50e9

;(async () => {
    const [email, password] = account.split(':')

    const storage = await new Promise((res, rej) => {
        const storage = mega({ email, password }, err => err ? rej(err) : res(storage))
    })

    console.log('Connected to ' + storage.name)

    const totalSize = Object.values(storage.files).map(file => file.size).filter(size => size).reduce((i1, i2) => i1 + i2);
    console.log(`Storage used: ${(totalSize * 1e-9).toFixed(2)}Go (${totalSize}o)`)
    console.log(`Total usage: ${(100 * totalSize  / MAX_STORAGE_SIZE).toFixed(0)}%`)

    if (file) {

        const { size } = fs.statSync(file);

        if (size > MAX_STORAGE_SIZE - totalSize) {
            console.log(`Not enough space left in storage!`)
            return 2;
        }

        const handle = await new Promise(
            (res, rej) => fs.createReadStream(file).pipe(storage.upload(file, null, (err, handle) => err ? rej(err) : res(handle)))
        )
        
        console.log('File uploaded')

        const url = await new Promise((res, rej) => handle.link((err, url) => err ? rej(err) : res(url)))

        console.log('Link: ' + url)

    }

    return 0
})().then(code => process.exit(code || 0), err => {
    console.error(err)
    process.exit(1)
})
