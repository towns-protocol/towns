import express from 'express'
import cors from 'cors'
import { routes } from './application/routes/routes'
import { handleGlobalError } from './application/middleware/errors'
import { validateAuthToken } from './application/middleware/auth'

const app = express()

// Middlewares
app.use(cors()) // TODO: configure cors origins
app.use(express.json())
app.use(handleGlobalError)
app.use(validateAuthToken)

app.use(routes)

const port = process.env.PORT || 80

app.listen(port, () => {
    console.log(`notification service is running at http://localhost:${port}`)
})
