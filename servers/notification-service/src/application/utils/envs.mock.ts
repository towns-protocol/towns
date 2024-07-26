if (process.env.NODE_ENV !== 'test') {
    throw new Error('These should only be loaded by tests.')
}

process.env.NODE_ENV = 'test'
process.env.NOTIFICATION_DATABASE_URL = 'notification_database_url'
process.env.AUTH_SECRET = 'auth_secret'
process.env.VAPID_PUBLIC_KEY = 'vapid_public_key'
process.env.VAPID_PRIVATE_KEY = 'vapid_private_key'
process.env.VAPID_SUBJECT = 'vapid_subject'
process.env.RIVER_NODE_URL = 'river_node_url'
process.env.APNS_AUTH_KEY = '-----BEGIN PRIVATE KEY-----blah-----END PRIVATE KEY-----'
process.env.APNS_KEY_ID = 'HNTLABS123'
process.env.APNS_TEAM_ID = 'HNTLABS456'
process.env.APNS_TOWNS_APP_IDENTIFIER = 'com.towns.internal'
