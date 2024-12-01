import { useCreateSpace } from '@river-build/react-sdk'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { useEthersSigner } from '@/utils/viem-to-ethers'

const createSpaceFormSchema = z.object({
    spaceName: z.string().min(1, { message: 'Space name is required' }),
})

export const CreateSpace = (props: { onCreateSpace: (spaceId: string) => void }) => {
    const { onCreateSpace } = props
    const { createSpace, isPending } = useCreateSpace()
    const signer = useEthersSigner()
    const form = useForm<z.infer<typeof createSpaceFormSchema>>({
        resolver: zodResolver(createSpaceFormSchema),
        defaultValues: { spaceName: '' },
    })

    return (
        <Form {...form}>
            <form
                className="space-y-3"
                onSubmit={form.handleSubmit(async ({ spaceName }) => {
                    if (!signer) {
                        return
                    }
                    const { spaceId } = await createSpace({ spaceName }, signer)
                    onCreateSpace(spaceId)
                })}
            >
                <FormField
                    control={form.control}
                    name="spaceName"
                    render={({ field }) => (
                        <FormItem>
                            <FormDescription>This will be the name of your space.</FormDescription>
                            <div className="flex gap-2">
                                <FormControl>
                                    <Input placeholder="Snowboarding Club" {...field} />
                                </FormControl>
                                <Button type="submit">
                                    {isPending ? 'Creating...' : 'Create'}
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
