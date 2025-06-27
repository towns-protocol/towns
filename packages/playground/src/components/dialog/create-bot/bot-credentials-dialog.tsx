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
import { cn } from '@/utils'

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

    const envContent = `APP_PRIVATE_DATA_BASE64=${data.appPrivateDataBase64}
JWT_SECRET=${data.jwtSecretBase64}`

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        Bot Created Successfully
                    </DialogTitle>
                    <DialogDescription>
                        Your bot has been minted. The private credentials below are critical for
                        your bot's operation.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <SecretInformationBanner>
                        These private keys and secrets are shown only once and cannot be recovered.
                    </SecretInformationBanner>

                    <div className="flex flex-col gap-2 text-sm">
                        <div className="flex items-center justify-between">
                            <p className="text-muted-foreground">Environment Variables</p>
                            <CopyButton text={envContent} />
                        </div>
                        <textarea
                            readOnly
                            value={envContent}
                            className={cn(
                                'min-h-[200px] w-full resize-none rounded-md border font-mono text-xs shadow-sm',
                                'bg-muted text-foreground',
                                'px-4 py-3 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                                'disabled:cursor-not-allowed disabled:opacity-50',
                            )}
                            placeholder="Environment variables will appear here..."
                        />
                    </div>

                    <div className="rounded-md bg-blue-50 p-4 dark:bg-blue-900/20">
                        <div className="text-sm">
                            <h4 className="mb-2 font-medium text-blue-900 dark:text-blue-100">
                                Next Steps:
                            </h4>
                            <ul className="list-inside list-disc space-y-1 text-blue-800 dark:text-blue-200">
                                <li>Copy and securely store the App Private Data and JWT Secret</li>
                                <li>Use these credentials to authenticate your bot application</li>
                                <li>
                                    Never share these secrets publicly or commit them to version
                                    control
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button onClick={() => onOpenChange(false)}>
                            I've Saved My Credentials
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
