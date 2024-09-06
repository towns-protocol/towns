import { useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { useShallow } from 'zustand/react/shallow'

/**
 * Returns the stored form value for a given formId
 *
 * const defaultValue = usePeristedFormValue(formId)
 * return <Form defaultValue={defaultValue} />
 */
export const usePeristedFormValue = (formId: string | null) => {
    return usePersistedFormStateStore(
        useShallow((state) => (formId ? state.formDataByChannel[formId] : undefined)),
    )
}

/**
 * Utility component to persist form data inside forms shortcut for adding
 * `usePersistForm` inside a form
 * <Form>
 *    ...
 *    <PersistForm />
 * </Form>
 */
export const PersistForm = (props: { formId: string }) => {
    usePersistForm(props.formId)
    return null
}

export const usePersistForm = (formId: string) => {
    const context = useFormContext()
    if (!context) {
        throw new Error('usePersistForm must be used inside a FormProvider')
    }
    const { watch } = context
    const setFormData = usePersistedFormStateStore((state) => state.setFormData)
    const watchedFields = watch()
    useEffect(() => {
        setFormData(formId, watchedFields)
    }, [formId, setFormData, watchedFields])
}

// - - -- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Zustand part

type FormValue = { [key: string]: unknown }

interface StoreState<FormValue> {
    formDataByChannel: Record<string, FormValue>
    setFormData: (formId: string, formData: FormValue) => void
}

const usePersistedFormStateStore = create<StoreState<FormValue>>()(
    immer((set) => ({
        formDataByChannel: {} as Record<string, FormValue>,
        setFormData: (formId: string, formData: FormValue) =>
            set((state) => {
                if (formId) {
                    state.formDataByChannel[formId] = formData
                }
            }),
    })),
)
