const fs = require('fs-extra')
const path = require('path')

const CONTRACT_LIBS = [
    '@openzeppelin',
    'account-abstraction/contracts',
    'base64',
    'ds-test',
    'forge-std/src',
    'hardhat-deploy',
    '@prb/math/src',
    '@prb/test/src',
]

const findNodeModules = () => {
    // go up until we find node_modules
    let dir = __dirname
    while (!fs.existsSync(path.join(dir, 'node_modules'))) {
        dir = path.dirname(dir)
    }
    return `${dir}/node_modules`
}

const NODE_MODULES_DIR = findNodeModules()

const rootDirectory = path.dirname(__dirname)
for (const lib of CONTRACT_LIBS) {
    const source = path.join(NODE_MODULES_DIR, lib)
    const destination = path.join(rootDirectory, 'lib', lib)
    fs.copy(source, destination, function (err) {
        if (err) {
            return console.error(err)
        }
        console.log(`Copy completed from ${source} to ${destination}`)
    })
}
