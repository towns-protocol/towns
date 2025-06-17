import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { SecretInformationBanner } from '@/components/ui/secret-information-banner'
import { CopyButton } from '@/components/copy-button'

interface BotCredentialsData {
    botAddress: string
    appPrivateDataBase64: string
    jwtSecretBase64: string
}

interface BotCredentialsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    data: BotCredentialsData | null
}

export const BotCredentialsDialog = ({ open, onOpenChange, data }: BotCredentialsDialogProps) => {
    if (!data) {
        return null
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Bot Created Successfully</DialogTitle>
                    <DialogDescription>
                        Your bot has been created and deployed. Store this information securely.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <SecretInformationBanner>
                        Store this information in a secure location. You won't be able to access it
                        again.
                    </SecretInformationBanner>

                    <div className="flex flex-col gap-2 text-sm">
                        <div className="flex items-center justify-between">
                            <p className="text-muted-foreground">Bot Address:</p>
                            <CopyButton text={data.botAddress} />
                        </div>
                        <pre className="overflow-auto whitespace-pre-wrap rounded bg-muted p-2 text-xs">
                            {data.botAddress}
                        </pre>
                    </div>

                    <div className="flex flex-col gap-2 text-sm">
                        <div className="flex items-center justify-between">
                            <p className="text-muted-foreground">App Private Data</p>
                            <div className="flex items-center gap-2">
                                <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                                    BASE64
                                </span>
                                <CopyButton text={data.appPrivateDataBase64} />
                            </div>
                        </div>
                        <pre className="max-h-[4lh] overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-2 text-xs">
                            {data.appPrivateDataBase64}
                        </pre>
                    </div>

                    <div className="flex flex-col gap-2 text-sm">
                        <div className="flex items-center justify-between">
                            <p className="text-muted-foreground">JWT Secret</p>
                            <div className="flex items-center gap-2">
                                <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                                    BASE64
                                </span>
                                <CopyButton text={data.jwtSecretBase64} />
                            </div>
                        </div>
                        <pre className="max-h-[4lh] overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-2 text-xs">
                            {data.jwtSecretBase64}
                        </pre>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button onClick={() => onOpenChange(false)}>Close</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
