import { useJoinSpace } from '@river-build/react-sdk'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useEthersSigner } from '@/utils/viem-to-ethers'
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

const joinSpaceFormSchema = z.object({
    spaceId: z.string().min(1, { message: 'Space Id is required' }),
})

export const JoinSpace = (props: { onJoinSpace: (spaceId: string) => void }) => {
    const { onJoinSpace } = props
    const { joinSpace, isPending } = useJoinSpace()
    const signer = useEthersSigner()
    const form = useForm<z.infer<typeof joinSpaceFormSchema>>({
        resolver: zodResolver(joinSpaceFormSchema),
        defaultValues: { spaceId: '' },
    })

    return (
        <Form {...form}>
            <form
                className="space-y-4"
                onSubmit={form.handleSubmit(async ({ spaceId }) => {
                    if (!signer) {
                        return
                    }
                    joinSpace(spaceId, signer).then(() => {
                        onJoinSpace(spaceId)
                    })
                })}
            >
                <FormField
                    control={form.control}
                    name="spaceId"
                    render={({ field }) => (
                        <FormItem>
                            <FormDescription>
                                The spaceId of the space you want to join.
                            </FormDescription>
                            <div className="flex gap-2">
                                <FormControl>
                                    <Input placeholder="spaceId" {...field} />
                                </FormControl>
                                <Button type="submit"> {isPending ? 'Joining...' : 'Join'}</Button>
                            </div>

                            <FormMessage />
                        </FormItem>
                    )}
                />
            </form>
        </Form>
    )
}
