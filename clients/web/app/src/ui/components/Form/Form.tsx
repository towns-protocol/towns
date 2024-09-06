import React from 'react'
import {
    DefaultValues,
    FieldValues,
    FormProvider,
    Mode,
    UseFormReturn,
    useForm,
    useFormContext,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ZodTypeAny } from 'zod'
import { Box, BoxProps } from 'ui/components/Box/Box'

type FormProps<T extends FieldValues> = {
    children: React.ReactNode
    defaultValues?: DefaultValues<T>
    onSubmit?: (data: T) => void
    id?: string
    mode?: Mode
    schema?: ZodTypeAny
} & Omit<BoxProps, 'onSubmit'>

/**
 * Automatically injects the result of useForm() into children props
 *
 * <Form>
 *  <FormChild>
 * </Form>
 */
export function Form<T extends FieldValues>({
    id,
    defaultValues,
    children,
    onSubmit,
    mode = 'onSubmit',
    schema,
    ...boxProps
}: FormProps<T>) {
    const form = useForm<T>({
        defaultValues,
        mode,
        resolver: schema ? zodResolver(schema) : undefined,
    })

    return (
        <FormProvider {...form}>
            <Box
                as="form"
                id={id}
                onSubmit={form.handleSubmit(onSubmit ?? (() => null))}
                {...boxProps}
            >
                {children}
            </Box>
        </FormProvider>
    )
}

type ChildrenWithFormProps<T extends FieldValues> = {
    children: (props: UseFormReturn<T>) => JSX.Element
}

type FormChildrenFnProps<T extends FieldValues> = Omit<FormProps<T>, 'children'> &
    ChildrenWithFormProps<T>

const FormChild = <T extends FieldValues>(props: unknown & ChildrenWithFormProps<T>) => {
    const { children } = props
    const formProps = useFormContext()
    return children(formProps as UseFormReturn<T>)
}

/**
 * Exposes the result of useForm() to children as a function
 * Maybe more type safety than <Form>, maybe we only want the children function version
 *
 * <FormRender>
 *  {(useFormProps) => <input {...useFormProps.register('name')} />}
 * </FormRender>
 */
export function FormRender<T extends FieldValues>({ children, ...props }: FormChildrenFnProps<T>) {
    return (
        <Form<T> {...props}>
            <FormChild>{children}</FormChild>
        </Form>
    )
}
