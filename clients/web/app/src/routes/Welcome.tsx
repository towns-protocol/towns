import React, { Suspense } from 'react'
import { PrivyWrapper } from 'privy/PrivyProvider'
import { WelcomeLayout } from './layouts/WelcomeLayout'

const LoginComponent = React.lazy(() => import('@components/Login/LoginComponent'))

export const WelcomeRoute = React.memo(() => (
    <PrivyWrapper>
        <WelcomeLayout debugText="welcome route">
            <Suspense>
                <LoginComponent />
            </Suspense>
        </WelcomeLayout>
    </PrivyWrapper>
))
