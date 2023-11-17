import React, { Suspense } from 'react'
import { WelcomeLayout } from './layouts/WelcomeLayout'

const LoginComponent = React.lazy(() => import('@components/Login/LoginComponent'))

export const WelcomeRoute = () => (
    <WelcomeLayout debugText="welcome route">
        <Suspense>
            <LoginComponent />
        </Suspense>
    </WelcomeLayout>
)
