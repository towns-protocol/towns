import { Router } from 'express'
import { StatusCodes } from 'http-status-codes'

export const publicRoutes = Router()
publicRoutes.get('/health', (_req, res) => res.status(StatusCodes.OK).json('OK'))
