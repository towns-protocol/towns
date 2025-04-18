/* eslint-disable no-console */
import { serve } from '@hono/node-server'
import { makeSurveyBot } from './survey-bot'

const APP_PRIVATE_DATA_BASE64 = '<app-private-data-base64>'
const JWT_SECRET = '<jwt-secret>'

const ENV = 'local_multi'
const PORT = 5123

async function main() {
    const bot = await makeSurveyBot(APP_PRIVATE_DATA_BASE64, JWT_SECRET, ENV)

    console.log(`Server is running on http://localhost:${PORT}`)
    const { fetch } = await bot.start()
    serve({ port: PORT, fetch })
}

void main()
