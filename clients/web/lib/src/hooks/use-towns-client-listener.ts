import { MutableRefObject, useEffect, useRef, useState } from 'react'
import { Client as CasablancaClient, SignerContext } from '@river/sdk'
import { check } from '@river-build/dlog'
import { LoginStatus } from './login'
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

export const useTownsClientListener = (opts: TownsOpts) => {
    const { setLoginStatus: setCasablancaLoginStatus, setLoginError: setCasablancaLoginError } =
        useCasablancaStore()
    const { casablancaCredentialsMap, clearCasablancaCredentials } = useCredentialStore()
    const casablancaCredentials = casablancaCredentialsMap[opts.environmentId ?? '']
    const [casablancaClient, setCasablancaClient] = useState<CasablancaClient>()
    const [signerContext, setSignerContext] = useState<SignerContext>()
    const clientSingleton = useRef<ClientStateMachine>()
    const { isOffline } = useNetworkStatus()

    if (!clientSingleton.current) {
        const townsClient = new TownsClient(opts)
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
            setCasablancaLoginStatus(state.loginStatus)
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
            setCasablancaLoginError({
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
        setCasablancaLoginStatus,
        clearCasablancaCredentials,
        setCasablancaLoginError,
    ])

    return {
        client: casablancaClient ? clientSingleton.current.client : undefined,
        clientSingleton: clientSingleton.current.client,
        casablancaClient,
        signerContext,
    }
}

class LoggedIn {
    readonly loginStatus = LoginStatus.LoggedIn
    constructor(
        readonly credentials: CasablancaCredentials,
        readonly casablancaClient: CasablancaClient,
        readonly signerContext: SignerContext,
    ) {}
}

class LoggedOut {
    readonly loginStatus = LoginStatus.LoggedOut
    readonly credentials = undefined
    readonly signerContext = undefined
    readonly casablancaClient = undefined
}

class Authenticated {
    readonly loginStatus = LoginStatus.Authenticated
    readonly casablancaClient = undefined
    constructor(
        readonly credentials: CasablancaCredentials,
        readonly signerContext: SignerContext,
    ) {}
}

class LoggingIn {
    readonly loginStatus = LoginStatus.LoggingIn
    readonly casablancaClient = undefined
    readonly signerContext = undefined
    constructor(readonly credentials: CasablancaCredentials) {}
}

class LoggingOut {
    readonly loginStatus = LoginStatus.LoggingOut
    readonly credentials = undefined
    readonly signerContext = undefined
    constructor(readonly casablancaClient: CasablancaClient) {}
}

class Deauthenticating {
    readonly loginStatus = LoginStatus.Deauthenticating
    readonly casablancaClient = undefined
    readonly credentials = undefined
    readonly signerContext = undefined
}

type Next = { credentials?: CasablancaCredentials }
type Transitions = LoggingIn | LoggingOut | Deauthenticating
type Situations = LoggedIn | LoggedOut | Authenticated
type States = Transitions | Situations

function isSituation(state: States): state is Situations {
    return state.loginStatus === LoginStatus.LoggedIn || state.loginStatus === LoginStatus.LoggedOut
}

type ClientStateMachineEvents = {
    onStateUpdated: (state: States) => void
    onClearCredentials: (oldCredendials: CasablancaCredentials) => void
    onErrorUpdated: (e?: Error) => void
}

class ClientStateMachine extends (EventEmitter as new () => TypedEmitter<ClientStateMachineEvents>) {
    state: States = new LoggedOut()
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
        if (this.state instanceof Authenticated) {
            this.state = new LoggedIn(this.state.credentials, client, this.state.signerContext)
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
        switch (transition.loginStatus) {
            case LoginStatus.LoggingOut:
                check(currentSituation instanceof LoggedIn)
                await this.client.stopCasablancaClient()
                return new LoggedOut()
            case LoginStatus.Deauthenticating:
                check(currentSituation instanceof Authenticated)
                return new LoggedOut()
            case LoginStatus.LoggingIn: {
                check(currentSituation instanceof LoggedOut)
                AnalyticsService.getInstance().trackEventOnce(AnalyticsEvents.LoggingIn)
                this.emit('onErrorUpdated', undefined)
                const { credentials } = transition
                try {
                    console.log('**logging in')
                    const context = credentialsToSignerContext(credentials)

                    // use unauthenticated client to check to see if we exist on the server, if so, we can login
                    const unauthedClient = await this.client.makeUnauthenticatedClient()
                    const isRegistered = await unauthedClient.userWithAddressExists(
                        context.creatorAddress,
                    )
                    if (!isRegistered) {
                        console.log("**user authenticated, hasn't joined a space")
                        return new Authenticated(credentials, context)
                    } else {
                        console.log('**user authenticated, starting casablanca client')
                        const casablancaClient = await this.client.startCasablancaClient(context)
                        return new LoggedIn(credentials, casablancaClient, context)
                    }
                } catch (e) {
                    console.log('******* casablanca client encountered exception *******', e)
                    try {
                        await this.client.logoutFromCasablanca()
                    } catch (e) {
                        console.log('error while logging out', e)
                    }
                    this.emit('onClearCredentials', credentials)
                    this.emit('onErrorUpdated', e as Error)
                    return new LoggedOut()
                }
            }
            default:
                staticAssertNever(transition)
        }
    }
}

function getTransition(current: Situations, next: Next): Transitions | undefined {
    switch (current.loginStatus) {
        case LoginStatus.LoggedOut:
            if (next.credentials !== undefined) {
                return new LoggingIn(next.credentials)
            }
            break
        case LoginStatus.LoggedIn:
            AnalyticsService.getInstance().trackEventOnce(AnalyticsEvents.LoggedIn)
            if (next.credentials !== current.credentials) {
                return new LoggingOut(current.casablancaClient)
            }
            break
        case LoginStatus.Authenticated:
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
        current: situation.loginStatus,
        transition: transition?.loginStatus,
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
