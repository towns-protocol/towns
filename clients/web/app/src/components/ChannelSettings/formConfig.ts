import { z } from 'zod'

export const FormStateKeys = {
    name: 'name',
    description: 'description',
    roleIds: 'roleIds',
} as const

export type FormState = {
    [FormStateKeys.name]: string
    [FormStateKeys.description]: string | undefined
    [FormStateKeys.roleIds]: string[]
}

export const schema = z.object({
    [FormStateKeys.name]: z.string().min(1, 'Please enter a channel name'),
    [FormStateKeys.description]: z.string().min(0, 'Please enter a description'),
    [FormStateKeys.roleIds]: z.string().array().nonempty('Please select at least one role'),
})

export const emptyDefaultValues = {
    [FormStateKeys.name]: '',
    [FormStateKeys.description]: undefined,
    [FormStateKeys.roleIds]: [],
}
