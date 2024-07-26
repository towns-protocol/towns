import { useCreateSpace, useSpace, useUserSpaces } from '@river-build/react-sdk'
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
    FormLabel,
    FormMessage,
} from '../ui/form'
import { Block, type BlockProps } from '../ui/block'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { JsonHover } from '../utils/json-hover'

type SpacesBlockProps = {
    changeSpace: (spaceId: string) => void
}

const formSchema = z.object({
    spaceName: z.string().min(1, { message: 'Space name is required' }),
})

export const SpacesBlock = ({ changeSpace }: SpacesBlockProps) => {
    const { spaceIds } = useUserSpaces()
    return (
        <Block title="Spaces">
            <CreateSpace variant="secondary" onCreateSpace={changeSpace} />
            <span className="text-xs">Select a space to start messaging</span>
            <div className="flex flex-col gap-1">
                {spaceIds.map((spaceId) => (
                    <SpaceInfo key={spaceId} spaceId={spaceId} changeSpace={changeSpace} />
                ))}
            </div>
            {spaceIds.length === 0 && (
                <p className="pt-4 text-center text-sm text-secondary-foreground">
                    You're not in any spaces yet.
                </p>
            )}
        </Block>
    )
}

const SpaceInfo = ({
    spaceId,
    changeSpace,
}: {
    spaceId: string
    changeSpace: (spaceId: string) => void
}) => {
    const { data: space } = useSpace(spaceId)
    return (
        <JsonHover data={space}>
            <div>
                <Button variant="outline" onClick={() => changeSpace(space.id)}>
                    {space.metadata?.name || 'Unnamed Space'}
                </Button>
            </div>
        </JsonHover>
    )
}

export const CreateSpace = (props: { onCreateSpace: (spaceId: string) => void } & BlockProps) => {
    const { onCreateSpace, ...rest } = props
    const { createSpace, isPending } = useCreateSpace()
    const signer = useEthersSigner()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { spaceName: '' },
    })

    return (
        <Block {...rest}>
            <Form {...form}>
                <form
                    className="space-y-8"
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
                                <FormLabel>New space name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Snowboarding Club" {...field} />
                                </FormControl>
                                <FormDescription>
                                    This will be the name of your space.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit"> {isPending ? 'Creating...' : 'Create'}</Button>
                </form>
            </Form>
        </Block>
    )
}
