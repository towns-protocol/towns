import { Router } from 'express'
import { subscriptionRouter } from './subscriptionRouter'
import { tagRouter } from './tagRouter'

export const routes = Router()

routes.use('/api', subscriptionRouter)
routes.use('/api', tagRouter)
