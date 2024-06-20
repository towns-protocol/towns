import { RiverRegistry } from '@river-build/web3'
import { PersistedObservable, persistedObservable } from '../../../observable/persistedObservable'
import { LoadPriority, Store } from '../../../store/store'
import { dlogger } from '@river-build/dlog'

// Over commenting here as an example that we reference from the readme

const log = dlogger('csb:riverNodeUrls')

// Define a data model, this is what will be stored in the database
export interface RiverNodeUrlsModel {
    id: '0' // single data blobs need a fixed key
    urls: string // here's some data we're trying to keep track of
}

// Define a class that will manage the data model, decorate it to give it store properties
@persistedObservable({
    tableName: 'riverNodeUrls', // this is the name of the table in the database
    loadPriority: LoadPriority.high, // this is the priority of loading the data, high means it will load first
})
export class RiverNodeUrls extends PersistedObservable<RiverNodeUrlsModel> {
    private riverRegistry: RiverRegistry // store any member variables required for logic

    // The constructor is where we set up the class, we pass in the store and any other dependencies
    constructor(store: Store, riverRegistryDapp: RiverRegistry) {
        // pass a default value to the parent class, this is what will be used if the data is not loaded
        super({ id: '0', urls: '' }, store)
        // assign any local variables
        this.riverRegistry = riverRegistryDapp
    }

    // implement start function then wire it up from parent
    override async onLoaded() {
        this.fetchUrls()
    }

    // private helper function
    private fetchUrls() {
        // this function is NOT async, fire and forget that will retry forever
        this.riverRegistry
            .getOperationalNodeUrls() // here we are fetching the node urls
            .then((urls) => {
                if (urls !== this.data.urls) {
                    this.update({ ...this.data, urls }) // if the data is new, update our own state
                }
            })
            .catch((e) => {
                log.error(e) // errors are caught, logged and we retry
                log.info('retrying in 5 seconds')
                setTimeout(() => {
                    this.fetchUrls()
                }, 5000)
            })
    }
}
