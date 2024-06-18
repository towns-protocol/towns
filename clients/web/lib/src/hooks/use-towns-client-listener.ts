import { MutableRefObject, useEffect, useRef, useState } from 'react'
import { Client as CasablancaClient, SignerContext, userIdFromAddress } from '@river/sdk'
import { check } from '@river-build/dlog'
import { AuthStatus } from './login'
import { TownsClient } from '../client/TownsClient'
import { TownsOpts } from '../client/TownsClientTypes'
import {
    CasablancaCredentials,
    credentialsToSignerContext,
    useCredentialStore,
} from '../store/use-credential-store'
import { useCasablancaStore } from '../store/use-casablanca-store'
import EventEmitter from 'events'
import TypedEmitter from 'typed-emitter'
import { staticAssertNever } from '../utils/towns-utils'
import AnalyticsService, { AnalyticsEvents } from '../utils/analyticsService'
import { useNetworkStatus } from './use-network-status'
import { useSpaceDapp } from './use-space-dapp'
import { useOfflineStore } from '../store/use-offline-store'

export const useTownsClientListener = (opts: TownsOpts) => {
    const { setAuthStatus: setCasablancaAuthStatus, setAuthError: setCasablancaAuthError } =
        useCasablancaStore()
    const { casablancaCredentialsMap, clearCasablancaCredentials } = useCredentialStore()
    const casablancaCredentials = casablancaCredentialsMap[opts.environmentId ?? '']
    const [casablancaClient, setCasablancaClient] = useState<CasablancaClient>()
    const [signerContext, setSignerContext] = useState<SignerContext>()
    const clientSingleton = useRef<ClientStateMachine>()
    const { isOffline } = useNetworkStatus()
    const spaceDapp = useSpaceDapp({ provider: opts.baseProvider, config: opts.baseConfig })

    if (!clientSingleton.current) {
        const townsClient = new TownsClient(opts, spaceDapp)
        clientSingleton.current = new ClientStateMachine(townsClient)
    }

    logServerUrlMismatch(opts.environmentId, clientSingleton)

    useEffect(() => {
        if (!casablancaClient) {
            return
        }
        const isOnline = !isOffline
        if (isOnline) {
            casablancaClient.streams.onNetworkStatusChanged(isOnline)
        }
    }, [casablancaClient, isOffline])

    useEffect(() => {
        const stateMachine = clientSingleton.current
        if (!stateMachine) {
            return
        }

        const onStateMachineUpdated = (state: States) => {
            setCasablancaClient(state.casablancaClient)
            setCasablancaAuthStatus(state.authStatus)
            setSignerContext(state.signerContext)
        }

        const onClearCredentials = (oldCredendials: CasablancaCredentials) => {
            clearCasablancaCredentials(opts.environmentId ?? '', oldCredendials)
        }

        const onErrorUpdated = (e?: unknown) => {
            if (!e) {
                setCasablancaClient(undefined)
                return
            }
            const _error = e as {
                code: number
                message: string
                error: Error
            }
            setCasablancaAuthError({
                code: _error?.code ?? 0,
                message: _error?.message ?? `${JSON.stringify(e)}`,
                error: e as Error,
            })
        }

        stateMachine.on('onStateUpdated', onStateMachineUpdated)
        stateMachine.on('onClearCredentials', onClearCredentials)
        stateMachine.on('onErrorUpdated', onErrorUpdated)
        stateMachine.update(casablancaCredentials ?? undefined)
        onStateMachineUpdated(stateMachine.state)
        return () => {
            stateMachine.off('onStateUpdated', onStateMachineUpdated)
            stateMachine.off('onClearCredentials', onClearCredentials)
            stateMachine.off('onErrorUpdated', onErrorUpdated)
        }
    }, [
        casablancaCredentials,
        opts.environmentId,
        setCasablancaClient,
        clearCasablancaCredentials,
        setCasablancaAuthError,
        setCasablancaAuthStatus,
    ])

    return {
        client: casablancaClient ? clientSingleton.current.client : undefined,
        clientSingleton: clientSingleton.current.client,
        casablancaClient,
        signerContext,
    }
}

