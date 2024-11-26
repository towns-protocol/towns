import { useAccount, useConnect } from 'wagmi'
import { useEffect, useState } from 'react'
import { useAgentConnection } from '@river-build/react-sdk'
import { useNavigate } from 'react-router-dom'
import { GitHubLogoIcon } from '@radix-ui/react-icons'
import { Book, ExternalLink } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { RiverEnvSwitcherContent } from '@/components/dialog/env-switcher'
import { Dialog } from '@/components/ui/dialog'
import { Block } from '@/components/ui/block'
import { RiverBeaver } from '@/components/river-beaver'

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
            <div className="mx-auto max-w-3xl space-y-6 text-center">
                <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
                    Welcome to River Playground
                </h1>
                <p className="text-lg text-muted-foreground">
                    An interactive environment for testing and experimenting with{' '}
                    <a
                        href="https://river.build"
                        target="_blank"
                        className="inline-flex items-center font-semibold underline-offset-4 hover:underline"
                    >
                        River Protocol
                        <RiverBeaver className="ml-2 size-4" />
                    </a>
                </p>

                {/* Quick Links */}
                <div className="my-12 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Block variant="primary" className="p-6 transition-shadow hover:shadow-md">
                        <div className="space-y-4">
                            <GitHubLogoIcon className="mx-auto h-8 w-8" />
                            <h2 className="text-xl font-semibold">Open Source</h2>
                            <p className="text-sm text-muted-foreground">
                                View the source code on GitHub and contribute to the project
                            </p>
                            <a
                                className={buttonVariants({
                                    variant: 'outline',
                                    className: 'w-full',
                                })}
                                href="https://github.com/river-build/river/tree/main/packages/playground"
                                target="_blank"
                            >
                                View Repository <ExternalLink className="ml-2 size-4" />
                            </a>
                        </div>
                    </Block>
                    <Block variant="primary" className="p-6 transition-shadow hover:shadow-md">
                        <div className="space-y-4">
                            <Book className="mx-auto h-8 w-8" />
                            <h2 className="text-xl font-semibold">Documentation</h2>
                            <p className="text-sm text-muted-foreground">
                                Learn how to use River Protocol with our comprehensive docs
                            </p>
                            <a
                                className={buttonVariants({
                                    variant: 'outline',
                                    className: 'w-full',
                                })}
                                href="https://docs.river.build"
                                target="_blank"
                            >
                                Read Docs <ExternalLink className="ml-2 size-4" />
                            </a>
                        </div>
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
    const { connectors, connect, error, isLoading } = useConnect({
        onSuccess: props.onWalletConnect,
    })

    return (
        <div>
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
                    {isLoading && ' (connecting)'}
                </Button>
            ))}
            {error && <div>{error.message}</div>}
        </div>
    )
}
