/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { DataTypes } from '../../src/client/web3/shims/ZionSpaceManagerShim'
import { Permission } from '../../src/client/web3/ZionContractTypes'
import { RoomVisibility } from 'use-zion-client/src/types/matrix-types'
import { getContractsInfo } from '../../src/client/web3/ContractsInfo'
import {
    createBasicTestSpace,
    registerAndStartClients,
} from 'use-zion-client/tests/integration/helpers/TestUtils'

describe('spaceManagerContract', () => {
    // test: spaceContract
    test('create web3 space', async () => {
        // create clients
        const { bob } = await registerAndStartClients(['bob'])
        // put some money in bob's account
        await bob.fundWallet()
        // create a space

        const spaceName = bob.makeUniqueName()
        const roomId = await createBasicTestSpace(bob, {
            name: spaceName,
            visibility: RoomVisibility.Private,
        })
        // log our our transaction result.
        console.log('roomId', roomId)
        // fetch the spaces
        const spaces = await bob.spaceManager.getSpaces()
        // expect a lower case name for the space
        expect(spaces.find((s) => s.name === spaceName.toLowerCase())).toBeDefined()
    }) // end test
    test('create token-gated space', async () => {
        // create clients
        const { bob } = await registerAndStartClients(['bob'])
        // put some money in bob's account
        await bob.fundWallet()
        // create a space
        const spaceName = bob.makeUniqueName()
        const contractInfo = getContractsInfo(bob.chainId)
        const externalToken: DataTypes.ExternalTokenStruct = {
            contractAddress: contractInfo.council.address.councilnft,
            quantity: 1,
            isSingleToken: false,
            tokenId: 0,
        }
        const externalTokenEntitlement: DataTypes.ExternalTokenEntitlementStruct = {
            tokens: [externalToken],
        }
        const readPermission: DataTypes.PermissionStruct = { name: Permission.Read }
        const tokenEntitlement: DataTypes.CreateSpaceEntitlementDataStruct = {
            permissions: [readPermission],
            roleName: 'Member',
            externalTokenEntitlements: [externalTokenEntitlement],
            users: [],
        }
        const everyonePermissions: DataTypes.PermissionStruct[] = []
        const roomId = await bob.createSpace(
            {
                name: spaceName,
                visibility: RoomVisibility.Private,
            },
            tokenEntitlement,
            everyonePermissions,
        )
        // log our our transaction result.
        console.log('roomId', roomId)
        // fetch the spaces
        const spaces = await bob.spaceManager.getSpaces()
        // expect a lower case name for the space
        expect(spaces.find((s) => s.name === spaceName.toLowerCase())).toBeDefined()
    })
}) // end describe
