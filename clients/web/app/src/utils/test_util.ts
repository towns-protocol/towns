import TestRenderer from 'react-test-renderer'
import { expect } from 'vitest'

export const toJsonTree = (component: TestRenderer.ReactTestRenderer) => {
    const result = component.toJSON()
    expect(result).toBeDefined()
    expect(result).not.toBeInstanceOf(Array)
    return result as TestRenderer.ReactTestRendererJSON
}
