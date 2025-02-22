import { RiverRegistry } from '@river-build/web3'
import { PersistedObservable, persistedObservable } from '../../../observable/persistedObservable'
import { LoadPriority, Store } from '../../../store/store'
import { dlogger } from '@river-build/dlog'
import { makeUserStreamId, streamIdAsBytes } from '../../../id'

// Over commenting here as an example that we reference from the readme

const log = dlogger('csb:agent:riverChain')

// Define a data model, (smurf named *Model) this is what will be stored in the database
export interface RiverChainModel {
    id: '0' // single data blobs need a fixed key
    // here's some data we're trying to keep track of
    urls: {
        value: string // comman seperated list of urls
        fetchedAtMs?: number // when we last fetched the urls
    }
    streamExists: Record<string, { fetchedAtMs: number; exists: boolean }> // a map of streamIds to boolean
}

// Define a class that will manage the data model, decorate it to give it store properties
@persistedObservable({
    tableName: 'riverChain', // this is the name of the table in the database
})
export class RiverChain extends PersistedObservable<RiverChainModel> {
    private sessionStartMs = Date.now()
    private stopped = false
    // The constructor is where we set up the class, we pass in the store and any other dependencies
    constructor(store: Store, private riverRegistryDapp: RiverRegistry, private userId: string) {
        // pass a default value to the parent class, this is what will be used if the data is not loaded
        // set the load priority to high, this will load first
        super({ id: '0', urls: { value: '' }, streamExists: {} }, store, LoadPriority.high)
    }

    // implement start function then wire it up from parent
    protected override onLoaded() {
        log.info('riverChain onLoaded')
        this.withInfiniteRetries(() => this.fetchUrls())
        this.withInfiniteRetries(() => this.fetchStreamExists(makeUserStreamId(this.userId)))
    }

    stop() {
        this.stopped = true
    }

    async urls(): Promise<string> {
        // urls is returning the cached data if it exists, otherwise waiting for the data to be fetched
        // if the cached data returns a stale node url, the startup will fail
        // nodes almost never exit the network, so this is a very rare case
        await this.when((x) => x.data.urls.fetchedAtMs !== undefined, { timeoutMs: 15000 })
        return this.data.urls.value
    }

    async userStreamExists(): Promise<boolean> {
        // user stream exists is returning the cached data if it exists,
        // otherwise waiting for new data to be fetched by comparing fetchedAtMs against sessionStartMs
        const streamId = makeUserStreamId(this.userId)
        await this.when((x) => {
            const entry = x.data.streamExists[streamId]
            return entry && (entry.exists || entry.fetchedAtMs >= this.sessionStartMs)
        })
        return this.data.streamExists[streamId]?.exists
    }

    async fetchUrls(): Promise<string> {
        const now = Date.now()
        const urls = await this.riverRegistryDapp.getOperationalNodeUrls() // here we are fetching the node urls
        this.setData({ urls: { value: urls, fetchedAtMs: now } }) // if the data is new, update our own state
        return urls
    }

    async fetchStreamExists(streamId: string): Promise<boolean> {
        if (this.data.streamExists[streamId]?.exists === true) {
            return true
        }
        const streamIdBytes = streamIdAsBytes(streamId)
        const now = Date.now()
        const exists = await this.riverRegistryDapp.streamExists(streamIdBytes)
        this.setData({
            streamExists: {
                ...this.data.streamExists,
                [streamId]: { exists, fetchedAtMs: now },
            },
        })
        return exists
    }

    private withInfiniteRetries<T>(fn: () => Promise<T>, delayMs: number = 5000) {
        if (this.stopped) {
            return
        }
        fn().catch((e) => {
            log.error(e)
            log.info(`retrying in ${delayMs / 1000} seconds`)
            setTimeout(() => {
                this.withInfiniteRetries(fn, delayMs)
            }, delayMs)
        })
    }
}
