import { AlertTriangle } from 'lucide-react'

export const SecretInformationBanner = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="flex items-center gap-2 rounded-sm bg-yellow-50 p-2 text-sm text-yellow-500 dark:bg-yellow-900/50">
            <AlertTriangle className="mr-2 h-4 w-4" />
            {children}
        </div>
    )
}
