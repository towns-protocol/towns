import { Router } from 'itty-router'
import { withCorsHeaders } from 'worker-common'
import { Env, IError } from './types'

export function throwCustomError(message: string, status: number) {
    const _err: IError = new Error(message)
    _err.status = status
    throw _err
}

const errorHandler = (error: IError, request: Request, env: Env) => {
    return new Response(error.message || 'Server Error', {
        status: error.status || 500,
        headers: withCorsHeaders(request, env.ENVIRONMENT),
    })
}

const ThrowableRouter = (options = {}) =>
    new Proxy(Router(options), {
        get: (obj: Router, prop: string) => {
            return (...args: [request: Request, env: Env]) => {
                return prop === 'handle'
                    ? obj[prop](...args).catch((e) => errorHandler(e, args[0], args[1]))
                    : // this is wrong typing
                      obj[prop](...(args as unknown as [string]))
            }
        },
    })

export const router = ThrowableRouter()
