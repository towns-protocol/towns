/**
 * @group wallet-management-tests
 */

import { allAccounts, minimalBalance, senderAccount } from './loadconfig'
import { ethers } from 'ethers'
import { deposit, getBalance } from './walletManagement'
import { dlog } from '@river/mecholm'

const log = dlog('csb:test:walletManagement')
describe('walletManagementTest', () => {
    test('checkWalletBalanceAndDeposit', async () => {
        const minimalWeiValue = BigInt(Math.floor(minimalBalance * 1e18))
        const lowBalanceAccounts = []

        log(`Find accounts with low balance less than: ${minimalBalance} ETH`)
        for (const account of allAccounts) {
            const balanceBigint = await getBalance(account.address)
            if (balanceBigint < minimalWeiValue) {
                log(
                    `Account<${account.address}>`,
                    balanceBigint,
                    ethers.utils.formatEther(balanceBigint),
                )
                lowBalanceAccounts.push(account.address)
            }
        }

        log('Deposit funds to accounts with low balance')
        for (const address of lowBalanceAccounts) {
            try {
                await deposit(senderAccount, address, minimalBalance)
                await new Promise((resolve) => setTimeout(resolve, 3000))
            } catch (error) {
                log(`Error in depositing to ${address}:`, error)
            }
        }

        for (const account of allAccounts) {
            const balanceBigint = await getBalance(account.address)
            expect(balanceBigint >= minimalWeiValue).toBeTruthy()
        }
    })
})
