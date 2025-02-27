import React, { PropsWithChildren } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import userEvent from '@testing-library/user-event'
// eslint-disable-next-line no-restricted-imports
import * as Lib from 'use-towns-client'
import { Router } from 'react-router'
import { ethers } from 'ethers'
import { TestApp } from 'test/testUtils'
import { UseMockCreateSpaceReturn, mockCreateTransactionWithSpy } from 'test/transactionHookMock'
import { YEAR_MS } from 'data/constants'
import { parseUnits } from 'hooks/useBalance'
import { DEFAULT_MEMBERSHIP_LIMIT } from '@components/SpaceSettingsPanel/defaultMembershipLimit'
import { CreateTownForm, CreateTownFormRender } from './CreateTown'
import { GATING_ENABLED } from './createTown.schema'

const FREE_ALLOCATION_FOR_FREE_SPACE = 2 // in create form, for dev/testnet we make free allocation very low to easily test free allocation exceeded scenarios, so match that here

const Wrapper = (props: PropsWithChildren) => {
    return (
        <TestApp>
            <CreateTownFormRender>
                {(form) => (
                    <>
                        form:{JSON.stringify(form.getValues())}
                        formState:{JSON.stringify(form.formState)}
                        <CreateTownForm form={form} />
                    </>
                )}
            </CreateTownFormRender>
        </TestApp>
    )
}

