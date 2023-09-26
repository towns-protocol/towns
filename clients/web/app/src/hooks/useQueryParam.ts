import { useSearchParams } from 'react-router-dom'
import { env } from 'utils'

// a helper function for adding query params in local development i.e. to test a feature or bypass some other UI
export function useDevOnlyQueryParams(...keys: string[]) {
    const [searchParams] = useSearchParams()
    if (!env.DEV) {
        return {}
    }
    return keys.reduce((acc: Record<string, unknown>, k) => {
        acc[k] = searchParams.get(k)
        return acc
    }, {})
}
