import { dlogger } from '@river-build/dlog'
import { Store } from '../../../store/store'

const logger = dlogger('csb:userDeviceKeys')

export class UserDeviceKeys {
    constructor(id: string, store: Store) {
        logger.log('new', id, store)
    }

    async initialize(metadata?: { spaceId: Uint8Array }) {
        logger.log('initialize', metadata)
        return Promise.resolve()
    }
}
