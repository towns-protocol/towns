import { Router } from 'express'
import { subscriptionHandler } from '../controller/subscriptionHandler'
import { validateSchema } from '../middleware/validation'
import { subscriptionSchema } from '../schema/subscription'

export const routerApi = Router()

routerApi.post('/add-subscription', validateSchema(subscriptionSchema), subscriptionHandler)
