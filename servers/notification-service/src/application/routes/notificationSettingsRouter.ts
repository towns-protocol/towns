import { Router } from 'express'
import { validateSchema } from '../middleware/validation'
import {
    deleteUserSettingsSchema,
    getUserSettingsSchema,
    saveUserSettingsSchema,
} from '../schema/notificationSettingsSchema'
import {
    deleteNotificationSettingsHandler,
    getNotificationSettingsHandler,
    saveNotificationSettingsHandler,
} from '../controller/notificationSettingsHandler'

export const notificationSettingsRouter = Router()

notificationSettingsRouter.put(
    '/notification-settings',
    validateSchema(saveUserSettingsSchema),
    saveNotificationSettingsHandler,
)
notificationSettingsRouter.delete(
    '/notification-settings',
    validateSchema(deleteUserSettingsSchema),
    deleteNotificationSettingsHandler,
)
notificationSettingsRouter.post(
    '/get-notification-settings',
    validateSchema(getUserSettingsSchema),
    getNotificationSettingsHandler,
)
