import { Router } from 'express'
import { routerApi } from './routerApi'

export const routes = Router()

routes.use('/api', routerApi)
