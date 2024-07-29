import { vi } from 'vitest'
import * as analytics from 'hooks/useAnalytics'
import { mapToErrorMessage } from './utils'

test('calling mapToErrorMessage without code, name and category tracks the default', () => {
    const trackingSpy = vi.spyOn(analytics, 'trackError')
    const error = new Error('my error message')
    const source = 'test source'
    mapToErrorMessage({ error, source })
    // default fallback
    expect(trackingSpy).toHaveBeenCalledWith({
        error,
        category: 'misc',
        code: 'unknown',
        source,
        name: 'Error',
        displayText: 'Error unknown my error message',
    })
})

test('calling mapToErrorMessage with code, name and category tracks those items', () => {
    const trackingSpy = vi.spyOn(analytics, 'trackError')
    const error = new Error('my error message')
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    error.code = 'my code'
    error.name = 'my name'
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    error.category = 'my category'
    const source = 'test source'
    mapToErrorMessage({ error, source })
    expect(trackingSpy).toHaveBeenCalledWith({
        error,
        category: 'my category',
        code: 'my code',
        source,
        name: 'my name',
        displayText: 'my name my code my error message',
    })
})
