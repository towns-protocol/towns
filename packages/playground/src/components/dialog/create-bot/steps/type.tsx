import { useFormContext } from 'react-hook-form'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { BotFormData } from '../types'

export const TypeStep = () => {
    const { control, watch } = useFormContext<BotFormData>()
    const kind = watch('botKind')
    return (
        <div className="space-y-4">
            <FormField
                control={control}
                name="botKind"
                render={({ field }) => (
                    <FormItem>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2">
                                <input
                                    type="radio"
                                    value="simple"
                                    checked={field.value === 'simple'}
                                    onChange={(e) => field.onChange(e.target.value)}
                                />
                                Simple Bot
                            </label>
                            <label className="flex items-center gap-2">
                                <input
                                    type="radio"
                                    value="contract"
                                    checked={field.value === 'contract'}
                                    onChange={(e) => field.onChange(e.target.value)}
                                />
                                Contract Bot
                            </label>
                        </div>
                        <FormMessage />
                    </FormItem>
                )}
            />
            {kind === 'contract' && (
                <FormField
                    control={control}
                    name="contractAddress"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Contract Address</FormLabel>
                            <FormControl>
                                <Input placeholder="0x..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}
        </div>
    )
}

TypeStep.description =
    'You can build a bot using a pre-existing contract or select a simple bot with an already defined contract'
