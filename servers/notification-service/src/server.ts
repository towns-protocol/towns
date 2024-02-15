import express from 'express'

import { routes } from './application/routes/routes'
import { handleGlobalError } from './application/middleware/errors'
import { validateAuthToken } from './application/middleware/auth'
import { publicRoutes } from './application/routes/publicRoutes'
import { cors } from './application/middleware/cors'

const app = express()

// Middlewares
app.use(cors)
app.use(express.json())
app.use(handleGlobalError)

app.use(publicRoutes)

app.use(validateAuthToken)
app.use(routes)

const port = process.env.PORT || 80

app.listen(port, () => {
    console.log(`notification service is running at http://localhost:${port}`)
})
