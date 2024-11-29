import {
    useAccount,
    useDisconnect,
    useSendTransaction,
    useSwitchChain,
    useWaitForTransactionReceipt,
} from 'wagmi'

import { foundry } from 'viem/chains'
import { useAgentConnection } from '@river-build/react-sdk'
import { makeRiverConfig } from '@river-build/sdk'
import { privateKeyToAccount } from 'viem/accounts'
import { parseEther } from 'viem'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getWeb3Deployment, getWeb3Deployments } from '@river-build/web3'
import { deleteAuth, storeAuth } from '@/utils/persist-auth'
import { getEthersSigner } from '@/utils/viem-to-ethers'
import { wagmiConfig } from '@/config/wagmi'
import { Button } from '../ui/button'
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

const environments = getWeb3Deployments().map((id) => ({
    id: id,
    name: id,
    chainId: getWeb3Deployment(id).base.chainId,
}))

export type Env = (typeof environments)[number]

export const RiverEnvSwitcher = () => {
    const { isAgentConnected } = useAgentConnection()
    const [open, setOpen] = useState(false)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" onClick={() => setOpen(true)}>
                    {isAgentConnected ? 'Switch environment or disconnect' : `Connect to River`}
                </Button>
            </DialogTrigger>
            <RiverEnvSwitcherContent allowBearerToken onClose={() => setOpen(false)} />
        </Dialog>
    )
}

export const RiverEnvSwitcherContent = (props: {
    allowBearerToken: boolean
    onClose: () => void
}) => {
    const {
        connect,
        connectUsingBearerToken,
        disconnect,
        isAgentConnected,
        env: currentEnv,
    } = useAgentConnection()
    const { switchChain } = useSwitchChain()
    const { disconnect: disconnectWallet } = useDisconnect()
    const [bearerToken, setBearerToken] = useState('')
    const navigate = useNavigate()

    return (
        <DialogContent className="gap-6">
            <DialogHeader>
                <DialogTitle>
                    {isAgentConnected ? 'Switch environment' : 'Connect to River'}
                </DialogTitle>
                <DialogDescription>
                    {isAgentConnected
                        ? 'Select the environment you want to switch to. You can also disconnect.'
                        : 'Select the environment you want to connect to.'}
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
                {props.allowBearerToken && (
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="bearer-token">Bearer Token</Label>
                        <Input
                            id="bearer-token"
                            placeholder="Paste your bearer token here"
                            value={bearerToken}
                            onChange={(e) => setBearerToken(e.target.value)}
                        />
                    </div>
                )}
                <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium">Select an environment</span>
                    {environments.map(({ id, name, chainId }) => (
                        <DialogClose asChild key={id}>
                            <Button
                                variant="outline"
                                disabled={currentEnv === id && isAgentConnected}
                                onClick={async () => {
                                    const riverConfig = makeRiverConfig(id)
                                    if (props.allowBearerToken) {
                                        if (bearerToken) {
                                            await connectUsingBearerToken(bearerToken, {
                                                riverConfig,
                                            }).then((sync) => {
                                                if (sync?.config.context) {
                                                    storeAuth(sync?.config.context, riverConfig)
                                                }
                                            })
                                        }
                                    } else {
                                        switchChain?.({ chainId })
                                        const signer = await getEthersSigner(wagmiConfig, {
                                            chainId,
                                        })
                                        await connect(signer, {
                                            riverConfig,
                                        }).then((sync) => {
                                            if (sync?.config.context) {
                                                storeAuth(sync?.config.context, riverConfig)
                                            }
                                        })
                                    }
                                    navigate('/')
                                    props.onClose()
                                }}
                            >
                                {name} {isAgentConnected && currentEnv === id && '(connected)'}
                            </Button>
                        </DialogClose>
                    ))}
                    {currentEnv === 'local_multi' && <FundWallet />}
                </div>
                {isAgentConnected && (
                    <Button
                        className="w-full"
                        variant="destructive"
                        onClick={() => {
                            disconnect()
                            disconnectWallet()
                            deleteAuth()
                            navigate('/')
                            props.onClose()
                        }}
                    >
                        Disconnect
                    </Button>
                )}
            </div>
        </DialogContent>
    )
}

// Anvil default funded address with balance
const AnvilAccount = privateKeyToAccount(
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
)

const FundWallet = () => {
    const { address } = useAccount()

    const { sendTransaction, data: hash, isPending: isSendingTx } = useSendTransaction()
    const { isSuccess, isPending: isTxPending } = useWaitForTransactionReceipt({ hash })

    return (
        <>
            <Button
                variant="outline"
                disabled={isSendingTx || isTxPending}
                onClick={() =>
                    sendTransaction({
                        account: AnvilAccount,
                        chainId: foundry.id,
                        value: parseEther('0.1'),
                        to: address as `0x${string}`,
                    })
                }
            >
                Fund Local Wallet {isSuccess && '✅'} {(isSendingTx || isTxPending) && '⏳'}
            </Button>
        </>
    )
}
