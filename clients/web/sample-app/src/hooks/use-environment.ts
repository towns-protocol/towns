import { useSampleAppStore } from 'store/store'
import { ENVIRONMENTS, TownsEnvironment } from 'utils/environment'

export function useEnvironment() {
    let _environment = useSampleAppStore().environment
    if (_environment && !Object.values(TownsEnvironment).includes(_environment)) {
        _environment = TownsEnvironment.Local
    }
    const environment = _environment || TownsEnvironment.Local

    const environmentInfo = ENVIRONMENTS.find((e) => e.id === environment)
    if (!environmentInfo) {
        throw new Error(`Unknown environment: ${environment}`)
    }
    const chain = environmentInfo.chain
    const chainName = environmentInfo.chain.name
    const casablancaUrl = environmentInfo.casablancaUrl
    const riverChain = environmentInfo.riverChain

    return {
        environment, // only defined if IS_DEV
        chain,
        chainId: chain.id,
        chainName,
        casablancaUrl,
        riverChain,
    }
}
