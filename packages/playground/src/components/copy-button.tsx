import { useEffect, useState } from 'react'
import { CheckCircle, Copy } from 'lucide-react'
import { Button, type ButtonProps } from './ui/button'

type CopyButtonProps = {
    text: string
} & ButtonProps

export function CopyButton({ text, ...props }: CopyButtonProps) {
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        if (copied) {
            const timeout = setTimeout(() => {
                setCopied(false)
            }, 2000)

            return () => clearTimeout(timeout)
        }
        return
    }, [copied])

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text)
            setCopied(true)
        } catch (error) {
            console.error('Failed to copy text:', error)
        }
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            aria-label={copied ? 'Copied' : 'Copy to clipboard'}
            onClick={handleCopy}
            {...props}
        >
            {copied ? (
                <CheckCircle className="size-4 text-green-500" />
            ) : (
                <Copy className="size-4" />
            )}
        </Button>
    )
}
