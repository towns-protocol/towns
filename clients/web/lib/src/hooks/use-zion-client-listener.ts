import { MutableRefObject, useEffect, useRef, useState } from 'react'
import { bin_fromHexString, Client as CasablancaClient, check, SignerContext } from '@river/sdk'
import { LoginStatus } from './login'
import { ZionClient } from '../client/ZionClient'
import { ZionOpts } from '../client/ZionClientTypes'
import { CasablancaCredentials, useCredentialStore } from '../store/use-credential-store'
import { useWeb3Context } from '../components/Web3ContextProvider'
import { useCasablancaStore } from '../store/use-casablanca-store'
import EventEmitter from 'events'
import TypedEmitter from 'typed-emitter'
import { staticAssertNever } from '../utils/zion-utils'

export const useZionClientListener = (opts: ZionOpts) => {
    const { provider } = useWeb3Context()
    const { setLoginStatus: setCasablancaLoginStatus, setLoginError: setCasablancaLoginError } =
        useCasablancaStore()
    const { casablancaCredentialsMap, clearCasablancaCredentials } = useCredentialStore()
    const casablancaCredentials = casablancaCredentialsMap[opts.casablancaServerUrl ?? '']
    const [casablancaClient, setCasablancaClient] = useState<CasablancaClient>()
    const clientSingleton = useRef<ClientStateMachine>()

    if (!clientSingleton.current) {
        const zionClient = new ZionClient({
            ...opts,
            web3Provider: provider,
        })
        clientSingleton.current = new ClientStateMachine(zionClient)
    }

    logServerUrlMismatch(opts, clientSingleton)

    useEffect(() => {
        const stateMachine = clientSingleton.current
        if (!stateMachine) {
            return
        }

        const onStateMachineUpdated = (state: States) => {
            setCasablancaClient(state.casablancaClient)
            setCasablancaLoginStatus(state.loginStatus)
        }

        const onClearCredentials = (oldCredendials: CasablancaCredentials) => {
            clearCasablancaCredentials(opts.casablancaServerUrl ?? '', oldCredendials)
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
        opts.casablancaServerUrl,
        setCasablancaClient,
        setCasablancaLoginStatus,
        clearCasablancaCredentials,
        setCasablancaLoginError,
    ])

    return {
        client: casablancaClient ? clientSingleton.current.client : undefined,
        clientSingleton: clientSingleton.current.client,
        casablancaClient,
    }
}

class LoggedIn {
    readonly loginStatus = LoginStatus.LoggedIn
    constructor(
        readonly credentials: CasablancaCredentials,
        readonly casablancaClient: CasablancaClient,
    ) {}
}

class LoggedOut {
    readonly loginStatus = LoginStatus.LoggedOut
    readonly credentials = undefined
    readonly casablancaClient = undefined
}

class LoggingIn {
    readonly loginStatus = LoginStatus.LoggingIn
    readonly casablancaClient = undefined
    constructor(readonly credentials: CasablancaCredentials) {}
}

class LoggingOut {
    readonly loginStatus = LoginStatus.LoggingOut
    readonly credentials = undefined
    constructor(readonly casablancaClient: CasablancaClient) {}
}

type Next = { credentials?: CasablancaCredentials }
type Transitions = LoggingIn | LoggingOut
type Situations = LoggedIn | LoggedOut
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
    client: ZionClient
    private next: Next = {}

    constructor(client: ZionClient) {
        super()
        this.client = client
    }

    update(nextCredentials?: CasablancaCredentials) {
        this.next = { credentials: nextCredentials }
        void this.tick()
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
            case LoginStatus.LoggingIn: {
                check(currentSituation instanceof LoggedOut)
                this.emit('onErrorUpdated', undefined)
                const { credentials } = transition
                const pk = credentials.privateKey.slice(2)
                try {
                    const context: SignerContext = {
                        signerPrivateKey: () => pk,
                        creatorAddress: bin_fromHexString(credentials.creatorAddress),
                        delegateSig: credentials.delegateSig
                            ? bin_fromHexString(credentials.delegateSig)
                            : undefined,
                    }
                    const casablancaClient = await this.client.startCasablancaClient(context)
                    return new LoggedIn(credentials, casablancaClient)
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
            if (next.credentials !== current.credentials) {
                return new LoggingOut(current.casablancaClient)
            }
            break
        default:
            staticAssertNever(current)
    }
    return undefined
}

function logTick(client: ZionClient, situation: Situations, transition?: Transitions) {
    console.log('$$$ tick update', {
        client: client.name,
        current: situation.loginStatus,
        transition: transition?.loginStatus,
    })
}

function logServerUrlMismatch(
    opts: ZionOpts,
    clientSingleton: MutableRefObject<ClientStateMachine | undefined>,
) {
    if (opts.casablancaServerUrl !== clientSingleton.current?.client.opts.casablancaServerUrl) {
        // aellis there is an assumption in this code that the casablanca server url never changes
        // if it does change, we need to refresh the page to recreate the client
        console.error("$$$ use zion client listener: casablancaServerUrl doesn't match", {
            opts: opts.casablancaServerUrl,
            client: clientSingleton.current?.client.opts.casablancaServerUrl,
        })
    }
}
