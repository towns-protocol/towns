import { useFormContext } from 'react-hook-form'
import { BotFormData } from '../types'

const pad = (label: string, len = 22) => label.padEnd(len, ' ')

export const ReviewStep = () => {
    const { getValues } = useFormContext<BotFormData>()
    const v = getValues()

    const lines: string[] = []
    lines.push('══════════════════════════════════════════════')
    lines.push('                  BOT RECEIPT                 ')
    lines.push('══════════════════════════════════════════════')
    lines.push('')
    lines.push(`${pad('Name')}: ${v.name}`)
    lines.push(`${pad('Description')}: ${v.description || '—'}`)
    lines.push(`${pad('Install Price')}: ${v.installPrice} ETH`)
    lines.push(`${pad('Membership Duration')}: ${v.membershipDuration} sec`)
    lines.push(`${pad('Permissions')}: ${v.permissions.join(', ')}`)
    lines.push(`${pad('Bot Type')}: ${v.botKind === 'simple' ? 'Simple' : 'Contract'}`)
    if (v.botKind === 'contract') {
        lines.push(`${pad('Contract Address')}: ${v.contractAddress}`)
    }
    lines.push('')
    lines.push('══════════════════════════════════════════════')

    return (
        <div className="flex justify-center">
            <pre className="whitespace-pre-wrap rounded-lg border-2 border-muted-foreground/20 bg-muted p-6 font-mono text-sm shadow-inner">
                {lines.join('\n')}
            </pre>
        </div>
    )
}
ReviewStep.description = 'Review the details of your new bot'
