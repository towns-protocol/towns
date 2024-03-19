import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { env } from '../utils/environment'
import { logger } from '../logger'

const DECODED_AUTH_SECRET = Buffer.from(env.AUTH_SECRET, 'base64').toString('utf8')

export function validateAuthToken(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization

    if (!token) {
        res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Unauthorized' })
        return
    }

    try {
        const decodedToken = Buffer.from(token.replace('Bearer ', ''), 'base64').toString('utf8')
        if (decodedToken === DECODED_AUTH_SECRET) {
            next()
            return
        }
        logger.info('secret and token do not match')
    } catch (error) {
        logger.error(error)
    }

    res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Unauthorized' })
}
