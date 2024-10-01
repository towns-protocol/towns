import { Address } from 'use-towns-client'

import { ethers } from 'ethers'

export const mockAddress = ethers.Wallet.createRandom().address as Address

export const validWalletAddresses: Address[] = Array.from({ length: 20 }, () => {
    const wallet = ethers.Wallet.createRandom()
    return wallet.address as Address
})

export const invalidWalletAddresses: string[] = [
    '0x123', // Too short
    '0x1234567890123456789012345678901234567890123', // Too long
    '0xG234567890123456789012345678901234567890', // Invalid character
    '0x123456789012345678901234567890123456789', // Too short
    '0x12345678901234567890123456789012345678901', // Too long
    '0xabcdefghijklmnopqrstuvwxyz1234567890abcd', // Invalid characters
    'not_an_address',
    '',
    '0x',
    '0x0',
    '0x00',
    '0x000',
    '0x0000',
    '0x00000',
    '0x000000',
    '0x0000000',
    '0x00000000',
    '0x000000000',
]

export const mockDuplicateWalletAddresses = [
    validWalletAddresses[0],
    validWalletAddresses[0],
    validWalletAddresses[0],
    validWalletAddresses[0],
    validWalletAddresses[0],
]

export const mockDuplicateWalletAddressesCsv = mockDuplicateWalletAddresses.join('\n')

export const mockWalletMembersCsv = validWalletAddresses.join('\n')

export const mockInvalidEthWalletAddressesCsv = [
    ...validWalletAddresses.slice(0, 18),
    ...invalidWalletAddresses,
].join('\n')
