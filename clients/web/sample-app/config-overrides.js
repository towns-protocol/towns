module.exports = function override(config, env) {
    console.log('React app rewired works!')
    config.resolve.fallback = {
        // needed b/c of olm in zion-client
        fs: false,
        stream: false,
        crypto: false,
        path: false,
    }
    return config
}
