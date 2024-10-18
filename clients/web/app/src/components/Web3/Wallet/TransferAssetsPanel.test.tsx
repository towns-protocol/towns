import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
// eslint-disable-next-line no-restricted-imports
import * as Lib from 'use-towns-client'
import * as RouterDom from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { Wallet } from 'ethers'
import { makeSpaceStreamId } from '@river-build/sdk'
import { TestApp } from 'test/testUtils'
import { formatUnits, formatUnitsToFixedLength } from 'hooks/useBalance'
import { UseMockTransferAssetReturn, mockCreateTransactionWithSpy } from 'test/transactionHookMock'
import { NFT_METADATA_RESPONSE } from '../../../../mocks/token-contracts'
import { TransferAssetsPanel } from './TransferAssetsPanel'

const aaAddress = Wallet.createRandom().address
const linkedWallet = Wallet.createRandom().address
const spaceAddress = Wallet.createRandom().address
const spaceId = makeSpaceStreamId(spaceAddress)

vi.mock('privy/useCombinedAuth', async () => {
    const actual = (await vi.importActual(
        'privy/useCombinedAuth',
    )) as typeof import('privy/useCombinedAuth')

    return {
        ...actual,
        useCombinedAuth: () => ({
            register: () => Promise.resolve(),
            loggedInWalletAddress: aaAddress,
            isConnected: true,
        }),
    }
})

const mockUseSearchParams = vi.fn()
vi.mock('react-router-dom', async () => {
    const actual = (await vi.importActual('react-router-dom')) as typeof RouterDom
    return {
        ...actual,
        useSearchParams: () => mockUseSearchParams(),
    }
})

const mockBalances = {
    [aaAddress]: {
        formatted: formatUnitsToFixedLength(BigInt(100), 18, 5),
        symbol: 'ETH',
        decimals: 18,
        value: BigInt(100),
    },
    [linkedWallet]: {
        formatted: formatUnitsToFixedLength(BigInt(200), 18, 5),
        symbol: 'ETH',
        decimals: 18,
        value: BigInt(200),
    },
    [spaceAddress]: {
        formatted: formatUnitsToFixedLength(BigInt(300), 18, 5),
        symbol: 'ETH',
        decimals: 18,
        value: BigInt(300),
    },
    zero: {
        formatted: formatUnitsToFixedLength(BigInt(0), 18, 5),
        symbol: 'ETH',
        decimals: 18,
        value: BigInt(0),
    },
}

const mockUseBalance = vi.fn()
vi.mock('hooks/useBalance', async () => {
    const actual = await vi.importActual('hooks/useBalance')
    return {
        ...actual,
        useBalance: ({ address }: { address: string }) => {
            return {
                data: mockUseBalance(address),
                isLoading: false,
            }
        },
    }
})

vi.mock('hooks/useSpaceInfoFromPathname', () => {
    return {
        useSpaceIdFromPathname: () => spaceId,
    }
})

vi.mock('use-towns-client', async () => {
    const actual = (await vi.importActual('use-towns-client')) as typeof Lib
    return {
        ...actual,
        useTownsContext: () => {
            return {
                ...actual.useTownsContext(),
                clientSingleton: {
                    userOps: {
                        getAbstractAccountAddress: () => aaAddress,
                    },
                },
            }
        },
        useMyUserId: () => aaAddress,
        useLinkedWallets: () => {
            const _actual = actual.useLinkedWallets()
            return {
                ..._actual,
                data: [linkedWallet],
                isLoading: false,
            }
        },
    }
})

const Wrapper = () => {
    return (
        <TestApp>
            <Lib.SpaceContextProvider spaceId={spaceId}>
                <TransferAssetsPanel />
            </Lib.SpaceContextProvider>
        </TestApp>
    )
}

