/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { MAXTRIX_ERROR, NoThrownError, getError, MatrixError } from './helpers/ErrorUtils'
import {
    createSpaceWithTokenEntitlement,
    registerAndStartClients,
    registerLoginAndStartClient,
} from 'use-zion-client/tests/integration/helpers/TestUtils'

import { Permission } from 'use-zion-client/src/client/web3/ZionContractTypes'
import { Room } from 'use-zion-client/src/types/matrix-types'
import { TestConstants } from './helpers/TestConstants'

/** 
 * Todo: permission feature development, skip this suite in our CI.
 * Enable this suite when these tickets are fixed:
 * a) https://linear.app/hnt-labs/issue/HNT-212/fix-all-integration-tests-that-fail-when-authorization-check-is
 * b) https://linear.app/hnt-labs/issue/HNT-213/figure-out-local-deployment-for-enabling-authorization-checks
 * c) https://linear.app/hnt-labs/issue/HNT-152/docker-compose-to-build-local-node-and-run-contract-dependent-tests
 *  
 * Steps will be simplified and scripted soon.
 * 
 * To run the test, uncomment //describe.only
 * 
 * On dendrite server, change the dendrite.yaml:
 *    public_key_authentication:
        ethereum:
            ...
            enable_authz: true
 * 
 * Add .env file to the local dendrite server project:
 * GOERLI_ENDPOINT="https://goerli.infura.io/v3/your_goerli_api_key"
 * LOCALHOST_ENDPOINT="http://127.0.0.1:8545"
 * 
 * */

describe.skip('permissions', () => {
    //describe.only('permissions', () => {
    jest.setTimeout(30 * 1000)

    test.skip('Read permission is granted', async () => {
        /** Arrange */

        // create all the users for the test
        const tokenGrantedUser = await registerLoginAndStartClient(
            'tokenGrantedUser',
            TestConstants.FUNDED_WALLET_0,
        )
        const { bob } = await registerAndStartClients(['bob'])
        await bob.fundWallet()

        // create a space with token entitlement
        const roomId = await createSpaceWithTokenEntitlement(bob, [Permission.Read])

        // invite users to join the space.
        if (roomId) {
            tokenGrantedUser.matrixUserId &&
                (await bob.inviteUser(roomId, tokenGrantedUser.matrixUserId))
        }

        /** Act */
        let actualJoin: Room | undefined
        if (roomId) {
            actualJoin = await tokenGrantedUser.joinRoom(roomId)
        }

        /** Assert */
        // can join the room if the user has Read permission.
        expect(actualJoin).toBeDefined()
    }) // end test

    test('Read permission is denied', async () => {
        /** Arrange */

        // create all the users for the test
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        await bob.fundWallet()

        // create a space with token entitlement
        const roomId = await createSpaceWithTokenEntitlement(bob, [Permission.Read])

        // invite users to join the space.
        if (roomId) {
            alice.matrixUserId && (await bob.inviteUser(roomId, alice.matrixUserId))
        }

        /** Act */
        const error = await getError<MatrixError>(async function () {
            if (roomId) {
                await alice.joinRoom(roomId)
            }
        })

        /** Assert */
        // check that the returned error wasn't that no error was thrown.
        // Failed due to this bug: https://linear.app/hnt-labs/issue/HNT-205/createspacewithtokenentitlement-should-not-add-the-everyone-role-by
        expect(error).not.toBeInstanceOf(NoThrownError)
        // Forbidden exception because the user does not have Read permission
        expect(error.data).toHaveProperty('errorcode', MAXTRIX_ERROR.M_FORBIDDEN)
    }) // end test
}) // end describe