describe('CreateTown', () => {
    afterAll(() => {
        vi.resetAllMocks()
    })

    it('should render', async () => {
        await actions.setup()
        expect(await screen.findByText('Town Name')).toBeInTheDocument()
    })

    it('should validate town name and image', async () => {
        const baseElement = await actions.setup()

        const nextButton = ui.getNextButton()
        await userEvent.click(nextButton)

        await waitFor(() => {
            expect(baseElement).toContainHTML('Town Name must have at least 2 characters')
        })

        await userEvent.type(screen.getByPlaceholderText('Town Name'), 'testtown')

        await waitFor(async () => {
            expect(await screen.findByText('Please upload an image.')).toBeInTheDocument()
        })

        await actions.uploadImage()
        await userEvent.click(nextButton)

        // show next slide
        expect(await screen.findByText('Town Type')).toBeInTheDocument()
    })

    it('should setup free town slides', async () => {
        await actions.setupFree()
        if (GATING_ENABLED) {
            expect(await screen.findByText('Who can join your town?')).toBeInTheDocument()
        } else {
            const createButton = await screen.findByTestId('create-town-button')
            expect(createButton).toBeEnabled()
        }
    })

    it('should setup paid town slides', async () => {
        await actions.setupPaid()
        expect(await screen.findByText('Membership Fees')).toBeInTheDocument()
    })

    it('should setup paid with fixed slides', async () => {
        await actions.setupPaidWithFixedFee(1.1)
        if (GATING_ENABLED) {
            expect(await screen.findByText('Who can join your town?')).toBeInTheDocument()
        } else {
            const createButton = await screen.findByTestId('create-town-button')
            expect(createButton).toBeEnabled()
        }
    })

    it('should setup paid with dynamic slides', async () => {
        await actions.setupPaidWithDynamicFee()
        if (GATING_ENABLED) {
            expect(await screen.findByText('Who can join your town?')).toBeInTheDocument()
        } else {
            const createButton = await screen.findByTestId('create-town-button')
            expect(createButton).toBeEnabled()
        }
    })

    it('should create a free town without gating', async () => {
        vi.spyOn(Lib, 'useCreateSpaceTransaction').mockImplementation(
            useMockedCreateSpaceTransaction,
        )

        await actions.setupFree()

        if (GATING_ENABLED) {
            const anyone = await screen.findByTestId('option-canjoin-anyone')
            await userEvent.click(anyone)
        }

        const createButton = await screen.findByTestId('create-town-button')
        expect(createButton).toBeEnabled()

        await userEvent.click(createButton)

        await waitFor(async () => {
            const expected = getCreateSpaceTransactionDefaultResult()
            return expect(createSpaceTransactionSpy).toHaveBeenCalledWith(
                { name: 'testtown' },
                {
                    ...expected,
                    requirements: {
                        ...expected.requirements,
                    },
                    settings: {
                        ...expected.settings,
                    },
                },
                {},
                expect.anything(),
            )
        })
    })

    it('should create a paid town with fixed fee', async () => {
        vi.spyOn(Lib, 'useCreateSpaceTransaction').mockImplementation(
            useMockedCreateSpaceTransaction,
        )

        await actions.setupPaidWithFixedFee(1.1)

        if (GATING_ENABLED) {
            const anyone = await screen.findByTestId('option-canjoin-anyone')
            await userEvent.click(anyone)
        }

        const createButton = await screen.findByTestId('create-town-button')
        expect(createButton).toBeEnabled()

        await userEvent.click(createButton)

        await waitFor(async () => {
            const expected = getCreateSpaceTransactionDefaultResult()
            return expect(createSpaceTransactionSpy).toHaveBeenCalledWith(
                { name: 'testtown' },
                {
                    ...expected,
                    requirements: {
                        ...expected.requirements,
                    },
                    settings: {
                        ...expected.settings,
                        pricingModule: `0x${Lib.FIXED_PRICING}`,
                        freeAllocation: 0,
                        price: parseUnits('1.1', 18),
                    },
                },
                {},
                expect.anything(),
            )
        })
    })
    it('should create a paid town with dynamic fee', async () => {
        vi.spyOn(Lib, 'useCreateSpaceTransaction').mockImplementation(
            useMockedCreateSpaceTransaction,
        )

        await actions.setupPaidWithDynamicFee()

        if (GATING_ENABLED) {
            const anyone = await screen.findByTestId('option-canjoin-anyone')
            await userEvent.click(anyone)
        }

        const createButton = await screen.findByTestId('create-town-button')
        expect(createButton).toBeEnabled()

        await userEvent.click(createButton)

        await waitFor(async () => {
            const expected = getCreateSpaceTransactionDefaultResult()
            return expect(createSpaceTransactionSpy).toHaveBeenCalledWith(
                { name: 'testtown' },
                {
                    ...expected,
                    requirements: {
                        ...expected.requirements,
                    },
                    settings: {
                        ...expected.settings,
                        pricingModule: `0x${Lib.TIERED_PRICING_ORACLE_V2}`,
                        freeAllocation: 0,
                        price: 0n,
                    },
                },
                {},
                expect.anything(),
            )
        })
    })

    it('should should create a dynamic fee town even after user entered a fixed price', async () => {
        vi.spyOn(Lib, 'useCreateSpaceTransaction').mockImplementation(
            useMockedCreateSpaceTransaction,
        )

        await actions.setupPaidWithFixedFee(1.1)

        if (GATING_ENABLED) {
            const anyone = await screen.findByTestId('option-canjoin-anyone')
            await userEvent.click(anyone)
        }

        expect(screen.getByPlaceholderText('Enter amount')).toBeInTheDocument()
        await userEvent.type(screen.getByPlaceholderText('Enter amount'), '1.1')

        await userEvent.click(await screen.findByTestId('option-fee-dynamic'))

        const createButton = await screen.findByTestId('create-town-button')
        expect(createButton).toBeEnabled()

        await userEvent.click(createButton)

        await waitFor(async () => {
            const expected = getCreateSpaceTransactionDefaultResult()
            return expect(createSpaceTransactionSpy).toHaveBeenCalledWith(
                { name: 'testtown' },
                {
                    ...expected,
                    requirements: {
                        ...expected.requirements,
                    },
                    settings: {
                        ...expected.settings,
                        pricingModule: `0x${Lib.TIERED_PRICING_ORACLE_V2}`,
                        freeAllocation: 0,
                        price: 0n,
                    },
                },
                {},
                expect.anything(),
            )
        })
    })

    it('should should create a free town even after user entered a fixed price', async () => {
        vi.spyOn(Lib, 'useCreateSpaceTransaction').mockImplementation(
            useMockedCreateSpaceTransaction,
        )

        await actions.setup()

        await userEvent.type(screen.getByPlaceholderText('Town Name'), 'testtown')
        await actions.uploadImage()

        const freeOption = await screen.findByTestId('option-towntype-free')
        const paidOption = await screen.findByTestId('option-towntype-paid')
        await userEvent.click(paidOption)
        await userEvent.click(await screen.findByTestId('option-fee-fixed'))
        await userEvent.type(screen.getByPlaceholderText('Enter amount'), '1.1')

        if (GATING_ENABLED) {
            const anyone = await screen.findByTestId('option-canjoin-anyone')
            await userEvent.click(anyone)
        }

        await userEvent.click(freeOption)

        expect(screen.queryByPlaceholderText('Enter amount')).not.toBeInTheDocument()

        const createButton = await screen.findByTestId('create-town-button')
        expect(createButton).toBeEnabled()

        await userEvent.click(createButton)

        await waitFor(async () => {
            const expected = getCreateSpaceTransactionDefaultResult()
            return expect(createSpaceTransactionSpy).toHaveBeenCalledWith(
                { name: 'testtown' },
                {
                    ...expected,
                    requirements: {
                        ...expected.requirements,
                    },
                    settings: {
                        ...expected.settings,
                        pricingModule: `0x${Lib.FIXED_PRICING}`,
                        freeAllocation: FREE_ALLOCATION_FOR_FREE_SPACE,
                        price: 0n,
                    },
                },
                {},
                expect.anything(),
            )
        })
    })

    it('should should create a free town after selecting free after selecting dynamic', async () => {
        vi.spyOn(Lib, 'useCreateSpaceTransaction').mockImplementation(
            useMockedCreateSpaceTransaction,
        )

        await actions.setup()

        await userEvent.type(screen.getByPlaceholderText('Town Name'), 'testtown')
        await actions.uploadImage()

        const freeOption = await screen.findByTestId('option-towntype-free')
        const paidOption = await screen.findByTestId('option-towntype-paid')
        await userEvent.click(paidOption)
        await userEvent.click(await screen.findByTestId('option-fee-dynamic'))

        if (GATING_ENABLED) {
            const anyone = await screen.findByTestId('option-canjoin-anyone')
            await userEvent.click(anyone)
        }

        await userEvent.click(freeOption)

        expect(screen.queryByPlaceholderText('Enter amount')).not.toBeInTheDocument()

        const createButton = await screen.findByTestId('create-town-button')
        expect(createButton).toBeEnabled()

        await userEvent.click(createButton)

        await waitFor(async () => {
            const expected = getCreateSpaceTransactionDefaultResult()
            return expect(createSpaceTransactionSpy).toHaveBeenCalledWith(
                { name: 'testtown' },
                {
                    ...expected,
                    requirements: {
                        ...expected.requirements,
                    },
                    settings: {
                        ...expected.settings,
                        pricingModule: `0x${Lib.FIXED_PRICING}`,
                        freeAllocation: FREE_ALLOCATION_FOR_FREE_SPACE,
                        price: 0n,
                    },
                },
                {},
                expect.anything(),
            )
        })
    })
})