const waitForTransferAssetsPanel = () => screen.findByTestId('transfer-assets-panel')
const waitForAssetSearch = () => screen.findByTestId('asset-search')
const waitForLinkedWalletSearch = () => screen.findByTestId('linked-wallet-search')
const waitForAssetOptionEth = () => screen.findByTestId('asset-option-eth')
const waitForAssetOptionNft = () =>
    screen.findByTestId(`asset-option-${NFT_METADATA_RESPONSE[0].data.collections[0].address}`)
const waitForLinkedWalletOption = () => screen.findByTestId(`linked-wallet-option-${linkedWallet}`)
const waitForAssetToTransfer = () => screen.findByTestId('asset-to-transfer')
const waitForEthAmount = () => screen.findByTestId('eth-amount')
const waitForSelectedWallet = () => screen.findByTestId('selected-wallet')

const sourceAAWalletParam = new URLSearchParams(`assetSource=${aaAddress}`)
const sourceSpaceAddressParam = new URLSearchParams(`assetSource=${spaceAddress}`)

const { createTransactionSpy: transferAssetSpy, useMockedCreateTransaction } =
    mockCreateTransactionWithSpy('transferAsset')

const useMockedTransferAssetTransaction = (
    ...args: (typeof Lib.useTransferAssetTransaction)['arguments']
) => useMockedCreateTransaction(...args) as UseMockTransferAssetReturn

beforeEach(() => {
    transferAssetSpy.mockClear()
})

