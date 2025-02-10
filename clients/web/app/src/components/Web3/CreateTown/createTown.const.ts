import { DEFAULT_MEMBERSHIP_LIMIT } from '@components/SpaceSettingsPanel/defaultMembershipLimit'
import { CreateTownFormSchema } from './types'

const clientDefaultValues = {
    clientTownType: null,
    clientCanJoin: null,
    clientGateBy: null,
}

const gatingDefaultValues = {
    gatingType: 'everyone' as const,
    tokensGatedBy: [],
    usersGatedBy: [],
    ethBalanceGatedBy: '',
}

type DefaultFormValues = Omit<CreateTownFormSchema, 'spaceIconFile'>

export const createTownDefaultValues: DefaultFormValues = {
    slideNameAndIcon: {
        spaceName: '',
        spaceIconUrl: null,
        spaceIconFile: null,
    },
    slideMembership: {
        clientMembershipFee: null,
        membershipCost: '0',
        membershipLimit: DEFAULT_MEMBERSHIP_LIMIT,
    },
    ...clientDefaultValues,
    ...gatingDefaultValues,
}
