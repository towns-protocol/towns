/* eslint-disable no-console */
// Crypto Store uses IndexedDB, so we need to import fake-indexeddb/auto
import 'fake-indexeddb/auto'
import { makeTownsBot } from './bot'

const MNEMONIC = '<mnemonic>'
const ENCRYPTION_DEVICE_BASE64 = '<exported-device-base64>'
const JWT_SECRET = '<jwt-secret>'

const ENV = 'local_multi'
const PORT = 5123

async function main() {
    const bot = await makeTownsBot(MNEMONIC, ENCRYPTION_DEVICE_BASE64, JWT_SECRET, ENV)

    bot.onMessage((h, { message, userId }) => {
        console.log(`${userId} said: ${message}`)
    })

    console.log(`Server is running on http://localhost:${PORT}`)
    await bot.start(PORT)
}

void main()
