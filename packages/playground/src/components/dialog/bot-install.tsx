import { useCallback, useMemo, useState } from 'react'
import { type Address, parseEther } from 'viem'
import { useChannel, useSpace, useSyncAgent, useUserSpaces } from '@towns-protocol/react-sdk'
import { ArrowLeftIcon, LoaderCircleIcon } from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AppRegistryDapp, SpaceAddressFromSpaceId, SpaceDapp } from '@towns-protocol/web3'
import { makeBaseProvider } from '@towns-protocol/sdk'
import { useEthersSigner } from '@/utils/viem-to-ethers'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Checkbox } from '../ui/checkbox'
import { ScrollArea } from '../ui/scroll-area'

interface BotInstallDialogProps {
    appClientId: Address
    appAddress: Address
    open: boolean
    onOpenChange: (open: boolean) => void
}

type Step = 'space-selection' | 'channel-selection'

export const BotInstallDialog = ({
    appAddress,
    appClientId,
    open,
    onOpenChange,
}: BotInstallDialogProps) => {
    const { spaceIds } = useUserSpaces()
    const sync = useSyncAgent()
    const signer = useEthersSigner()
    const [currentStep, setCurrentStep] = useState<Step>('space-selection')
    const [state, setState] = useState<{
        spaceId: string
        channelIds: Set<string>
    }>({
        spaceId: '',
        channelIds: new Set(),
    })

    const handleSpaceSelect = useCallback((spaceId: string) => {
        setState((prev) => ({ ...prev, spaceId, channelIds: new Set() }))
        setCurrentStep('channel-selection')
    }, [])

    const handleChannelToggle = useCallback((channelId: string, checked: boolean) => {
        setState((prev) => {
            const newSet = new Set(prev.channelIds)
            if (checked) {
                newSet.add(channelId)
            } else {
                newSet.delete(channelId)
            }
            return { ...prev, channelIds: newSet }
        })
    }, [])

    const handleBackToSpaceSelection = useCallback(() => {
        setCurrentStep('space-selection')
    }, [])

    const { mutate, isPending } = useMutation({
        mutationFn: async () => {
            if (!state.spaceId || state.channelIds.size === 0) {
                return
            }
            if (!signer) {
                throw new Error('No signer found')
            }
            const appRegistryDapp = new AppRegistryDapp(
                sync.config.riverConfig.base.chainConfig,
                makeBaseProvider(sync.config.riverConfig),
            )
            const spaceDapp = new SpaceDapp(
                sync.config.riverConfig.base.chainConfig,
                makeBaseProvider(sync.config.riverConfig),
            )
            const space = spaceDapp.getSpace(state.spaceId)

            if (!space) {
                throw new Error('Space not found')
            }
            const isBotInstalled = await space.AppAccount.read
                .getInstalledApps()
                .then((apps) => apps.includes(appAddress))
            if (!isBotInstalled) {
                const tx = await appRegistryDapp.installApp(
                    signer,
                    appAddress,
                    SpaceAddressFromSpaceId(state.spaceId) as Address,
                    parseEther('0.02'),
                )
                await tx.wait()
                console.log('bot installed')
            }
            await sync.riverConnection.call((client) => client.joinUser(state.spaceId, appClientId))
            await Promise.all(
                // TODO: can we batch those into a single call?
                Array.from(state.channelIds).map((channelId) =>
                    sync.riverConnection.call((client) => client.joinUser(channelId, appClientId)),
                ),
            )
        },
        onSuccess: () => {
            onOpenChange(false)
            setState((prev) => ({ ...prev, spaceId: '', channelIds: new Set() }))
            setCurrentStep('space-selection')
        },
        onError: (error) => {
            console.error('Failed to install bot:', error)
        },
    })

    const resetDialog = useCallback(() => {
        setState((prev) => ({ ...prev, spaceId: '', channelIds: new Set() }))
        setCurrentStep('space-selection')
    }, [])

    return (
        <Dialog
            open={open}
            onOpenChange={(open) => {
                onOpenChange(open)
                if (!open) {
                    resetDialog()
                }
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        Install Bot - Step {currentStep === 'space-selection' ? '1' : '2'} of 2
                    </DialogTitle>
                    <DialogDescription>
                        {currentStep === 'space-selection'
                            ? 'Select a space where you want to install the bot.'
                            : 'Choose which channels the bot should join in the selected space.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {currentStep === 'space-selection' && (
                        <SpaceSelectionStep
                            spaceIds={spaceIds}
                            selectedSpaceId={state.spaceId}
                            onSpaceSelect={handleSpaceSelect}
                        />
                    )}

                    {currentStep === 'channel-selection' && (
                        <ChannelSelectionStep
                            spaceId={state.spaceId}
                            selectedChannelIds={state.channelIds}
                            appClientId={appClientId}
                            isInstalling={isPending}
                            onChannelToggle={handleChannelToggle}
                            onSelectAllChannels={(channelIds) =>
                                setState((prev) => ({ ...prev, channelIds }))
                            }
                            onBack={handleBackToSpaceSelection}
                            onInstall={mutate}
                        />
                    )}

                    {currentStep === 'space-selection' && (
                        <div className="flex justify-end">
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

const SpaceSelectionStep = ({
    spaceIds,
    selectedSpaceId,
    onSpaceSelect,
}: {
    spaceIds: string[]
    selectedSpaceId: string
    onSpaceSelect: (spaceId: string) => void
}) => {
    return (
        <div className="space-y-3">
            <Label className="text-sm font-medium">Select Space</Label>
            <ScrollArea className="max-h-96">
                <div className="space-y-2">
                    {spaceIds &&
                        spaceIds.length > 0 &&
                        spaceIds.map((spaceId) => (
                            <SpaceOption
                                key={spaceId}
                                spaceId={spaceId}
                                selected={selectedSpaceId === spaceId}
                                onSelect={() => onSpaceSelect(spaceId)}
                            />
                        ))}
                </div>
            </ScrollArea>
            {spaceIds.length === 0 && (
                <p className="pt-4 text-center text-sm text-muted-foreground">
                    You're not in any spaces yet.
                </p>
            )}
        </div>
    )
}

const ChannelSelectionStep = ({
    spaceId,
    selectedChannelIds,
    appClientId,
    onChannelToggle,
    onSelectAllChannels,
    onBack,
    onInstall,
    isInstalling,
}: {
    spaceId: string
    selectedChannelIds: Set<string>
    appClientId: Address
    onSelectAllChannels: (channelIds: Set<string>) => void
    onChannelToggle: (channelId: string, checked: boolean) => void
    onBack: () => void
    onInstall: () => void
    isInstalling: boolean
}) => {
    const { data: space } = useSpace(spaceId)
    const spaceName = space?.metadata?.name || 'Unnamed Space'
    const channelIds = useMemo(() => space?.channelIds || [], [space])
    const sync = useSyncAgent()

    const isAllChannelsSelected = useMemo(() => {
        if (channelIds.length === 0) {
            return false
        }
        if (selectedChannelIds.size === channelIds.length) {
            return true
        }
        if (selectedChannelIds.size > 0) {
            return 'indeterminate'
        }
        return false
    }, [channelIds, selectedChannelIds])

    const channelIdsThatBotIsIn = useCallback(
        async (spaceId: string) => {
            const botIsInChannelsId = []
            const space = sync.spaces.getSpace(spaceId)
            const channelIds = space.data.channelIds
            for (const channelId of channelIds) {
                const channel = space.getChannel(channelId)
                const members = channel.members.value.data.userIds
                if (members.includes(appClientId)) {
                    botIsInChannelsId.push(channelId)
                }
            }
            return botIsInChannelsId
        },
        [appClientId, sync.spaces],
    )

    const { data: botChannels } = useQuery({
        queryKey: ['botChannels', spaceId, appClientId],
        queryFn: () => channelIdsThatBotIsIn(spaceId),
        enabled: !!spaceId && !!appClientId,
    })

    const handleSelectAllChannels = useCallback(
        (checked: boolean) => {
            if (checked) {
                onSelectAllChannels(new Set(channelIds))
            } else {
                onSelectAllChannels(new Set())
            }
        },
        [channelIds, onSelectAllChannels],
    )

    return (
        <>
            <div className="space-y-3">
                <Label className="text-sm font-medium">Channels in {spaceName}</Label>

                {channelIds.length > 0 && (
                    <>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                                Select channels for the bot to join
                            </span>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="select-all"
                                    checked={isAllChannelsSelected}
                                    disabled={isInstalling}
                                    onCheckedChange={handleSelectAllChannels}
                                />
                                <Label htmlFor="select-all" className="text-sm">
                                    All channels
                                </Label>
                            </div>
                        </div>

                        <ScrollArea className="max-h-60">
                            <div className="space-y-2">
                                {channelIds.map((channelId) => (
                                    <ChannelOption
                                        key={channelId}
                                        spaceId={spaceId}
                                        channelId={channelId}
                                        selected={
                                            selectedChannelIds.has(channelId) ||
                                            (botChannels?.includes(channelId) ?? false)
                                        }
                                        disabled={
                                            isInstalling ||
                                            (botChannels?.includes(channelId) ?? false)
                                        }
                                        onToggle={(checked) => onChannelToggle(channelId, checked)}
                                    />
                                ))}
                            </div>
                        </ScrollArea>
                    </>
                )}

                {channelIds.length === 0 && (
                    <p className="pt-4 text-center text-sm text-muted-foreground">
                        This space doesn't have any channels yet.
                    </p>
                )}
            </div>

            <div className="flex justify-between">
                <Button variant="outline" disabled={isInstalling} onClick={onBack}>
                    <ArrowLeftIcon className="mr-2 h-4 w-4" />
                    Back
                </Button>
                <Button
                    disabled={selectedChannelIds.size === 0 || isInstalling}
                    onClick={onInstall}
                >
                    {isInstalling && <LoaderCircleIcon className="mr-2 h-4 w-4 animate-spin" />}
                    {isInstalling ? 'Installing...' : 'Install Bot'}
                </Button>
            </div>
        </>
    )
}

const SpaceOption = ({
    spaceId,
    selected,
    onSelect,
}: {
    spaceId: string
    selected: boolean
    onSelect: () => void
}) => {
    const { data: space } = useSpace(spaceId)
    const spaceName = space?.metadata?.name || 'Unnamed Space'

    return (
        <button
            className={`w-full rounded-md border px-3 py-3 text-left transition-colors hover:bg-muted ${
                selected ? 'border-primary bg-primary/10 text-primary' : 'border-border'
            }`}
            onClick={onSelect}
        >
            <div className="flex items-center justify-between">
                <div className="font-medium">{spaceName}</div>
                <div className="text-sm text-muted-foreground">
                    {space?.channelIds?.length || 0} channels
                </div>
            </div>
        </button>
    )
}

const ChannelOption = ({
    spaceId,
    channelId,
    selected,
    onToggle,
    disabled = false,
}: {
    spaceId: string
    channelId: string
    selected: boolean
    onToggle: (checked: boolean) => void
    disabled?: boolean
}) => {
    const { data: channel } = useChannel(spaceId, channelId)
    const channelName = channel?.metadata?.name || 'Unnamed Channel'

    return (
        <div className="flex items-center space-x-2">
            <Checkbox
                id={channelId}
                checked={selected}
                disabled={disabled}
                onCheckedChange={onToggle}
            />
            <Label htmlFor={channelId} className="flex-1 cursor-pointer">
                #{channelName}
            </Label>
        </div>
    )
}
