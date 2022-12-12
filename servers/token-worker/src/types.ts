import { Request as IttyRequest } from 'itty-router'

export interface Env {
    ALCHEMY_API_KEY: string
}

export interface RequestWithAlchemyConfig extends Request {
    rpcUrl: string
    params: IttyRequest['params']
}

export interface IError extends Error {
    status?: number
}
