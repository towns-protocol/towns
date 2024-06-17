import './../utils/envs.mock'
import { Environment } from 'worker-common/src/environment'
import { isAllowedOrigin } from './cors'

const PRODUCTION_ENVS: Environment[] = ['production', 'omega']
const DEVELOPMENT_ENVS: Environment[] = ['development', 'test-beta']

describe('isAllowedOrigin', () => {
    test('should return true for allowed origins in development environments', () => {
        const allowedOrigins = [
            'https://app-test.towns.com',
            'https://app-test-beta.towns.com',
            'https://app.gamma.towns.com',
            'https://harmony-web-pr-*.onrender.com',
            'http://localhost:3000',
            'http://localhost:3002', // local app prod builds
            'https://localhost:3000',
            'http://localhost:8787',
            'https://notifications-gamma.towns.com',
            'https://river1-test-beta.towns.com',
            'https://*.nodes.gamma.towns.com',
            'https://test-harmony-web-pr-*.onrender.com',
        ]

        allowedOrigins.forEach((origin) => {
            DEVELOPMENT_ENVS.forEach((env) => expect(isAllowedOrigin(origin, env)).toBe(true))
        })
    })

    test('should return true for allowed origins in production environments', () => {
        const allowedOrigins = [
            'https://alpha.towns.com',
            'https://beta.towns.com',
            'https://app.towns.com',
            'https://fast-app.towns.com',
            'https://app-beta.towns.com',
            'https://app-staging.towns.com',
            'https://app-staging-beta.towns.com',
            'https://harmony-web-pr-*.onrender.com',
            'https://river1-staging.towns.com',
            'https://app.gamma.towns.com',
        ]

        allowedOrigins.forEach((origin) => {
            PRODUCTION_ENVS.forEach((env) => {
                expect(isAllowedOrigin(origin, env)).toBe(true)
            })
        })
    })

    test.skip('should return false for disallowed origins in development environments', () => {
        const disallowedOrigins = ['https://evil.com', 'https://www.evil.com']

        disallowedOrigins.forEach((origin) => {
            DEVELOPMENT_ENVS.forEach((env) => {
                expect(isAllowedOrigin(origin, env)).toBe(false)
            })
        })
    })

    test.skip('should return false for disallowed origins in production environments', () => {
        const disallowedOrigins = ['https://evil.com', 'https://www.evil.com']

        disallowedOrigins.forEach((origin) => {
            PRODUCTION_ENVS.forEach((env) => {
                expect(isAllowedOrigin(origin, env)).toBe(false)
            })
        })
    })

    test('should return true for undefined origin in development environments', () => {
        DEVELOPMENT_ENVS.forEach((env) => {
            expect(isAllowedOrigin(undefined, env)).toBe(true)
        })
    })

    test.skip('should return false for undefined origin in production environments', () => {
        PRODUCTION_ENVS.forEach((env) => {
            expect(isAllowedOrigin(undefined, env)).toBe(false)
        })
    })
})
