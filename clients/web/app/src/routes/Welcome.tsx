import React, { Suspense } from 'react'
import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'

import { TransitionLogo } from '@components/Logo/Logo'
import { FadeIn } from '@components/Transitions'
import { Button, Icon, Stack, Text } from '@ui'
import { PATHS } from 'routes'

const LoginComponent = React.lazy(() => import('@components/Login/LoginComponent'))

export const Welcome = () => (
    <WelcomeLayout>
        {!window.ethereum ? (
            <>
                <Text strong>You&apos;ll need to install a wallet to continue:</Text>
                <Stack gap="sm" width="100%">
                    <Button
                        onClick={() =>
                            window.open(
                                'https://metamask.io/download/',
                                '_blank',
                                'noopener,noreferrer',
                            )
                        }
                    >
                        <Icon type="metamask" />
                        Metamask
                    </Button>
                    <Button
                        onClick={() =>
                            window.open(
                                'https://www.coinbase.com/wallet',
                                '_blank',
                                'noopener,noreferrer',
                            )
                        }
                    >
                        <Icon type="coinbaseWallet" />
                        Coinbase
                    </Button>
                </Stack>
            </>
        ) : (
            <>
                <FadeIn delay>
                    <Text strong>Connect your wallet to continue</Text>
                </FadeIn>
                <Suspense>
                    <motion.div
                        initial={{
                            height: 0,
                            opacity: 0,
                        }}
                        animate={{ opacity: 1, height: 'auto' }}
                    >
                        <LoginComponent />
                    </motion.div>
                </Suspense>
            </>
        )}
    </WelcomeLayout>
)

// shared structure w/ LoadingScreen so logo position is consistent
export const WelcomeLayout = (props: { children?: React.ReactNode }) => (
    <Stack centerContent grow height="100%" gap="lg">
        <NavLink to={`/${PATHS.REGISTER}`}>
            <TransitionLogo />
        </NavLink>
        <FadeIn>
            <Stack centerContent minHeight="height_xl" gap="lg">
                {props.children}
            </Stack>
        </FadeIn>
    </Stack>
)
