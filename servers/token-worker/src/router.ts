import { Request, Router } from 'itty-router'
import { Env, IError } from './types'

const errorHandler = (error: IError) =>
    new Response(error.message || 'Server Error', { status: error.status || 500 })

const ThrowableRouter = (options = {}) =>
    new Proxy(Router(options), {
        get: (obj: Router, prop: string) => {
            return (...args: [request: Request, env: Env]) => {
                return prop === 'handle'
                    ? obj[prop](...args).catch(errorHandler)
                    : // this is wrong typing
                      obj[prop](...(args as unknown as [string]))
            }
        },
    })

export const router = ThrowableRouter()
