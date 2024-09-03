import { useAccount, useConnect } from 'wagmi'
import { useRiverConnection } from '@river-build/react-sdk'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ConnectionBlock } from '@/components/blocks/connection'
import { SpacesBlock } from '@/components/blocks/spaces'
import { type Env, RiverEnvSwitcher } from '@/components/dialog/env-switcher'
import { TimelineBlock } from '@/components/blocks/timeline'
import { ChannelsBlock } from '@/components/blocks/channels'
import { SpaceProvider } from '@/hooks/current-space'
import { ChannelProvider } from '@/hooks/current-channel'
import { MetadataBlock } from '@/components/blocks/metadata'
import { UserStatusBlock } from '@/components/blocks/user-status'

export const ConnectRoute = () => {
    const { isConnected: isWalletConnected } = useAccount()

    return (
        <div className="flex flex-col gap-6">
            {isWalletConnected ? <ConnectRiver /> : <ChainConnectButton />}
        </div>
    )
}

const ChainConnectButton = () => {
    const { connector: activeConnector } = useAccount()
    const { connectors, connect, error, isLoading } = useConnect()

    return (
        <div>
            {connectors.map((connector) => (
                <Button key={connector.id} onClick={() => connect({ connector })}>
                    {activeConnector?.id === connector.id
                        ? `Connected - ${connector.name}`
                        : connector.name}
                    {isLoading && ' (connecting)'}
                </Button>
            ))}
            {error && <div>{error.message}</div>}
        </div>
    )
}

const ConnectRiver = () => {
    const [envId, setEnv] = useState<Env['id']>('gamma')
    const { isConnected } = useRiverConnection()

    return (
        <>
            {isConnected ? (
                <>
                    <div className="flex items-center justify-between gap-2">
                        <h2 className="text-lg font-semibold">Connected to Sync Agent</h2>
                        <RiverEnvSwitcher currentEnv={envId} setEnv={setEnv} />
                    </div>
                    <ConnectedContent />
                </>
            ) : (
                <div className="max-w-lg">
                    <RiverEnvSwitcher currentEnv={envId} setEnv={setEnv} />
                </div>
            )}
        </>
    )
}

const ConnectedContent = () => {
    const [spaceId, setSpaceId] = useState<string>()
    const [channelId, setChannelId] = useState<string>()

    const changeSpace = (spaceId: string) => {
        setSpaceId(spaceId)
        setChannelId(undefined)
    }
    const changeChannel = (channelId: string) => setChannelId(channelId)

    return (
        <div className="grid grid-cols-4 gap-4">
            <div className="grid grid-cols-subgrid gap-2">
                <ConnectionBlock />
                <UserStatusBlock />
            </div>
            <SpacesBlock changeSpace={changeSpace} />
            <SpaceProvider spaceId={spaceId}>
                <ChannelsBlock changeChannel={changeChannel} />
                <ChannelProvider channelId={channelId}>
                    <MetadataBlock />
                    <div className="col-span-2">
                        <TimelineBlock />
                    </div>
                </ChannelProvider>
            </SpaceProvider>
        </div>
    )
}
