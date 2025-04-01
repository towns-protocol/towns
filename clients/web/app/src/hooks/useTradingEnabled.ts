import { env } from '../utils/environment'

export const useShowWallet = () => {
    return { showWallet: env.VITE_RIVER_ENV === 'omega' || env.DEV }
}

export const useIsTradingEnabledInCurrentSpace = () => {
    const isTradingEnabled = env.VITE_RIVER_ENV === 'omega'
    return { isTradingEnabled: isTradingEnabled || env.DEV }
}
