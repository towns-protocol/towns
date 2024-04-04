import { useSampleAppStore } from 'store/store'
import { ENVIRONMENTS } from 'utils/environment'

export function useEnvironment() {
    let _environment = useSampleAppStore().environment
    if (_environment && !ENVIRONMENTS.find((e) => e.id === _environment)) {
        _environment = ENVIRONMENTS.at(0)?.id
    }
    const environment = _environment || 'testnet'

    const environmentInfo = ENVIRONMENTS.find((e) => e.id === environment)
    if (!environmentInfo) {
        throw new Error(`Unknown environment: ${environment}`)
    }
    return environmentInfo
}
