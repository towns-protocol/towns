describe('environment', () => {
    describe('env filled with all required var', () => {
        process.env.NODE_ENV = 'test'
        process.env.NOTIFICATION_DATABASE_URL = 'notification_database_url'
        process.env.AUTH_SECRET = 'auth_secret'
        process.env.VAPID_PUBLIC_KEY = 'vapid_public_key'
        process.env.VAPID_PRIVATE_KEY = 'vapid_private_key'
        process.env.VAPID_SUBJECT = 'vapid_subject'

        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { env } = require('./environment')

        test('should have NODE_ENV defined', () => {
            expect(env.NODE_ENV).toBeDefined()
        })

        test('should have PORT defined', () => {
            expect(env.PORT).toBeDefined()
        })

        test('should have NOTIFICATION_DATABASE_URL defined', () => {
            expect(env.NOTIFICATION_DATABASE_URL).toBeDefined()
        })

        test('should have AUTH_SECRET defined', () => {
            expect(env.AUTH_SECRET).toBeDefined()
        })

        test('should have VAPID_PUBLIC_KEY defined', () => {
            expect(env.VAPID_PUBLIC_KEY).toBeDefined()
        })

        test('should have VAPID_PRIVATE_KEY defined', () => {
            expect(env.VAPID_PRIVATE_KEY).toBeDefined()
        })

        test('should have VAPID_SUBJECT defined', () => {
            expect(env.VAPID_SUBJECT).toBeDefined()
        })
    })
})
