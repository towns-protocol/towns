/**
 * @group with-entitlements
 */

import { MembershipStruct, convertRuleDataV1ToV2, encodeRuleDataV2 } from '@river-build/web3'
import { setupWalletsAndContexts, everyoneMembershipStruct } from './util.test'

describe('Legacy Space Detection', () => {
    test('Detect Legacy Space', async () => {
        const { alice, aliceSpaceDapp, aliceProvider } = await setupWalletsAndContexts()
        const membership = await everyoneMembershipStruct(aliceSpaceDapp, alice)

        const transaction = await aliceSpaceDapp.createLegacySpace(
            {
                spaceName: 'legacy town',
                channelName: 'general',
                uri: 'https://legacy.town',
                membership,
            },
            aliceProvider.wallet,
        )
        const receipt = await transaction.wait()
        expect(receipt.status).toEqual(1)
        const spaceAddress = aliceSpaceDapp.getSpaceAddress(receipt)
        expect(spaceAddress).toBeDefined()

        await expect(aliceSpaceDapp.isLegacySpace(spaceAddress!)).resolves.toBeTruthy()
    })

    test('Detect V2 space', async () => {
        const { alice, aliceSpaceDapp, aliceProvider } = await setupWalletsAndContexts()
        const legacyMembership = await everyoneMembershipStruct(aliceSpaceDapp, alice)
        const membership: MembershipStruct = {
            settings: legacyMembership.settings,
            permissions: legacyMembership.permissions,
            requirements: {
                everyone: true,
                syncEntitlements: false,
                users: [],
                ruleData: encodeRuleDataV2(
                    convertRuleDataV1ToV2(legacyMembership.requirements.ruleData),
                ),
            },
        }
        const transaction = await aliceSpaceDapp.createSpace(
            {
                spaceName: 'legacy town',
                channelName: 'general',
                uri: 'https://legacy.town',
                membership,
            },
            aliceProvider.wallet,
        )
        const receipt = await transaction.wait()
        expect(receipt.status).toEqual(1)
        const spaceAddress = aliceSpaceDapp.getSpaceAddress(receipt)
        expect(spaceAddress).toBeDefined()

        await expect(aliceSpaceDapp.isLegacySpace(spaceAddress!)).resolves.toBeFalsy()
    })
})
