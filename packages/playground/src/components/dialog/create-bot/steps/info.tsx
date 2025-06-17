import { useFormContext } from 'react-hook-form'
import { z } from 'zod'
import { Permission } from '@towns-protocol/web3'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { BotFormData } from '../types'

export const infoSchema = z.object({
    name: z.string().min(1, { message: 'Name is required' }),
    description: z.string().optional(),
    installPrice: z.string().min(1, { message: 'Install price is required' }),
    membershipDuration: z.string().min(1, { message: 'Membership duration is required' }),
    permissions: z.array(z.nativeEnum(Permission)).min(1, { message: 'Select at least one' }),
})

const membershipDurationOptions = [
    { label: '10 minutes', value: '600' },
    { label: '1 hour', value: '3600' },
    { label: '1 week', value: '604800' },
    { label: '1 month', value: '2592000' },
    { label: '1 year', value: '31536000' },
]

export const InfoStep = () => {
    const { control, watch, setValue } = useFormContext<BotFormData>()
    const selected = watch('permissions')

    const availablePermissions = Object.values(Permission).filter((p) => p !== Permission.Undefined)

    const togglePermission = (p: Permission) => {
        if (selected.includes(p)) {
            setValue(
                'permissions',
                selected.filter((x) => x !== p),
            )
        } else {
            setValue('permissions', [...selected, p])
        }
    }

    return (
        <div className="space-y-4">
            <FormField
                control={control as never}
                name="name"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                            <Input placeholder="My Bot" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={control as never}
                name="description"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                            <Input placeholder="Optional description" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={control as never}
                name="installPrice"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Install Price (ETH)</FormLabel>
                        <FormControl>
                            <Input type="number" step="any" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={control as never}
                name="membershipDuration"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Membership Duration</FormLabel>
                        <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select membership duration" />
                                </SelectTrigger>
                                <SelectContent>
                                    {membershipDurationOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <div className="space-y-2">
                <p className="text-sm font-medium">Permissions</p>
                <div className="grid grid-cols-2 gap-2">
                    {availablePermissions.map((p) => (
                        <button
                            key={p}
                            type="button"
                            className={
                                'rounded border px-2 py-1 text-sm ' +
                                (selected.includes(p)
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-background')
                            }
                            onClick={() => togglePermission(p)}
                        >
                            {p}
                        </button>
                    ))}
                </div>
                {selected.length === 0 && (
                    <p className="text-xs text-destructive">Select at least one permission</p>
                )}
            </div>
        </div>
    )
}
InfoStep.description = 'Configure your bot details'
