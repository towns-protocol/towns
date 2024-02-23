import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import 'express-async-errors'

import { cors } from './middleware/cors'
import { validateAuthToken } from './middleware/auth'
import { handleGlobalError, handleNotFound } from './middleware/errors'
import { publicRoutes } from './routes/publicRoutes'
import { routes } from './routes/routes'

export async function initializeApp() {
    const app = express()
    const isProduction = process.env.NODE_ENV === 'production'

    // Middlewares
    app.use(morgan(isProduction ? 'combined' : 'dev'))
    app.use(cors)
    app.use(helmet())
    app.use(express.json())

    // public routes
    app.use(publicRoutes)

    app.use(validateAuthToken)
    app.use(routes)

    app.use('/*', handleNotFound)

    app.use(handleGlobalError)

    return app
}
