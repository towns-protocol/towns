import { startZionApp } from './app'
import { config } from './config'

console.log('Hello, world!')
console.log('Config:')
console.log(config)

const app = startZionApp(config.port, config.storageType) // TODO - figure out how to pass config as an object
console.log('Server address:', app.wallet.address)

console.log('Listening:')
console.log(app.appServer.address())
