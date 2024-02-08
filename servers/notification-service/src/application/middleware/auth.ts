import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

export function validateAuthToken(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization
    const authSecret = process.env.AUTH_SECRET

    if (!token || !authSecret) {
        res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Unauthorized' })
        return
    }

    try {
        const decodedToken = Buffer.from(token.replace('Bearer ', ''), 'base64').toString('utf8')
        if (decodedToken === authSecret) {
            next()
            return
        }
    } catch (error) {
        console.error(error)
    }

    res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Unauthorized' })
}
