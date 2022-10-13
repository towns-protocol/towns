import React from 'react'
import TestRenderer from 'react-test-renderer'
import { describe, expect, it } from 'vitest'
import { toJsonTree } from 'utils/test_util'
import { Everything } from './Everything'

describe('Everything', () => {
    it('should match previous snapshot', () => {
        const component = TestRenderer.create(<Everything />)
        const tree = toJsonTree(component)
        expect(tree).toMatchSnapshot()
    })
})
