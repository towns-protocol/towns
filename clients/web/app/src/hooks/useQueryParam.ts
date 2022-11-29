import { useSearchParams } from 'react-router-dom'
import { isDev } from 'utils'

export function useQueryParams(...keys: string[]) {
    const [searchParams] = useSearchParams()
    if (!isDev) {
        return {}
    }
    return keys.reduce((acc: Record<string, unknown>, k) => {
        acc[k] = searchParams.get(k)
        return acc
    }, {})
}
