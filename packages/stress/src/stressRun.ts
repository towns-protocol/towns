import { run } from './stress'
import { exit } from 'process'

run()
    .then(() => {
        console.log('done')
        exit(0)
    })
    .catch((e) => {
        console.error(e)
        exit(1)
    })
