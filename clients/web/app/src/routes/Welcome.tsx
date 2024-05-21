import React, { Suspense, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { PrivyWrapper } from 'privy/PrivyProvider'
import { useDevice } from 'hooks/useDevice'
import { useAnalytics } from 'hooks/useAnalytics'
import { WelcomeLayout } from './layouts/WelcomeLayout'

const LoginComponent = React.lazy(() => import('@components/Login/LoginComponent'))

export const WelcomeRoute = React.memo(() => {
    const { isTouch } = useDevice()
    const location = useLocation()
    const { analytics, anonymousId } = useAnalytics()

    useEffect(() => {
        analytics?.page(
            'home-page',
            'welcome page',
            {
                anonymousId,
            },
            () => {
                console.log('[analytics] no joined towns page')
            },
        )
    }, [analytics, anonymousId, location.pathname, location.search])

    useEffect(() => {
        console.warn('[Welcome][hnt-5685]', 'route', {
            deviceType: isTouch ? 'mobile' : 'desktop',
            locationPathname: location.pathname,
            locationSearch: location.search,
        })
    }, [isTouch, location.pathname, location.search])

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
