import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function handleGlobalError(error: Error, req: Request, res: Response, next: NextFunction) {
    console.error(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send('Internal Server Error')
}

export function handleNotFound(req: Request, res: Response) {
    res.status(StatusCodes.NOT_FOUND).send('Not Found')
}
