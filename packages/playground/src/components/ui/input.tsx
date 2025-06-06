import * as React from 'react'

import { cn } from '@/utils'

type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                type={type}
                spellCheck={false}
                autoComplete="off"
                className={cn(
                    'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1',
                    'text-sm shadow-sm transition-colors placeholder:text-muted-foreground',
                    'file:border-0 file:bg-transparent file:text-sm file:font-medium',
                    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    className,
                )}
                ref={ref}
                {...props}
            />
        )
    },
)
Input.displayName = 'Input'

export { Input }
