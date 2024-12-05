import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

/* 
Appending the no_universal_links url fragment prevents macOS/iOS apps from hijacking redirects via Universal Links. 
This ensures that the web app remains accessible during critical flows, like login, even when the native app is installed.
https://developer.apple.com/documentation/xcode/allowing-apps-and-websites-to-link-to-your-content/

see ./clients/web/app/public/.well-known/apple-app-site-association for the hijack rule counterpart
*/

export const usePrepareRedirect = () => {
    const navigate = useNavigate()
    const prepareRedirect = useCallback(() => {
        navigate(`${location.search}#no_universal_links`)
    }, [navigate])
    return { prepareRedirect }
}
