import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'

export const WizardFooter = ({
    step,
    totalSteps,
    onBack,
    onNext,
    isNextDisabled,
    isMinting,
}: {
    step: number
    totalSteps: number
    onBack: () => void
    onNext: () => void
    isNextDisabled?: boolean
    isMinting?: boolean
}) => {
    const isLast = step === totalSteps - 1

    return (
        <div className={cn('mt-6 flex justify-between', step === 0 && 'justify-end')}>
            {step !== 0 && (
                <Button variant="outline" disabled={step === 0} onClick={onBack}>
                    Back
                </Button>
            )}
            <Button
                type={isLast ? 'submit' : 'button'}
                disabled={isNextDisabled || isMinting}
                onClick={
                    isLast
                        ? undefined
                        : (e) => {
                              e.preventDefault()
                              onNext()
                          }
                }
            >
                {isLast ? (isMinting ? 'Minting...' : 'Mint') : 'Next'}
            </Button>
        </div>
    )
}
