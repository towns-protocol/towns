import React, { Suspense, useCallback, useEffect } from 'react'
import { useLocation } from 'react-router-dom'

import { Analytics } from 'hooks/useAnalytics'
import { WelcomeLayout } from './layouts/WelcomeLayout'

const LoginComponent = React.lazy(() => import('@components/Login/LoginComponent'))

export const WelcomeRoute = React.memo(() => {
    const location = useLocation()

    useEffect(() => {
        Analytics.getInstance().page('home-page', 'welcome page', {}, () => {
            console.log('[analytics] welcome page')
        })
    }, [location.pathname, location.search])

    const onLoginClick = useCallback(() => {
        Analytics.getInstance().track('clicked login')
    }, [])

    return (
        <WelcomeLayout>
            <Suspense>
                <LoginComponent onLoginClick={onLoginClick} />
            </Suspense>
        </WelcomeLayout>
    )
})
