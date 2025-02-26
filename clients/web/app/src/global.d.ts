import { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers'
declare global {
    namespace Vi {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        interface JestAssertion<T = any>
            extends jest.Matchers<void, T>,
                TestingLibraryMatchers<T, void> {}
    }
    interface Window {
        townsAppStartTime: number
        townsMeasureFlag: boolean
    }
}
