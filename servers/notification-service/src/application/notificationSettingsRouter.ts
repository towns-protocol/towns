import { Router } from 'express'
import { validateSchema } from './middleware/validation'
import {
    deleteUserSettingsSchema,
    getUserSettingsSchema,
    saveUserSettingsSchema,
    patchUserSettingsSchema,
} from './notificationSettingsSchema'
import {
    deleteNotificationSettingsHandler,
    getNotificationSettingsHandler,
    saveNotificationSettingsHandler,
    patchNotificationSettingsHandler,
} from './controller/notificationSettingsHandler'
import asyncHandler from 'express-async-handler'

export const notificationSettingsRouter = Router()

notificationSettingsRouter.put(
    '/notification-settings',
    validateSchema(saveUserSettingsSchema),
    asyncHandler(saveNotificationSettingsHandler),
)
notificationSettingsRouter.patch(
    '/notification-settings',
    validateSchema(patchUserSettingsSchema),
    asyncHandler(patchNotificationSettingsHandler),
)
notificationSettingsRouter.delete(
    '/notification-settings',
    validateSchema(deleteUserSettingsSchema),
    asyncHandler(deleteNotificationSettingsHandler),
)
notificationSettingsRouter.post(
    '/get-notification-settings',
    validateSchema(getUserSettingsSchema),
    asyncHandler(getNotificationSettingsHandler),
)
