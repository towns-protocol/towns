import { BigNumber, BigNumberish, ethers } from 'ethers'

import { BasicRoleInfo, Permission } from '../types/ContractTypes'
import { SpaceDapp } from '../space-dapp/SpaceDapp'
import {
    IArchitectBase,
    IMembershipBase,
} from '../space-registrar/ICreateSpaceShim'

export async function getFilteredRolesFromSpace(
    spaceDapp: SpaceDapp,
    spaceNetworkId: string,
): Promise<BasicRoleInfo[]> {
    const spaceRoles = await spaceDapp.getRoles(spaceNetworkId)
    const filteredRoles: BasicRoleInfo[] = []
    // Filter out space roles which won't work when creating a channel
    for (const r of spaceRoles) {
        // Filter out roles which have no permissions & the Owner role
        if (r.name !== 'Owner') {
            filteredRoles.push(r)
        }
    }
    return filteredRoles
}

export function isRoleIdInArray(
    roleIds: BigNumber[] | readonly bigint[],
    roleId: BigNumberish | bigint,
): boolean {
    for (const r of roleIds as BigNumber[]) {
        if (r.eq(roleId)) {
            return true
        }
    }
    return false
}

/**
 * TODO: these are only used in tests, should move them to different file?
 */

function isMembershipStructV3(
    returnValue: IArchitectBase.MembershipStruct,
): returnValue is IArchitectBase.MembershipStruct {
    return typeof returnValue.settings.price === 'number'
}

type CreateMembershipStructArgs = {
    name: string
    permissions: Permission[]
    requirements: IArchitectBase.MembershipRequirementsStruct
} & Omit<
    IMembershipBase.MembershipStruct,
    | 'symbol'
    | 'price'
    | 'maxSupply'
    | 'duration'
    | 'currency'
    | 'feeRecipient'
    | 'freeAllocation'
    | 'pricingModule'
>
function _createMembershipStruct({
    name,
    permissions,
    requirements,
}: CreateMembershipStructArgs): IArchitectBase.MembershipStruct {
    return {
        settings: {
            name,
            symbol: 'MEMBER',
            price: 0,
            maxSupply: 1000,
            duration: 0,
            currency: ethers.constants.AddressZero,
            feeRecipient: ethers.constants.AddressZero,
            freeAllocation: 0,
            pricingModule: ethers.constants.AddressZero,
        },
        permissions,
        requirements,
    }
}

export function createMembershipStruct(args: CreateMembershipStructArgs) {
    const result = _createMembershipStruct(args)
    if (isMembershipStructV3(result)) {
        return result
    } else {
        throw new Error("createMembershipStruct: version is not 'v3'")
    }
}
