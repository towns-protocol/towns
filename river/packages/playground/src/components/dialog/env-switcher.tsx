import {
    useAccount,
    useDisconnect,
    useSendTransaction,
    useSwitchNetwork,
    useWaitForTransaction,
} from 'wagmi'

import { base, baseSepolia, foundry } from 'viem/chains'
import { useRiverConnection } from '@river-build/react-sdk'
import { makeRiverConfig } from '@river-build/sdk'
import { privateKeyToAccount } from 'viem/accounts'
import { parseEther } from 'viem'
import { deleteAuth, storeAuth } from '@/utils/persist-auth'
import { useEthersSigner } from '@/utils/viem-to-ethers'
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

const environments = [
    { id: 'gamma', name: 'Gamma', chainId: baseSepolia.id },
    { id: 'omega', name: 'Omega', chainId: base.id },
    { id: 'local_single', name: 'Local Single', chainId: foundry.id },
] as const

export type Env = (typeof environments)[number]

type RiverEnvSwitcherProps = {
    currentEnv: Env['id']
    setEnv: (envId: Env['id']) => void
}

export const RiverEnvSwitcher = (props: RiverEnvSwitcherProps) => {
    const { currentEnv, setEnv } = props
    const { connect, disconnect, isConnected } = useRiverConnection()
    const { switchNetwork } = useSwitchNetwork()
    const { disconnect: disconnectWallet } = useDisconnect()
    const signer = useEthersSigner()

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline">
                    {isConnected ? 'Switch environment or disconnect' : `Connect to River`}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {isConnected ? 'Switch environment' : 'Connect to River'}
                    </DialogTitle>
                    <DialogDescription>
                        {isConnected
                            ? 'Select the environment you want to switch to. You can also disconnect.'
                            : 'Select the environment you want to connect to.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-2">
                    {environments.map(({ id, name, chainId }) => (
                        <DialogClose asChild key={id}>
                            <Button
                                variant="outline"
                                disabled={currentEnv === id && isConnected}
                                onClick={async () => {
                                    if (!signer) {
                                        console.log('No signer')
                                        return
                                    }
                                    switchNetwork?.(chainId)
                                    setEnv(id)
                                    const riverConfig = makeRiverConfig(id)
                                    await connect(signer, {
                                        riverConfig,
                                    }).then((sync) => {
                                        if (sync?.config.context) {
                                            storeAuth(sync?.config.context, riverConfig)
                                        }
                                    })
                                }}
                            >
                                {name} {isConnected && currentEnv === id && '(connected)'}
                            </Button>
                        </DialogClose>
                    ))}
                    {currentEnv === 'local_single' && <FundWallet />}
                    {isConnected && (
                        <Button
                            variant="destructive"
                            onClick={() => {
                                disconnect()
                                disconnectWallet()
                                deleteAuth()
                            }}
                        >
                            Disconnect
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

// Anvil default funded address with balance
const AnvilAccount = privateKeyToAccount(
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
)

const FundWallet = () => {
    const { address } = useAccount()

    const { sendTransaction, data: tx, isLoading } = useSendTransaction()
    const { isSuccess, isLoading: isTxPending } = useWaitForTransaction({ hash: tx?.hash })

    return (
        <>
            <Button
                variant="outline"
                disabled={isLoading || isTxPending}
                onClick={() =>
                    sendTransaction({
                        account: AnvilAccount,
                        chainId: foundry.id,
                        value: parseEther('0.1'),
                        to: address as `0x${string}`,
                    })
                }
            >
                Fund Local Wallet {isSuccess && '✅'} {(isLoading || isTxPending) && '⏳'}
            </Button>
        </>
    )
}
