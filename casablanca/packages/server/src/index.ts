import { startZionApp } from './app'
import { config } from './config'

console.log('Hello, world!')
console.log('Config:')
console.log(config)

const app = startZionApp(config.port)
console.log('Server address:', app.wallet.address)

console.log('Listening:')
console.log(app.httpServer.address())
