import { dlogger } from '@river-build/dlog'
import { Client } from '../../client'
import { Observable } from '../../observable/observable'
import { PersistedObservable, persistedObservable } from '../../observable/persistedObservable'
import { LoadPriority, Store } from '../../store/store'
import { RiverConnection } from '../river-connection/riverConnection'
import { UserDeviceKeys } from './models/userDeviceKeys'
import { UserInbox } from './models/userInbox'
import { UserMemberships } from './models/userMemberships'
import { UserSettings } from './models/userSettings'

const logger = dlogger('csb:user')

export interface UserModel {
    id: string
    initialized: boolean
}

export enum AuthStatus {
    /** User is not authenticated or connected to the river client. */
    None = 'None',
    /** Transition state: None -> EvaluatingCredentials -> [Credentialed OR ConnectedToRiver]
     *  if a river user is found, will connect to river client, otherwise will just validate credentials.
     */
    EvaluatingCredentials = 'EvaluatingCredentials',
    /** User authenticated with a valid credential but without an active river stream client. */
    Credentialed = 'Credentialed',
    /** User authenticated with a valid credential and with an active river river client. */
    ConnectedToRiver = 'ConnectedToRiver',
    Error = 'Error',
}

class LoginContext {
    constructor(public client: Client, public cancelled: boolean) {}
}

@persistedObservable({ tableName: 'user' })
export class User extends PersistedObservable<UserModel> {
    id: string
    memberships: UserMemberships
    inbox: UserInbox
    deviceKeys: UserDeviceKeys
    settings: UserSettings
    authStatus = new Observable<AuthStatus>(AuthStatus.None)
    loginError?: Error
    private riverConnection: RiverConnection

    constructor(id: string, store: Store, riverConnection: RiverConnection) {
        super({ id, initialized: false }, store, LoadPriority.high)
        this.id = id
        this.riverConnection = riverConnection
        this.memberships = new UserMemberships(id, store, riverConnection)
        this.inbox = new UserInbox(id, store)
        this.deviceKeys = new UserDeviceKeys(id, store)
        this.settings = new UserSettings(id, store)
    }

    override async onLoaded() {
        this.riverConnection.registerView(this)
    }

    async initialize(newUserMetadata?: { spaceId: Uint8Array | string }) {
        await this.riverConnection.call(async (client) => {
            await client.initializeUser(newUserMetadata)
            client.startSync()
        })
        this.update({ ...this.data, initialized: true })
        this.authStatus.set(AuthStatus.ConnectedToRiver)
    }

    onClientStarted(client: Client) {
        this.authStatus.set(AuthStatus.EvaluatingCredentials)
        const loginContext = new LoginContext(client, false)
        this.loginWithRetries(loginContext).catch((err) => {
            logger.error('login failed', err)
            this.loginError = err
            this.authStatus.set(AuthStatus.Error)
        })
        return () => {
            loginContext.cancelled = true
        }
    }

    private async loginWithRetries(loginContext: LoginContext) {
        let retryCount = 0
        const MAX_RETRY_COUNT = 20
        while (!loginContext.cancelled) {
            try {
                logger.log('logging in')
                if (this.data.initialized) {
                    await this.initialize()
                } else {
                    const canInitialize = await loginContext.client.userExists(this.id)
                    if (canInitialize) {
                        await this.initialize()
                    }
                    loginContext.client.startSync()
                }
                break
            } catch (err) {
                retryCount++
                this.loginError = err as Error
                logger.log('encountered exception while initializing', err)
                if (retryCount >= MAX_RETRY_COUNT) {
                    throw err
                } else {
                    const retryDelay = getRetryDelay(retryCount)
                    logger.log('******* retrying', { retryDelay, retryCount })
                    // sleep
                    await new Promise((resolve) => setTimeout(resolve, retryDelay))
                }
            }
        }
    }
}

// exponentially back off, but never wait more than 20 seconds
function getRetryDelay(retryCount: number) {
    return Math.min(1000 * 2 ** retryCount, 20000)
}
