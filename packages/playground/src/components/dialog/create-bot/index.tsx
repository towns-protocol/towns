import { useEffect, useMemo, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AppRegistryDapp, Permission } from '@towns-protocol/web3'
import { useSyncAgent, useTowns } from '@towns-protocol/react-sdk'
import { ethers } from 'ethers'
import type { Address } from 'viem'
import {
    AppRegistryService,
    Client,
    MockEntitlementsDelegate,
    RiverDbManager,
    getAppRegistryUrl,
    makeBaseProvider,
    makeRiverProvider,
    makeRiverRpcClient,
    makeSignerContext,
} from '@towns-protocol/sdk'
import { AppPrivateDataSchema } from '@towns-protocol/proto'
import { create, toBinary } from '@bufbuild/protobuf'
import { bin_fromHexString, bin_toBase64 } from '@towns-protocol/dlog'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useEthersSigner } from '@/utils/viem-to-ethers'
import { getAllBotsQueryKey } from '@/hooks/useAllBots'
import { InfoStep, infoSchema } from './steps/info'
import { TypeStep } from './steps/type'
import { ReviewStep } from './steps/review'
import { BotCredentialsDialog } from './bot-credentials-dialog'
import type { BotFormData } from './types'
import { WizardFooter } from './wizard-footer'

const steps = [InfoStep, TypeStep, ReviewStep]

const typeStepSchema = z
    .object({
        botKind: z.enum(['simple', 'contract']),
        contractAddress: z.string().optional(),
    })
    .refine(
        (data) => {
            if (data.botKind === 'contract') {
                return data.contractAddress && data.contractAddress.trim() !== ''
            }
            return true
        },
        {
            message: 'Contract address is required for contract bots',
            path: ['contractAddress'],
        },
    )

const formSchema = infoSchema
    .extend({
        botKind: z.enum(['simple', 'contract']),
        contractAddress: z.string().optional(),
    })
    .refine(
        (data) => {
            if (data.botKind === 'contract') {
                return data.contractAddress && data.contractAddress.trim() !== ''
            }
            return true
        },
        {
            message: 'Contract address is required for contract bots',
            path: ['contractAddress'],
        },
    )

const stepSchemas = [
    infoSchema,
    typeStepSchema,
    formSchema, // Final step validates everything
]

const ONE_YEAR_IN_SECONDS = 31536000

