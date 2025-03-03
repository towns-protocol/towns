export const TPRLMK = 'TPRLMK'

export function getPrivyLoginMethodFromLocalStorage() {
    try {
        const storedValue = localStorage.getItem(TPRLMK)
        if (storedValue) {
            return atob(storedValue)
        }

        // Fallback to findPrivyLoginMethod which returns non-base64 string
        return findPrivyLoginMethod()
    } catch (error) {
        console.error('TPRLMK decoding error:', error)
        return undefined
    }
}

export function setPrivyLoginMethodToLocalStorage(loginMethod: string) {
    try {
        localStorage.setItem(TPRLMK, btoa(loginMethod))
    } catch (error) {
        console.error('TPRLMK encoding error:', error)
    }
}

/**
 * This is a fallback hack to grab privy-set login method from local storage
 */
function findPrivyLoginMethod() {
    const regex = /^privy:\w+:recent-login-method$/

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!key) {
            continue
        }
        if (regex.test(key)) {
            return localStorage.getItem(key)
        }
    }
}
