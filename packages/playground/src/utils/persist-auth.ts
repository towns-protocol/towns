import { type RiverConfig, type SignerContext, townsEnv } from '@towns-protocol/sdk'
import superjson from 'superjson'
import { VITE_ENV_OPTIONS } from './environment'

export const storeAuth = (signerContext: SignerContext, townsConfig: RiverConfig) => {
    const fixedContext = {
        ...signerContext,
        signerPrivateKey: signerContext.signerPrivateKey(),
    }
    const signerContextString = superjson.stringify(fixedContext)
    window.localStorage.setItem('river-signer', signerContextString)
    window.localStorage.setItem('river-last-env', townsConfig.environmentId)
}

export const loadAuth = () => {
    const signerContextString = window.localStorage.getItem('river-signer')
    const riverConfigString = window.localStorage.getItem('river-last-env')
    if (!signerContextString || !riverConfigString) {
        return undefined
    }
    if (
        townsEnv(VITE_ENV_OPTIONS)
            .getEnvironmentIds()
            .find((id) => id === riverConfigString) === undefined
    ) {
        return undefined
    }
    const signerContext = superjson.parse<Record<string, string>>(signerContextString)
    const fixedContext = {
        ...signerContext,
        signerPrivateKey: () => signerContext.signerPrivateKey,
    } as SignerContext
    return { signerContext: fixedContext, riverEnvironmentId: riverConfigString }
}

export const deleteAuth = () => {
    window.localStorage.removeItem('river-signer')
    window.localStorage.removeItem('river-last-env')
}
