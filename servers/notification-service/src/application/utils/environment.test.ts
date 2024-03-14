import './envs.mock'

describe('environment', () => {
    describe('env filled with all required var', () => {
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