// helpers

const ui = {
    getNextButton: () => screen.getByTestId('next-button') as HTMLButtonElement,
}

const actions = {
    setup: async () => {
        const { baseElement } = render(<Wrapper />)
        return baseElement
    },
    setupFree: async () => {
        await actions.setup()

        await userEvent.type(screen.getByPlaceholderText('Town Name'), 'testtown')
        await actions.uploadImage()

        await userEvent.click(await screen.findByTestId('option-towntype-free'))
    },
    setupPaid: async () => {
        await actions.setup()
        await userEvent.type(screen.getByPlaceholderText('Town Name'), 'testtown')
        await actions.uploadImage()
        await userEvent.click(await screen.findByTestId('option-towntype-paid'))
    },

    setupPaidWithFixedFee: async (fee: number) => {
        await actions.setupPaid()
        await userEvent.click(await screen.findByTestId('option-fee-fixed'))
        await userEvent.type(screen.getByPlaceholderText('Enter amount'), fee.toString())
    },

    setupPaidWithDynamicFee: async () => {
        await actions.setupPaid()
        await userEvent.click(await screen.findByTestId('option-fee-dynamic'))
    },

    uploadImage: async () => {
        const uploader = screen.getByTestId('create-town-image-upload-field') as HTMLInputElement
        const file = new File(['image'], 'image.png', { type: 'image/png' })
        await userEvent.upload(uploader, file)
    },
}

