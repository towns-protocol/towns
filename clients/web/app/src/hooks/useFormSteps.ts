import { useState } from 'react'

type FormStepComponent = ({ onSubmit, id }: FormStepProps) => JSX.Element

export type FormStepProps = { onSubmit: () => void; id: string }

export const useFormSteps = (
    formId: string,
    initialSteps: FormStepComponent[] = [],
    startAt = 0,
) => {
    const [stepIndex, setStepIndex] = useState(startAt)
    const [steps, setSteps] = useState<FormStepComponent[]>(initialSteps)

    const hasPrev = stepIndex > 0
    const isLast = stepIndex === steps.length - 1
    const goNext = () => setStepIndex(stepIndex + 1)
    const goPrev = () => setStepIndex(stepIndex - 1)

    const addStep = (step: FormStepComponent) => {
        setSteps((steps) => [...steps, step])
    }

    const StepComponent = steps[stepIndex]

    const id = `${formId}-step-${stepIndex}`

    return {
        stepIndex,
        steps,
        goNext,
        goPrev,
        addStep,
        StepComponent,
        hasPrev,
        isLast,
        id,
    }
}
