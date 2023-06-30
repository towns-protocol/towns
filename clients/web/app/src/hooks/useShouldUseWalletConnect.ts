import { isTouch } from './useDevice'

export function shouldUseWalletConnect() {
    return !window.ethereum && isTouch()
}