const getCreateSpaceTransactionDefaultResult = () =>
    ({
        permissions: [Lib.Permission.Read, Lib.Permission.Write, Lib.Permission.React],
        requirements: {
            everyone: true,
            ruleData: `0x`,
            syncEntitlements: true,
            users: [Lib.EVERYONE_ADDRESS],
        },
        settings: {
            duration: YEAR_MS / 1000,
            currency: ethers.constants.AddressZero,
            feeRecipient: ethers.constants.AddressZero,
            freeAllocation: FREE_ALLOCATION_FOR_FREE_SPACE,
            maxSupply: DEFAULT_MEMBERSHIP_LIMIT,
            name: 'testtown - Member',
            price: 0n,
            pricingModule: `0x${Lib.FIXED_PRICING}`,
            symbol: 'MEMBER',
        },
    } as const)

// mock components

global.URL.createObjectURL = vi.fn()

vi.mock('@components/TownsToken/InteractiveTownsToken', () => ({
    InteractiveTownsToken: () => <div>InteractiveTownsToken</div>,
}))

// file dimensions are triggered by File loading - tedious to mock
vi.mock('@components/UploadImage/getImageDimensions', () => ({
    getImageDimensions: vi.fn().mockResolvedValue((filename: string) => {
        const dims = filename.match(/(\d+)x(\d+)/)
        return dims ? { width: parseInt(dims[1]), height: parseInt(dims[2]) } : undefined
    }),
}))

const mockedUsedNavigate = vi.fn()

vi.mock('zustand', async (importOriginal) => {
    const actual = (await vi.importActual('zustand')) as typeof import('zustand')
    return {
        ...actual,
        createStore: actual.createStore,
    }
})

vi.mock('react-router', async () => {
    return {
        ...((await vi.importActual('react-router')) as typeof Router),
        useNavigate: () => mockedUsedNavigate,
    }
})

vi.mock('use-towns-client', async () => {
    const actual = (await vi.importActual('use-towns-client')) as typeof Lib
    return {
        ...actual,
        useTownsClient: () => {
            return {
                ...actual.useTownsClient(),
                spaceDapp: {
                    ...actual.useTownsClient().spaceDapp,
                    listPricingModules: vi.fn().mockResolvedValue([
                        {
                            name: Lib.FIXED_PRICING,
                            module: Promise.resolve(`0x${Lib.FIXED_PRICING}`),
                        },
                        {
                            name: Lib.TIERED_PRICING_ORACLE_V2,
                            module: Promise.resolve(`0x${Lib.TIERED_PRICING_ORACLE_V2}`),
                        },
                    ]),
                    findDynamicPricingModule: vi.fn().mockResolvedValue(true),
                    findFixedPricingModule: vi.fn().mockResolvedValue(true),
                },
            }
        },
        usePlatformMintLimit: () => ({
            data: 1000,
            isLoading: false,
            error: null,
        }),
    }
})

const { createTransactionSpy: createSpaceTransactionSpy, useMockedCreateTransaction } =
    mockCreateTransactionWithSpy('createSpaceTransactionWithRole')

const useMockedCreateSpaceTransaction = (
    ...args: (typeof Lib.useCreateSpaceTransaction)['arguments']
) => useMockedCreateTransaction(...args) as UseMockCreateSpaceReturn
