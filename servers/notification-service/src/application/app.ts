import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import morganjson from 'morgan-json'
import 'express-async-errors'

import { cors } from './middleware/cors'
import { validateAuthToken } from './middleware/auth'
import { handleGlobalError, handleNotFound } from './middleware/errors'
import { publicRoutes } from './routes/publicRoutes'
import { routes } from './routes/routes'
import { isProduction } from './utils/environment'

export async function initializeApp() {
    const app = express()

    // Middlewares
    if (isProduction) {
        app.use(
            morgan(
                morganjson(
                    ':remote-addr :remote-user :date[clf] :method :url :http-version :status :res[content-length] :referrer :user-agent',
                ),
            ),
        )
    } else {
        app.use(morgan('dev'))
    }
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
