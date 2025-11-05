import { useAccount, useConnect } from 'wagmi'
import { useEffect, useState } from 'react'
import { useAgentConnection } from '@towns-protocol/react-sdk'
import { useNavigate } from 'react-router-dom'
import { GitHubLogoIcon } from '@radix-ui/react-icons'
import { Book, ExternalLink } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { RiverEnvSwitcherContent } from '@/components/dialog/env-switcher'
import { Dialog } from '@/components/ui/dialog'
import { Block } from '@/components/ui/block'
import { TownsMinimal } from '@/components/towns-minimal'
import { TownsIcon } from '@/components/towns-icon'
import { cn } from '@/utils'

const isDev = import.meta.env.DEV

export const AuthRoute = () => {
    const [open, setOpen] = useState<{ state: boolean; from: 'wallet' | 'bearer' }>({
        state: false,
        from: 'wallet',
    })

    const { isAgentConnected } = useAgentConnection()
    const navigate = useNavigate()
    useEffect(() => {
        if (isAgentConnected) {
            navigate('/')
        }
    }, [isAgentConnected, navigate])

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Main Content */}
            <div className={cn('mx-auto max-w-3xl space-y-6 text-center', isDev && 'max-w-4xl')}>
                <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
                    Welcome to Towns Playground
                </h1>
                <p className="text-lg text-muted-foreground">
                    An interactive environment for testing and experimenting with{' '}
                    <a
                        href="https://towns.com"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center font-semibold underline-offset-4 hover:underline"
                    >
                        Towns Protocol
                        <TownsMinimal className="ml-2 size-4" />
                    </a>
                </p>

                {/* Quick Links */}
                <div
                    className={cn(
                        'my-12 grid grid-cols-1 gap-4 md:grid-cols-2',
                        isDev && 'md:grid-cols-3',
                    )}
                >
                    <Block
                        variant="primary"
                        className="flex flex-col justify-between p-6 transition-shadow hover:shadow-md"
                    >
                        <div className="space-y-4">
                            <GitHubLogoIcon className="mx-auto h-8 w-8" />
                            <h2 className="text-xl font-semibold">Open Source</h2>
                            <p className="text-sm text-muted-foreground">
                                View the source code on GitHub and contribute to the project
                            </p>
                        </div>
                        <a
                            className={buttonVariants({
                                variant: 'outline',
                                className: 'mt-4 w-full',
                            })}
                            href="https://github.com/towns-protocol/towns/tree/main/packages/playground"
                            target="_blank"
                            rel="noreferrer"
                        >
                            View Repository <ExternalLink className="ml-2 size-4" />
                        </a>
                    </Block>
                    {isDev && (
                        <Block
                            variant="primary"
                            className="flex flex-col justify-between p-6 transition-shadow hover:shadow-md"
                        >
                            <div className="space-y-4">
                                <TownsIcon className="mx-auto h-8 w-8" />
                                <h2 className="text-xl font-semibold">Community</h2>
                                <p className="text-sm text-muted-foreground">
                                    Join our official Developer Town for support
                                </p>
                            </div>
                            <a
                                className={buttonVariants({
                                    variant: 'outline',
                                    className: 'mt-4 w-full',
                                })}
                                href="https://app.towns.com/t/0xb089fc1acdea8b1da28463a2272d6fd3fe66a75b/"
                                target="_blank"
                                rel="noreferrer"
                            >
                                Join Community <ExternalLink className="ml-2 size-4" />
                            </a>
                        </Block>
                    )}
                    <Block
                        variant="primary"
                        className="flex flex-col justify-between p-6 transition-shadow hover:shadow-md"
                    >
                        <div className="space-y-4">
                            <Book className="mx-auto h-8 w-8" />
                            <h2 className="text-xl font-semibold">Documentation</h2>
                            <p className="text-sm text-muted-foreground">
                                Learn how to use Towns Protocol with our comprehensive docs
                            </p>
                        </div>
                        <a
                            className={buttonVariants({
                                variant: 'outline',
                                className: 'mt-4 w-full',
                            })}
                            href="https://docs.towns.com"
                            target="_blank"
                            rel="noreferrer"
                        >
                            Read Docs <ExternalLink className="ml-2 size-4" />
                        </a>
                    </Block>
                </div>

                {/* Auth Options */}
                <div className="flex flex-col gap-4">
                    <p className="text-muted-foreground">
                        Choose your preferred method to get started below.
                    </p>

                    <div className="mx-auto w-full max-w-lg space-y-4">
                        <div className="space-y-2">
                            <Button
                                variant="outline"
                                className="w-full max-w-sm"
                                onClick={() => setOpen({ state: true, from: 'bearer' })}
                            >
                                Connect using bearer token
                            </Button>
                            <p className="text-sm text-muted-foreground">
                                Type{' '}
                                <code className="rounded-md bg-muted px-1 font-mono text-foreground">
                                    /bearer-token
                                </code>{' '}
                                in any{' '}
                                <a
                                    href="https://app.towns.com"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-semibold underline-offset-4 hover:underline"
                                >
                                    Towns
                                </a>{' '}
                                chat to export your bearer token.
                            </p>
                        </div>
                        <hr className="mx-auto w-full max-w-sm" />
                        <div className="space-y-2">
                            <Dialog
                                open={open.state}
                                onOpenChange={(open) =>
                                    setOpen((prev) => ({ ...prev, state: open }))
                                }
                            >
                                <RiverEnvSwitcherContent
                                    allowBearerToken={open.from === 'bearer'}
                                    onClose={() => setOpen((prev) => ({ ...prev, state: false }))}
                                />
                            </Dialog>
                            <ChainConnectButton
                                className="w-full max-w-sm"
                                onWalletConnect={() => setOpen({ state: true, from: 'wallet' })}
                            />
                            <p className="text-sm text-muted-foreground">
                                Use your existing wallet to connect to the network.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

const ChainConnectButton = (props: { onWalletConnect: () => void; className?: string }) => {
    const { connector: activeConnector } = useAccount()
    const { connectors, connect, error, isPending } = useConnect({
        mutation: {
            onSuccess: props.onWalletConnect,
        },
    })

    return (
        <div className="space-y-1.5">
            {connectors.map((connector) => (
                <Button
                    className={props.className}
                    key={connector.id}
                    onClick={() => {
                        if (activeConnector?.id === connector.id) {
                            props.onWalletConnect()
                        } else {
                            connect({ connector })
                        }
                    }}
                >
                    {activeConnector?.id === connector.id
                        ? `Continue with ${connector.name}`
                        : connector.name}
                    {isPending && ' (connecting)'}
                </Button>
            ))}
            {error && <div>{error.message}</div>}
        </div>
    )
}
