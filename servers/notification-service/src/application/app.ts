import express from 'express'
import 'express-async-errors'

import { cors } from './middleware/cors'
import { validateAuthToken } from './middleware/auth'
import { handleGlobalError, handleNotFound } from './middleware/errors'
import { publicRoutes } from './routes/publicRoutes'
import { routes } from './routes/routes'

export async function initializeApp() {
    const app = express()

    // Middlewares
    app.use(cors)
    app.use(express.json())

    // public routes
    app.use(publicRoutes)

    app.use(validateAuthToken)
    app.use(routes)

    app.use('/*', handleNotFound)

    app.use(handleGlobalError)

    return app
}
