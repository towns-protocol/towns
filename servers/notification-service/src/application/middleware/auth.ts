import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { env } from '../utils/environment'

export function validateAuthToken(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization
    const authSecret = env.AUTH_SECRET

    if (!authSecret) {
        console.error('Env var AUTH_SECRET is not set')
        return
    }

    if (!token) {
        res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Unauthorized' })
        return
    }

    try {
        const decodedToken = Buffer.from(token.replace('Bearer ', ''), 'base64').toString('utf8')
        const decodedAuthSecret = Buffer.from(authSecret, 'base64').toString('utf8')
        if (decodedToken === decodedAuthSecret) {
            next()
            return
        }
        console.log('secret and token do not match')
    } catch (error) {
        console.error(error)
    }

    res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Unauthorized' })
}
