import { run } from './stress'
import { exit } from 'process'

run()
    .then(() => {
        console.log('done') // eslint-disable-line no-console
        exit(0)
    })
    .catch((e) => {
        console.error(e) // eslint-disable-line no-console
        exit(1)
    })
