import dotenv from 'dotenv'
import { resolve } from 'path'
import 'fake-indexeddb/auto'

dotenv.config({ path: resolve(__dirname, '.env.test') })
