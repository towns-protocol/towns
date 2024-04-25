import { Router } from 'express'
import { addSubscriptionHandler, removeSubscriptionHandler } from './controller/subscriptionHandler'
import { validateSchema } from './middleware/validation'
import { addSubscriptionSchema, removeSubscriptionSchema } from './subscriptionSchema'

export const subscriptionRouter = Router()

subscriptionRouter.post(
    '/add-subscription',
    validateSchema(addSubscriptionSchema),
    addSubscriptionHandler,
)
subscriptionRouter.post(
    '/remove-subscription',
    validateSchema(removeSubscriptionSchema),
    removeSubscriptionHandler,
)
