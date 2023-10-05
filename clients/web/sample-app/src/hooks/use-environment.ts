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
    const chainId = environmentInfo.chainId
    const chainName = environmentInfo.chain.name
    const casablancaUrl = environmentInfo.casablancaUrl

    return {
        environment, // only defined if IS_DEV
        chainId,
        chainName,
        casablancaUrl,
    }
}
