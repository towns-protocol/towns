import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { getRefreshStatus } from 'api/lib/fetchImage'

export const useWaitForInvalidation = (
    invalidationId: string | undefined,
    options?: {
        onSuccess?: () => void
    },
) => {
    const query = useQuery({
        queryKey: ['invalidation-status', invalidationId],
        queryFn: async () => {
            if (!invalidationId) {
                return
            }
            const { status } = await getRefreshStatus(invalidationId)
            if (status !== 'completed') {
                throw new Error('Invalidation not completed')
            }
            return status
        },
        retry: 8,
        // Cloudfront invalidations takes 10 to 100 seconds to complete
        // 10s 15s 22.5s 33.75s 50.625s 75.9375s 113.90625s 150s
        retryDelay: (attempt) => Math.min(10_000 * Math.pow(1.5, attempt), 150_000),
        enabled: !!invalidationId,
    })

    const hasRunOnce = useRef(false)
    useEffect(() => {
        if (query.isSuccess && options?.onSuccess && !hasRunOnce.current) {
            options.onSuccess()
            hasRunOnce.current = true
        }
    }, [options, options?.onSuccess, query.isSuccess])

    return query
}
