import { z } from 'zod'

export type CreateChannelFormSchema = z.infer<typeof CreateChannelFormSchema>

export const CreateChannelFormSchema = z.object({
    name: z.string().min(2, 'Channel names must have at least 2 characters'),
    topic: z.string(),
    roleIds: z.string().array().nonempty('Please select at least one role'),
    autojoin: z.boolean().default(false),
    hideUserJoinLeaveEvents: z.boolean().default(false),
})
