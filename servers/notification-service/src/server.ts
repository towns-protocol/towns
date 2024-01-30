import express from 'express'
import { routes } from './application/routes/routes'
import { handleGlobalError } from './application/middleware/errors'

const app = express()
app.use(express.json())

app.use(routes)

app.use(handleGlobalError)

const port = 3030
app.listen(port, () => {
    console.log(`notification service is running at http://localhost:${port}`)
})
