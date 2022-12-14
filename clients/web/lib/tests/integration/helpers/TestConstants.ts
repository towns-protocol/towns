/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { ethers } from 'ethers'
import { waitForOptions } from '@testing-library/react'

interface WorkThreadInfo {
    workerId: number
    walletIndex: number
}

export class TestConstants {
    // Private keys to use for the test wallet
    // number of private keys for wallet with nft must be == number of private keys for wallet without nft
    private static privateKeysForWalletWithNft = [
        '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', // anvil account 0
        '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d', // anvil account 1
        '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a', // anvil account 2
        '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6', // anvil account 3
        '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a', // anvil account 4
    ]
    private static privateKeysForWalletWithoutNft = [
        '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba', // anvil account 5
        '0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e', // anvil account 6
        '0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356', // anvil account 7
        '0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97', // anvil account 8
        '0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6', // anvil account 9
    ]
    private static workerThreadInfo: WorkThreadInfo
    private static fundedWalletsWithNft: ethers.Wallet[] = []
    private static fundedWalletsWithoutNft: ethers.Wallet[] = []

    public static DefaultWaitForTimeout: waitForOptions = { timeout: 5000 }

    public static init() {
        const network = process.env.ETHERS_NETWORK!
        const provider = new ethers.providers.JsonRpcProvider(network)
        for (const privateKey of this.privateKeysForWalletWithNft) {
            const wallet = new ethers.Wallet(privateKey, provider)
            this.fundedWalletsWithNft.push(wallet)
        }
        for (const privateKey of this.privateKeysForWalletWithoutNft) {
            const wallet = new ethers.Wallet(privateKey, provider)
            this.fundedWalletsWithoutNft.push(wallet)
        }
        this.workerThreadInfo = this.initWorkerThreadInfo()
    }

    public static getWalletWithNft(): ethers.Wallet {
        return this.fundedWalletsWithNft[this.workerThreadInfo.walletIndex]
    }

    public static getWalletWithoutNft(): ethers.Wallet {
        return this.fundedWalletsWithoutNft[this.workerThreadInfo.walletIndex]
    }

    private static initWorkerThreadInfo(): WorkThreadInfo {
        const envJestWorkerId = process.env.JEST_WORKER_ID ?? '1'
        const workerId = parseInt(envJestWorkerId)
        const maxWorkers = this.fundedWalletsWithNft.length
        const walletIndex = (workerId - 1) % maxWorkers
        return {
            workerId,
            walletIndex,
        }
    }
}
