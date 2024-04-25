import { Router } from 'express'
import { subscriptionRouter } from './subscriptionRouter'
import { tagRouter } from './tagRouter'
import { notificationSettingsRouter } from './notificationSettingsRouter'

export const routes = Router()

routes.use('/api', subscriptionRouter)
routes.use('/api', tagRouter)
routes.use('/api', notificationSettingsRouter)
