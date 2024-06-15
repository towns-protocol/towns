import { Router } from 'express'
import { validateSchema } from './middleware/validation'
import { tagSchema } from './tagSchema'
import { tagHandler } from './controller/tagHandler'

export const tagRouter = Router()

tagRouter.post('/tag', validateSchema(tagSchema), tagHandler)