interface CreateBotDialogProps {
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export const CreateBotDialog = ({ open, onOpenChange }: CreateBotDialogProps) => {
    const sync = useSyncAgent()
    const queryClient = useQueryClient()
    const form = useForm<BotFormData>({
        resolver: zodResolver(formSchema),
        mode: 'onChange',
        defaultValues: {
            name: '',
            description: '',
            permissions: [Permission.Read, Permission.Write],
            installPrice: '0.01',
            membershipDuration: String(ONE_YEAR_IN_SECONDS),
            botKind: 'simple',
            contractAddress: undefined,
        },
    })

    const [step, setStep] = useState(0)
    const [credentialsData, setCredentialsData] = useState<{
        botAddress: string
        appPrivateDataBase64: string
        jwtSecretBase64: string
    } | null>(null)
    const [showCredentials, setShowCredentials] = useState(false)
    const CurrentStep = steps[step]

    useEffect(() => {
        if (!open) {
            form.reset()
            setStep(0)
            setCredentialsData(null)
            setShowCredentials(false)
        }
    }, [open, form])

    const watchedValues = form.watch()

    const isStepValid = useMemo(() => {
        const stepSchema = stepSchemas[step]
        try {
            let stepValues: unknown

            switch (step) {
                case 0: // Info step
                    stepValues = {
                        name: watchedValues.name,
                        description: watchedValues.description,
                        installPrice: watchedValues.installPrice,
                        membershipDuration: watchedValues.membershipDuration,
                        permissions: watchedValues.permissions,
                    }
                    break
                case 1: // Type step
                    stepValues = {
                        botKind: watchedValues.botKind,
                        contractAddress: watchedValues.contractAddress,
                    }
                    break
                case 2: // Review step (validate everything)
                    stepValues = watchedValues
                    break
                default:
                    return false
            }

            stepSchema.parse(stepValues)
            return true
        } catch {
            return false
        }
    }, [step, watchedValues])

    const next = () => {
        if (step < steps.length - 1) {
            setStep(step + 1)
        }
    }

    const back = () => {
        if (step > 0) {
            setStep(step - 1)
        }
    }

    const signer = useEthersSigner()
    const { data: user } = useTowns((s) => s.user)

    const { mutate, isPending } = useMutation({
        mutationFn: async (formData: BotFormData) => {
            const {
                name,
                installPrice,
                membershipDuration,
                permissions,
                botKind,
                contractAddress,
            } = formData
            console.log('mutate', formData)

            const baseProvider = makeBaseProvider(sync.config.riverConfig)
            if (!signer) {
                throw new Error('Signer is not set')
            }
            const riverConfig = sync.config.riverConfig

            const botWallet = ethers.Wallet.createRandom()
            const appRegistryDapp = new AppRegistryDapp(riverConfig.base.chainConfig, baseProvider)
            let appAddress = ''
            if (botKind === 'simple') {
                const tx = await appRegistryDapp.createApp(
                    signer,
                    name,
                    permissions,
                    botWallet.address as Address,
                    ethers.utils.parseEther(installPrice).toBigInt(),
                    BigInt(membershipDuration),
                )
                const receipt = await tx.wait()
                if (!receipt) {
                    throw new Error('Transaction failed')
                }
                const { app: foundAppAddress } = appRegistryDapp.getCreateAppEvent(receipt)
                appAddress = foundAppAddress
            } else if (botKind === 'contract' && contractAddress) {
                const tx = await appRegistryDapp.registerApp(
                    signer,
                    contractAddress,
                    botWallet.address as Address,
                )
                const receipt = await tx.wait()
                if (!receipt) {
                    throw new Error('Transaction failed')
                }

                const { app: foundAppAddress } = appRegistryDapp.getRegisterAppEvent(receipt)
                appAddress = foundAppAddress
            } else {
                throw new Error('Invalid bot kind or contract address')
            }
            const delegateWallet = ethers.Wallet.createRandom()
            const signerContext = await makeSignerContext(botWallet, delegateWallet)
            const rpcClient = await makeRiverRpcClient(
                makeRiverProvider(riverConfig),
                riverConfig.river.chainConfig,
            )
            const cryptoStore = RiverDbManager.getCryptoDb(appAddress)
            const botClient = new Client(
                signerContext,
                rpcClient,
                cryptoStore,
                new MockEntitlementsDelegate(),
            )
            await botClient.initializeUser({ appAddress })
            await botClient.uploadDeviceKeys()

            const exportedDevice = await botClient.cryptoBackend?.exportDevice()
            const appPrivateDataBase64 = bin_toBase64(
                toBinary(
                    AppPrivateDataSchema,
                    create(AppPrivateDataSchema, {
                        privateKey: botWallet.privateKey,
                        encryptionDevice: exportedDevice,
                    }),
                ),
            )

            const { appRegistryRpcClient } = await AppRegistryService.authenticateWithSigner(
                user.id,
                signer,
                getAppRegistryUrl(riverConfig.environmentId),
            )
            const { hs256SharedSecret } = await appRegistryRpcClient.register({
                appId: bin_fromHexString(botWallet.address),
                appOwnerId: bin_fromHexString(user.id),
            })
            const jwtSecretBase64 = bin_toBase64(hs256SharedSecret)

            return {
                botAddress: botWallet.address,
                appPrivateDataBase64,
                jwtSecretBase64,
            }
        },
        onSuccess: (data) => {
            setCredentialsData(data)
            setShowCredentials(true)
            if (user.id) {
                queryClient.invalidateQueries({
                    queryKey: getAllBotsQueryKey(user.id),
                })
            }
            console.log('onSuccess', data)
        },
        onError: (error) => {
            console.error('onError', error)
        },
    })

    return (
        <>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Create a Bot</DialogTitle>
                    <DialogDescription>{CurrentStep.description}</DialogDescription>
                </DialogHeader>
                <FormProvider {...form}>
                    <form
                        className="space-y-6"
                        onSubmit={form.handleSubmit((data) => {
                            if (step === steps.length - 1) {
                                mutate(data)
                            }
                        })}
                    >
                        <CurrentStep />
                        <WizardFooter
                            step={step}
                            totalSteps={steps.length}
                            isNextDisabled={!isStepValid}
                            isMinting={isPending}
                            onBack={back}
                            onNext={next}
                        />
                    </form>
                </FormProvider>
            </DialogContent>
            <BotCredentialsDialog
                open={showCredentials}
                data={credentialsData}
                onOpenChange={(open) => {
                    setShowCredentials(open)
                    if (!open) {
                        // Close the main create-bot dialog when credentials dialog is closed
                        onOpenChange?.(false)
                    }
                }}
            />
        </>
    )
}
