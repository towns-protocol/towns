import React, { Suspense, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { PrivyWrapper } from 'privy/PrivyProvider'
import { useDevice } from 'hooks/useDevice'
import { WelcomeLayout } from './layouts/WelcomeLayout'

const LoginComponent = React.lazy(() => import('@components/Login/LoginComponent'))

export const WelcomeRoute = React.memo(() => {
    const { isTouch } = useDevice()
    const location = useLocation()

    useEffect(() => {
        console.warn('[Welcome][hnt-5685]', 'route', {
            deviceType: isTouch ? 'mobile' : 'desktop',
            locationPathname: location.pathname,
            locationSearch: location.search,
        })
    }, [isTouch, location.pathname, location.search])

    return (
        <PrivyWrapper>
            <WelcomeLayout debugText="welcome route">
                <Suspense>
                    <LoginComponent />
                </Suspense>
            </WelcomeLayout>
        </PrivyWrapper>
    )
})
