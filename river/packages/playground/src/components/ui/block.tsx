import { cva } from 'class-variance-authority'

export type BlockProps = {
    children?: React.ReactNode
    title?: string
    variant?: 'primary' | 'secondary'
    className?: string
}

export const Block = ({ children, title, variant = 'primary', className }: BlockProps) => {
    return (
        <div className={blockVariants({ variant, className })}>
            {title && (
                <h2 className="text-sm font-semibold text-primary text-zinc-700 dark:text-zinc-300">
                    {title}
                </h2>
            )}
            {children}
        </div>
    )
}

const blockVariants = cva('flex flex-col gap-2 rounded-sm border p-4', {
    variants: {
        variant: {
            primary: 'border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900',
            secondary: 'border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900',
        },
    },
    defaultVariants: {
        variant: 'primary',
    },
})
