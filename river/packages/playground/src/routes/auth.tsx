import { useAccount, useConnect } from 'wagmi'
import { useEffect, useState } from 'react'
import { useAgentConnection } from '@river-build/react-sdk'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { RiverEnvSwitcherContent } from '@/components/dialog/env-switcher'
import { Dialog } from '@/components/ui/dialog'

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
        <div className="flex flex-col items-center gap-6">
            <div className="max-w-lg space-y-4">
                <h1 className="text-center text-2xl font-bold">Connect to River</h1>
                <p className="text-center text-sm  text-zinc-500">
                    You can use a bearer token, or connect straight to the network using your
                    wallet.
                </p>
            </div>
            <div className="flex w-full max-w-lg items-center justify-center gap-4">
                <Button variant="outline" onClick={() => setOpen({ state: true, from: 'bearer' })}>
                    Connect using bearer token
                </Button>
                <Dialog
                    open={open.state}
                    onOpenChange={(open) => setOpen((prev) => ({ ...prev, state: open }))}
                >
                    <RiverEnvSwitcherContent
                        allowBearerToken={open.from === 'bearer'}
                        onClose={() => setOpen((prev) => ({ ...prev, state: false }))}
                    />
                </Dialog>
                <ChainConnectButton
                    onWalletConnect={() => setOpen({ state: true, from: 'wallet' })}
                />
            </div>
        </div>
    )
}

const ChainConnectButton = (props: { onWalletConnect: () => void }) => {
    const { connector: activeConnector } = useAccount()
    const { connectors, connect, error, isLoading } = useConnect({
        onSuccess: props.onWalletConnect,
    })

    return (
        <div>
            {connectors.map((connector) => (
                <Button
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
