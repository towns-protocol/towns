import { useSearchParams } from 'react-router-dom'
import { env } from 'utils'

export function useQueryParams(...keys: string[]) {
    const [searchParams] = useSearchParams()
    if (!env.IS_DEV) {
        return {}
    }
    return keys.reduce((acc: Record<string, unknown>, k) => {
        acc[k] = searchParams.get(k)
        return acc
    }, {})
}