describe('TransferAssetsPanel', () => {
    test('should render panel when wallet is AA', async () => {
        mockUseSearchParams.mockReturnValue([sourceAAWalletParam, vi.fn()])
        render(<Wrapper />)
        await waitForTransferAssetsPanel()
        await waitForAssetSearch()
        await waitForLinkedWalletSearch()
    })

    test('should render ETH option and any tokens in wallet', async () => {
        mockUseSearchParams.mockReturnValue([sourceAAWalletParam, vi.fn()])
        render(<Wrapper />)
        const assetSearch = await waitForAssetSearch()
        const input = within(assetSearch).getByPlaceholderText('Search Assets')
        await userEvent.click(input)
        await waitFor(() => expect(input).toHaveFocus())
        await waitForAssetOptionEth()
        await waitForAssetOptionNft()
    })

    test('should render linked wallets with option for linking new wallet', async () => {
        mockUseSearchParams.mockReturnValue([sourceAAWalletParam, vi.fn()])
        render(<Wrapper />)
        const linkedWalletSearch = await waitForLinkedWalletSearch()
        const input = within(linkedWalletSearch).getByPlaceholderText(/linked wallet or enter/gi)
        await userEvent.click(input)
        await waitForLinkedWalletOption()
        expect(within(linkedWalletSearch).getByText('Link Wallet')).toBeInTheDocument()
    })

    test('should render single selection of ETH', async () => {
        mockUseSearchParams.mockReturnValue([sourceAAWalletParam, vi.fn()])
        render(<Wrapper />)
        const assetSearch = await waitForAssetSearch()
        const input = within(assetSearch).getByPlaceholderText('Search Assets')
        await userEvent.click(input)
        const ethOption = await waitForAssetOptionEth()
        await userEvent.click(ethOption)
        const assetToTransfer = await waitForAssetToTransfer()
        await waitForEthAmount()
        const removeButton = within(assetToTransfer).getByTestId('remove-asset')
        await userEvent.click(removeButton)
        await waitFor(() =>
            expect(screen.queryByTestId('asset-to-transfer')).not.toBeInTheDocument(),
        )
        await waitFor(() => expect(screen.queryByTestId('eth-amount')).not.toBeInTheDocument())
        await waitForAssetSearch()
    })

    test('should render single selection of NFT', async () => {
        mockUseSearchParams.mockReturnValue([sourceAAWalletParam, vi.fn()])
        render(<Wrapper />)
        const assetSearch = await waitForAssetSearch()
        const input = within(assetSearch).getByPlaceholderText('Search Assets')
        await userEvent.click(input)
        const nftOption = await waitForAssetOptionNft()
        await userEvent.click(nftOption)
        const assetToTransfer = await waitForAssetToTransfer()
        await waitFor(() => expect(screen.queryByTestId('eth-amount')).not.toBeInTheDocument())
        const removeButton = within(assetToTransfer).getByTestId('remove-asset')
        await userEvent.click(removeButton)
        await waitFor(() =>
            expect(screen.queryByTestId('asset-to-transfer')).not.toBeInTheDocument(),
        )
        await waitForAssetSearch()
    })

    test('should render single selection of wallet', async () => {
        mockUseSearchParams.mockReturnValue([sourceAAWalletParam, vi.fn()])
        render(<Wrapper />)
        const linkedWalletSearch = await waitForLinkedWalletSearch()
        const input = within(linkedWalletSearch).getByPlaceholderText(/linked wallet or enter/gi)
        await userEvent.click(input)
        const walletOption = await waitForLinkedWalletOption()
        await userEvent.click(walletOption)
        const selectedWallet = await waitForSelectedWallet()
        const removeButton = within(selectedWallet).getByTestId('wallet-with-balance-remove-wallet')
        await userEvent.click(removeButton)
        await waitFor(() => expect(screen.queryByTestId('selected-wallet')).not.toBeInTheDocument())
        await waitForLinkedWalletSearch()
    })

    test('max button should set eth amount to balance', async () => {
        mockUseSearchParams.mockReturnValue([sourceAAWalletParam, vi.fn()])
        mockUseBalance.mockReturnValue(mockBalances[aaAddress])
        render(<Wrapper />)
        const assetSearch = await waitForAssetSearch()
        const input = within(assetSearch).getByPlaceholderText('Search Assets')
        await userEvent.click(input)
        const ethOption = await waitForAssetOptionEth()
        await userEvent.click(ethOption)
        const ethAmount = await waitForEthAmount()
        const maxButton = screen.getByTestId('max-button')
        await userEvent.click(maxButton)
        await waitFor(() =>
            expect(ethAmount).toHaveValue(formatUnits(mockBalances[aaAddress].value)),
        )
    })

    test('should render text field with max amount when treasury transfer', async () => {
        mockUseSearchParams.mockReturnValue([sourceSpaceAddressParam, vi.fn()])
        mockUseBalance.mockReturnValue(mockBalances[spaceAddress])
        render(<Wrapper />)
        const linkedWalletSearch = await waitForLinkedWalletSearch()
        within(linkedWalletSearch).getByPlaceholderText(/linked wallet or enter/gi)
        const ethAmount = await waitForEthAmount()
        expect(ethAmount).toHaveValue(formatUnits(mockBalances[spaceAddress].value))
    })

    test('should not render field if no balance when treasury transfer', async () => {
        mockUseSearchParams.mockReturnValue([sourceSpaceAddressParam, vi.fn()])
        mockUseBalance.mockReturnValue(mockBalances['zero'])
        render(<Wrapper />)
        expect(screen.queryByTestId('eth-amount')).not.toBeInTheDocument()
        expect(screen.getByTestId('treasury-empty')).toBeInTheDocument()
    })

    test('should submit correct args for ETH transfer', async () => {
        mockUseSearchParams.mockReturnValue([sourceAAWalletParam, vi.fn()])
        mockUseBalance.mockReturnValue(mockBalances[aaAddress])

        vi.spyOn(Lib, 'useTransferAssetTransaction').mockImplementation(
            useMockedTransferAssetTransaction,
        )
        render(<Wrapper />)
        const assetSearch = await waitForAssetSearch()
        const assetsInput = within(assetSearch).getByPlaceholderText('Search Assets')
        await userEvent.click(assetsInput)
        const ethOption = await waitForAssetOptionEth()
        await userEvent.click(ethOption)
        const ethAmount = await waitForEthAmount()
        const maxButton = screen.getByTestId('max-button')
        await userEvent.click(maxButton)
        await waitFor(() =>
            expect(ethAmount).toHaveValue(formatUnits(mockBalances[aaAddress].value)),
        )

        const linkedWalletSearch = await waitForLinkedWalletSearch()
        const input = within(linkedWalletSearch).getByPlaceholderText(/linked wallet or enter/gi)
        expect(input).toBeInTheDocument()
        await userEvent.click(input)
        const walletOption = await waitForLinkedWalletOption()
        await userEvent.click(walletOption)
        await waitForSelectedWallet()
        const submitButton = await screen.findByTestId('submit-button')
        await waitFor(() => expect(submitButton).toBeEnabled())
        await userEvent.click(submitButton)
        expect(transferAssetSpy).toHaveBeenCalledWith(
            {
                assetLabel: 'Base ETH',
                recipient: linkedWallet,
                value: 100n,
            },
            {},
        )
    })

    test('should submit correct args for NFT transfer', async () => {
        mockUseSearchParams.mockReturnValue([sourceAAWalletParam, vi.fn()])
        mockUseBalance.mockReturnValue(mockBalances[aaAddress])

        vi.spyOn(Lib, 'useTransferAssetTransaction').mockImplementation(
            useMockedTransferAssetTransaction,
        )
        render(<Wrapper />)
        const assetSearch = await waitForAssetSearch()
        const assetInput = within(assetSearch).getByPlaceholderText('Search Assets')
        await userEvent.click(assetInput)
        const nftOption = await waitForAssetOptionNft()
        await userEvent.click(nftOption)
        await waitForAssetToTransfer()
        await waitFor(() => expect(screen.queryByTestId('eth-amount')).not.toBeInTheDocument())

        const linkedWalletSearch = await waitForLinkedWalletSearch()
        const walletInput =
            within(linkedWalletSearch).getByPlaceholderText(/linked wallet or enter/gi)
        expect(walletInput).toBeInTheDocument()
        await userEvent.click(walletInput)
        const walletOption = await waitForLinkedWalletOption()
        await userEvent.click(walletOption)
        await waitForSelectedWallet()
        const submitButton = await screen.findByTestId('submit-button')
        await waitFor(() => expect(submitButton).toBeEnabled())
        await userEvent.click(submitButton)
        expect(transferAssetSpy).toHaveBeenCalledWith(
            {
                assetLabel: NFT_METADATA_RESPONSE[0].data.collections[0].address,
                contractAddress: NFT_METADATA_RESPONSE[0].data.collections[0].address,
                recipient: linkedWallet,
                tokenId: NFT_METADATA_RESPONSE[0].data.collections[0].displayNft.tokenId,
            },
            {},
        )
    })

    test('should submit correct args for treasury transfer', async () => {
        mockUseSearchParams.mockReturnValue([sourceSpaceAddressParam, vi.fn()])
        mockUseBalance.mockReturnValue(mockBalances[spaceAddress])

        vi.spyOn(Lib, 'useTransferAssetTransaction').mockImplementation(
            useMockedTransferAssetTransaction,
        )
        render(<Wrapper />)
        const ethAmount = await waitForEthAmount()
        expect(ethAmount).toHaveValue(formatUnits(mockBalances[spaceAddress].value))
        const linkedWalletSearch = await waitForLinkedWalletSearch()
        const input = within(linkedWalletSearch).getByPlaceholderText(/linked wallet or enter/gi)

        expect(input).toBeInTheDocument()
        await userEvent.click(input)
        const walletOption = await waitForLinkedWalletOption()
        await userEvent.click(walletOption)
        await waitForSelectedWallet()
        const submitButton = await screen.findByTestId('submit-button')
        await waitFor(() => expect(submitButton).toBeEnabled())
        await userEvent.click(submitButton)
        expect(transferAssetSpy).toHaveBeenCalledWith(
            {
                assetLabel: 'Base ETH',
                recipient: linkedWallet,
                spaceAddress: spaceAddress,
            },
            {},
        )
    })
})
