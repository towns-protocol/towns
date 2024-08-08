import { z } from 'zod'

export type FormState = z.infer<typeof schema>

export const schema = z.object({
    name: z.string().min(1, 'Please enter a channel name'),
    description: z.string().min(0, 'Please enter a description').optional(),
    roleIds: z.string().array().nonempty('Please select at least one role'),
})
