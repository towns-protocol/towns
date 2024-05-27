// Script to suppress unnecessary experimental and max listener warnings from node.js.
// Add with -r flag to node command line. For example:
//
//    yarn node -r ../../../scripts/node-no-warn.js my-script.js
//

var path = require('path')
var os = require('os')
var fs = require('fs')

var localRiverCA = path.join(os.homedir(), 'river-ca-cert.pem')

if (!fs.existsSync(localRiverCA)) {
    console.log('CA does not exist, did you forget to run ../scripts/register-ca.sh')
} else {
    process.env.NODE_EXTRA_CA_CERTS = localRiverCA
}

// Increase max listeners from 10 to 100 to avoid warnings for legitimate use cases.
require('events').setMaxListeners(100)

// Replace default warning printer with one that suppresses warnings we don't care about.
const listeners = process.listeners('warning')
if (listeners.length > 0) {
    const prevListener = listeners[0]
    process.removeListener('warning', prevListener)
    process.on('warning', (...args) => {
        if (args.length === 0) {
            return
        }
        const warning = args[0]
        if (
            warning?.name === 'ExperimentalWarning' &&
            ('' + warning?.message).startsWith('VM Modules')
        ) {
            return
        }
        if (
            warning?.name === 'ExperimentalWarning' &&
            ('' + warning?.message).startsWith('Custom ESM Loaders')
        ) {
            return
        }
        if (
            warning?.name === 'ExperimentalWarning' &&
            ('' + warning?.message).startsWith('Importing JSON')
        ) {
            return
        }
        if (
            warning?.name === 'ExperimentalWarning' &&
            ('' + warning?.message).startsWith('Import assertions')
        ) {
            return
        }
        prevListener(...args)
    })
}
