import { Router } from 'express'
import { validateSchema } from '../middleware/validation'
import {
    deleteUserSettingsSchema,
    getUserSettingsSchema,
    saveUserSettingsSchema,
    patchUserSettingsSchema,
} from '../schema/notificationSettingsSchema'
import {
    deleteNotificationSettingsHandler,
    getNotificationSettingsHandler,
    saveNotificationSettingsHandler,
    patchNotificationSettingsHandler,
} from '../controller/notificationSettingsHandler'

export const notificationSettingsRouter = Router()

notificationSettingsRouter.put(
    '/notification-settings',
    validateSchema(saveUserSettingsSchema),
    saveNotificationSettingsHandler,
)
notificationSettingsRouter.patch(
    '/notification-settings',
    validateSchema(patchUserSettingsSchema),
    patchNotificationSettingsHandler,
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
