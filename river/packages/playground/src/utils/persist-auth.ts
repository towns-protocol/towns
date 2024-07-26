import type { RiverConfig, SignerContext } from '@river-build/sdk'
import superjson from 'superjson'

export const storeAuth = (signerContext: SignerContext, riverConfig: RiverConfig) => {
    const fixedContext = {
        ...signerContext,
        signerPrivateKey: signerContext.signerPrivateKey(),
    }
    const signerContextString = superjson.stringify(fixedContext)
    const riverConfigString = superjson.stringify(riverConfig)
    window.localStorage.setItem('river-signer', signerContextString)
    window.localStorage.setItem('river-last-config', riverConfigString)
}

export const loadAuth = () => {
    const signerContextString = window.localStorage.getItem('river-signer')
    const riverConfigString = window.localStorage.getItem('river-last-config')
    if (!signerContextString || !riverConfigString) {
        return
    }
    const signerContext = superjson.parse<Record<string, string>>(signerContextString)
    const riverConfig = superjson.parse<RiverConfig>(riverConfigString)
    const fixedContext = {
        ...signerContext,
        signerPrivateKey: () => signerContext.signerPrivateKey,
    } as SignerContext
    return { signerContext: fixedContext, riverConfig }
}

export const deleteAuth = () => {
    window.localStorage.removeItem('river-signer')
    window.localStorage.removeItem('river-last-config')
}
