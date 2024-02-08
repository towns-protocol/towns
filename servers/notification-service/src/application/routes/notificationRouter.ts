import { Router } from 'express'
import { validateSchema } from '../middleware/validation'
import { notifyUsersSchema } from '../schema/notificationSchema'
import { notifyUsersHandler } from '../controller/notificationHandler'

export const notificationRouter = Router()

notificationRouter.post('/notify-users', validateSchema(notifyUsersSchema), notifyUsersHandler)
