import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    useConnectivity,
    useHasPermission,
    useSpaceDapp,
    useSpaceDataWithId,
    useSpaceId,
    useTownsClient,
    useTownsContext,
} from 'use-towns-client'
import { ChannelMetadata, Permission } from '@towns-protocol/web3'
import { Button, Stack, Text } from '@ui'
import { GetSigner, WalletReady } from 'privy/WalletReady'

type ChannelWithRoles = ChannelMetadata & {
    roles: { roleId: number; permissions: Permission[] }[]
}

const missingChannelsQueryKey = (spaceId: string | undefined) => ['missingChannels', spaceId]

const useMissingChannels = (spaceId: string | undefined) => {
    const { baseProvider: provider, baseConfig: config } = useTownsContext()
    const spaceDapp = useSpaceDapp({ provider, config })
    const { client } = useTownsClient()
    const space = useSpaceDataWithId(spaceId)

    return useQuery({
        queryKey: missingChannelsQueryKey(spaceId),
        queryFn: async () => {
            if (!spaceDapp || !spaceId || !client?.spaceDapp) {
                return []
            }
            const contractChannels = await spaceDapp.getChannels(spaceId)
            const nodeChannels = space?.channelGroups.flatMap((group) => group.channels)
            const missingChannels = contractChannels.filter(
                (contractChannel) =>
                    !nodeChannels?.find(
                        (channel) => channel.id === contractChannel.channelNetworkId,
                    ),
            )

            const roles = await spaceDapp.getRoles(spaceId)
            const channelRolePromises = missingChannels.flatMap((channel) =>
                roles.map(async (role) => {
                    const permissions = await spaceDapp.getChannelPermissionOverrides(
                        spaceId,
                        role.roleId,
                        channel.channelNetworkId,
                    )
                    return {
                        channel,
                        roleData: {
                            roleId: role.roleId,
                            permissions,
                        },
                    }
                }),
            )
            const channelRoleResults = await Promise.all(channelRolePromises)
            const channelMap: Record<string, ChannelWithRoles> = {}
            for (const { channel, roleData } of channelRoleResults) {
                if (!channelMap[channel.channelNetworkId]) {
                    channelMap[channel.channelNetworkId] = {
                        ...channel,
                        roles: [],
                    }
                }
                channelMap[channel.channelNetworkId].roles.push(roleData)
            }
            const missingChannelsWithRoles = Object.values(channelMap)
            return missingChannelsWithRoles
        },
        enabled: !!spaceId && !!spaceDapp && !!client?.spaceDapp,
    })
}

const useRecreateChannels = (spaceId: string | undefined) => {
    const queryClient = useQueryClient()
    const { client } = useTownsClient()

    return useMutation({
        mutationFn: async ({
            channels,
            getSigner,
        }: {
            channels: ChannelWithRoles[]
            getSigner: GetSigner
        }) => {
            const signer = await getSigner()
            if (!client || !spaceId || !signer) {
                throw new Error('Missing required dependencies')
            }
            await Promise.all(
                channels.map(async (channel) => {
                    await client.createChannelWithId(
                        {
                            name: channel.name,
                            parentSpaceId: spaceId,
                            roles: channel.roles,
                            topic: channel.description,
                        },
                        channel.channelNetworkId,
                    )
                }),
            )
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: missingChannelsQueryKey(spaceId) })
        },
    })
}

export const ChannelDiscrepancyChecker = () => {
    const spaceId = useSpaceId()
    const { loggedInWalletAddress } = useConnectivity()

    const { hasPermission: canCreateChannels } = useHasPermission({
        spaceId,
        walletAddress: loggedInWalletAddress ?? '',
        permission: Permission.AddRemoveChannels,
    })

    const { data: missingChannels = [], isLoading: isLoadingMissingChannels } =
        useMissingChannels(spaceId)
    const { mutate: recreateChannels, isPending: isRecreatingChannels } =
        useRecreateChannels(spaceId)

    if (!canCreateChannels || missingChannels.length === 0) {
        return null
    }

    return (
        <Stack horizontal padding="md" background="level2" rounded="sm">
            <Stack gap="sm" justifyContent="spaceBetween" width="100%">
                <Text strong color="error">
                    Missing Channels Detected
                </Text>
                <Stack gap horizontal width="100%" alignItems="center">
                    <Text grow color="gray2">
                        {missingChannels.length} channel{missingChannels.length === 1 ? '' : 's'}{' '}
                        need
                        {missingChannels.length === 1 ? 's' : ''} to be recreated.
                    </Text>
                    <WalletReady>
                        {({ getSigner }) => (
                            <Button
                                tone="level3"
                                size="button_sm"
                                disabled={isLoadingMissingChannels || isRecreatingChannels}
                                onClick={() =>
                                    recreateChannels({ channels: missingChannels, getSigner })
                                }
                            >
                                {isRecreatingChannels
                                    ? 'Recreating Channels...'
                                    : 'Recreate Channels'}
                            </Button>
                        )}
                    </WalletReady>
                </Stack>
            </Stack>
        </Stack>
    )
}