class ConnectedToRiver {
    readonly authStatus = AuthStatus.ConnectedToRiver
    constructor(
        readonly credentials: CasablancaCredentials,
        readonly casablancaClient: CasablancaClient,
        readonly signerContext: SignerContext,
    ) {}
}

class None {
    readonly authStatus = AuthStatus.None
    readonly credentials = undefined
    readonly signerContext = undefined
    readonly casablancaClient = undefined
}

class Credentialed {
    readonly authStatus = AuthStatus.Credentialed
    readonly casablancaClient = undefined
    constructor(
        readonly credentials: CasablancaCredentials,
        readonly signerContext: SignerContext,
    ) {}
}

class EvaluatingCredentials {
    readonly authStatus = AuthStatus.EvaluatingCredentials
    readonly casablancaClient = undefined
    readonly signerContext = undefined
    constructor(readonly credentials: CasablancaCredentials) {}
}

class DisconnectingFromRiver {
    readonly authStatus = AuthStatus.DisconnectingFromRiver
    readonly credentials = undefined
    readonly signerContext = undefined
    constructor(readonly casablancaClient: CasablancaClient) {}
}

class Deauthenticating {
    readonly authStatus = AuthStatus.Deauthenticating
    readonly casablancaClient = undefined
    readonly credentials = undefined
    readonly signerContext = undefined
}

type Next = { credentials?: CasablancaCredentials }
type Transitions = EvaluatingCredentials | DisconnectingFromRiver | Deauthenticating
type Situations = ConnectedToRiver | None | Credentialed
type States = Transitions | Situations

function isSituation(state: States): state is Situations {
    return state.authStatus === AuthStatus.ConnectedToRiver || state.authStatus === AuthStatus.None
}

type ClientStateMachineEvents = {
    onStateUpdated: (state: States) => void
    onClearCredentials: (oldCredendials: CasablancaCredentials) => void
    onErrorUpdated: (e?: Error) => void
}

class ClientStateMachine extends (EventEmitter as new () => TypedEmitter<ClientStateMachineEvents>) {
    state: States = new None()
    client: TownsClient
    private next: Next = {}

    constructor(client: TownsClient) {
        super()
        this.client = client

        this.client.on('onCasablancaClientCreated', (client) => {
            this.updateClient(client)
        })
    }

    update(nextCredentials?: CasablancaCredentials) {
        this.next = { credentials: nextCredentials } satisfies Next
        void this.tick()
    }

    private updateClient(client: CasablancaClient) {
        if (this.state instanceof Credentialed) {
            this.state = new ConnectedToRiver(
                this.state.credentials,
                client,
                this.state.signerContext,
            )
            this.emit('onStateUpdated', this.state)
        }
    }

    private async tick() {
        if (!isSituation(this.state)) {
            // console.log('$$$ tick: ignoring re-entry')
            return
        }
        const transition = getTransition(this.state, this.next)
        if (!transition) {
            // console.log('$$$ tick: no transition needed')
            return
        }
        logTick(this.client, this.state, transition)
        const currentSituation = this.state
        this.state = transition
        this.emit('onStateUpdated', this.state)
        this.state = await this.execute(currentSituation, transition)
        logTick(this.client, this.state)
        this.emit('onStateUpdated', this.state)
        void this.tick() // call ourself again to pick up any pending next state
    }

    private async execute(
        currentSituation: Situations,
        transition: Transitions,
    ): Promise<Situations> {
        switch (transition.authStatus) {
            case AuthStatus.DisconnectingFromRiver:
                check(currentSituation instanceof ConnectedToRiver)
                await this.client.stopCasablancaClient()
                return new None()
            case AuthStatus.Deauthenticating:
                check(currentSituation instanceof Credentialed)
                return new None()
            case AuthStatus.EvaluatingCredentials: {
                check(currentSituation instanceof None)
                AnalyticsService.getInstance().trackEventOnce(AnalyticsEvents.LoggingIn)
                this.emit('onErrorUpdated', undefined)
                const { credentials } = transition
                const newState = await logInWithRetries(credentials, this.client, this)
                return newState
            }
            default:
                staticAssertNever(transition)
        }
    }
}

