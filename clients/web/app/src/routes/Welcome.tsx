import React, { Suspense, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { PrivyWrapper } from 'privy/PrivyProvider'
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

    return (
        <PrivyWrapper>
            <WelcomeLayout>
                <Suspense>
                    <LoginComponent />
                </Suspense>
            </WelcomeLayout>
        </PrivyWrapper>
    )
})
