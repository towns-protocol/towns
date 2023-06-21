import { SpaceProtocol } from '../../src/client/ZionClientTypes'
import { SpaceData } from '../../src/types/zion-types'

export const mockSpaceData: SpaceData = {
    id: {
        protocol: SpaceProtocol.Matrix,
        slug: 'mockSpaceId',
        networkId: 'mockSpaceId',
    },
    name: 'Mock Space',
    avatarSrc: '',
    channelGroups: [
        {
            label: 'Mock Group',
            channels: [
                {
                    label: 'Mock Channel',
                    id: {
                        protocol: SpaceProtocol.Matrix,
                        slug: 'mockChannel1',
                        networkId: 'mockChannel1',
                    },
                },
            ],
        },
    ],
    membership: '',
    isLoadingChannels: false,
}

export const mockSpaceDataWith2Channels: SpaceData = {
    ...mockSpaceData,
    channelGroups: [
        {
            ...mockSpaceData.channelGroups[0],
            channels: [
                mockSpaceData.channelGroups[0].channels[0],
                {
                    label: 'Mock Channel 2',
                    id: {
                        protocol: SpaceProtocol.Matrix,
                        slug: 'mockChannel2',
                        networkId: 'mockChannel2',
                    },
                },
            ],
        },
    ],
}