async function logInWithRetries(
    credentials: CasablancaCredentials,
    client: TownsClient,
    emitter: EventEmitter,
): Promise<Situations> {
    let retryCount = 0
    const MAX_RETRY_COUNT = 20
    // eslint-disable-next-line no-constant-condition
    while (true) {
        try {
            console.log('**logging in')
            const context = credentialsToSignerContext(credentials)
            const userId = userIdFromAddress(context.creatorAddress)
            const isRegistered =
                useOfflineStore.getState().skipIsRegisteredCheck[userId] ||
                (await fetchIsRegistered(client, context))
            if (!isRegistered) {
                console.log("**user authenticated, hasn't joined a space")
                return new Credentialed(credentials, context)
            } else {
                console.log('**user authenticated, starting casablanca client')
                useOfflineStore.getState().setSkipIsRegisteredCheck(userId)
                const casablancaClient = await client.startCasablancaClient(context)
                return new ConnectedToRiver(credentials, casablancaClient, context)
            }
        } catch (e) {
            retryCount++
            console.log('******* casablanca client encountered exception *******', e)
            try {
                await client.logoutFromCasablanca()
            } catch (e) {
                console.log('error while logging out', e)
            }
            // aellis - if you have credentials you should always be able to sign in to the stream node
            // this error is probably a connect error, so we should just retry forever probably?
            // but in the future we will have expiring delegate signatures, and perhaps rate limiting? which
            // would necessitate a better conditions here
            if (retryCount >= MAX_RETRY_COUNT) {
                emitter.emit('onClearCredentials', credentials)
                emitter.emit('onErrorUpdated', e as Error)
                return new None()
            } else {
                const retryDelay = getRetryDelay(retryCount)
                console.log('******* retrying', { retryDelay, retryCount })
                // sleep
                await new Promise((resolve) => setTimeout(resolve, retryDelay))
            }
        }
    }
}

// exponentially back off, but never wait more than 20 seconds
function getRetryDelay(retryCount: number) {
    return Math.min(1000 * 2 ** retryCount, 20000)
}

function getTransition(current: Situations, next: Next): Transitions | undefined {
    switch (current.authStatus) {
        case AuthStatus.None:
            if (next.credentials !== undefined) {
                return new EvaluatingCredentials(next.credentials)
            }
            break
        case AuthStatus.ConnectedToRiver:
            AnalyticsService.getInstance().trackEventOnce(AnalyticsEvents.LoggedIn)
            if (next.credentials !== current.credentials) {
                return new DisconnectingFromRiver(current.casablancaClient)
            }
            break
        case AuthStatus.Credentialed:
            if (next.credentials != current.credentials) {
                return new Deauthenticating()
            }
            break
        default:
            staticAssertNever(current)
    }
    return undefined
}

function logTick(client: TownsClient, situation: Situations, transition?: Transitions) {
    console.log('$$$ tick update', {
        client: client.name,
        current: situation.authStatus,
        transition: transition?.authStatus,
    })
}

function logServerUrlMismatch(
    environmentId: string,
    clientSingleton: MutableRefObject<ClientStateMachine | undefined>,
) {
    if (environmentId !== clientSingleton.current?.client.opts.environmentId) {
        // aellis there is an assumption in this code that the environmentId url never changes
        // if it does change, we need to refresh the page to recreate the client
        console.error("$$$ use towns client listener: environmentId doesn't match", {
            environmentId: environmentId,
            client: clientSingleton.current?.client.opts.environmentId,
        })
    }
}

async function fetchIsRegistered(client: TownsClient, context: SignerContext) {
    console.log('** fetching Is registered State for', context.creatorAddress)
    const unauthedClient = await client.makeUnauthenticatedClient()
    return await unauthedClient.userWithAddressExists(context.creatorAddress)
}
