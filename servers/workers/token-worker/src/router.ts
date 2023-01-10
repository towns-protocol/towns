import { Router } from 'itty-router'
import { withCorsHeaders } from '../../common/cors'
import { Env, IError } from './types'

export function throwCustomError(message: string, status: number) {
    const _err: IError = new Error(message)
    _err.status = status
    throw _err
}

const errorHandler = (error: IError, request: Request) => {
    return new Response(error.message || 'Server Error', {
        status: error.status || 500,
        headers: withCorsHeaders(request),
    })
}

const ThrowableRouter = (options = {}) =>
    new Proxy(Router(options), {
        get: (obj: Router, prop: string) => {
            return (...args: [request: Request, env: Env]) => {
                return prop === 'handle'
                    ? obj[prop](...args).catch((e) => errorHandler(e, args[0]))
                    : // this is wrong typing
                      obj[prop](...(args as unknown as [string]))
            }
        },
    })

export const router = ThrowableRouter()
