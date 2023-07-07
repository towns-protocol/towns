import React, { Suspense } from 'react'
import { WelcomeLayout } from './layouts/WelcomeLayout'

const LoginComponent = React.lazy(() => import('@components/Login/LoginComponent'))

export const WelcomeRoute = () => (
    <WelcomeLayout>
        <Suspense>
            <LoginComponent />
        </Suspense>
    </WelcomeLayout>
)
