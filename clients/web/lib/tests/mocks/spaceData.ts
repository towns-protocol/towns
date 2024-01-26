import { SpaceData } from '../../src/types/zion-types'

export const mockSpaceData: SpaceData = {
    id: 'mockSpaceId',
    name: 'Mock Space',
    avatarSrc: '',
    channelGroups: [
        {
            label: 'Mock Group',
            channels: [
                {
                    label: 'Mock Channel',
                    id: 'mockChannel1',
                },
            ],
        },
    ],
    membership: '',
    isLoadingChannels: false,
    isLoadingMemberships: false,
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
                    id: 'mockChannel2',
                },
            ],
        },
    ],
}
