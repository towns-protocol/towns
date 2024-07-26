import { jsonStringify } from '@/utils/json-stringify'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../ui/hover-card'

export function JsonHover<T>({ children, data }: { children: React.ReactNode; data: T }) {
    return (
        <HoverCard openDelay={1500}>
            <HoverCardTrigger asChild>{children}</HoverCardTrigger>
            <HoverCardContent className="max-h-72 w-full overflow-auto text-zinc-800">
                <pre className="text-sm">{jsonStringify(data, 2)}</pre>
            </HoverCardContent>
        </HoverCard>
    )
}
