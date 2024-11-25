import { zodResolver } from '@hookform/resolvers/zod'
import { useCreateDm } from '@river-build/react-sdk'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormMessage,
} from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const formSchema = z.object({
    userId: z.string().min(1, { message: 'User address is required' }),
})

export const CreateDm = (props: { onDmCreated: (dmId: string) => void }) => {
    const { onDmCreated } = props
    const { createDM, isPending } = useCreateDm()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { userId: '' },
    })

    return (
        <Form {...form}>
            <form
                className="space-y-3"
                onSubmit={form.handleSubmit(async ({ userId }) => {
                    const { streamId } = await createDM(userId)
                    onDmCreated(streamId)
                })}
            >
                <FormField
                    control={form.control}
                    name="userId"
                    render={({ field }) => (
                        <FormItem>
                            <FormDescription>
                                Enter the address of the user you want to DM
                            </FormDescription>
                            <div className="flex items-center gap-2">
                                <FormControl>
                                    <Input placeholder="0x..." {...field} />
                                </FormControl>
                                <Button type="submit">
                                    {isPending ? 'Creating...' : 'Create DM'}
                                </Button>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </form>
        </Form>
    )
}
