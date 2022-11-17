import { UseFormReturn, useForm } from 'react-hook-form'

type Props = {
    children: (args: UseFormReturn) => JSX.Element
}

export const DummyReactHooksFormWrapper = ({ children }: Props) => {
    const formProps = useForm()
    formProps.watch()
    return children(formProps)
}
