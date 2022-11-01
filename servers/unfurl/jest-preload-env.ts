const env = require('./env.json')
process.env.TWITTER_BEARER_TOKEN = env.TWITTER_BEARER_TOKEN

if (process.env.NODE_ENV !== 'test') {
    throw Error('Non-test environment')
}
