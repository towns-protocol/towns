expect.extend({
    async toResolve(receivedPromise) {
        const { printReceived, matcherHint } = this.utils
        try {
            const result = await receivedPromise
            return {
                pass: true,
                message: () =>
                    this.isNot
                        ? matcherHint('.not.toResolve', 'promise', '') +
                          '\n\nbut it resolved with:\n\n' +
                          printReceived(result)
                        : '',
            }
        } catch (e) {
            const msg = !this.isNot
                ? matcherHint('.toResolve', 'promise', '') +
                  '\n\nbut it rejected with:\n\n' +
                  printReceived(e)
                : ''
            if (!this.isNot && e instanceof Error) {
                // Rethrow Error to get nice formatted call stack.
                e.message = msg
                throw e
            } else {
                return {
                    pass: false,
                    message: () => msg,
                }
            }
        }
    },

    async toReject(receivedPromise) {
        const { printReceived, matcherHint } = this.utils
        try {
            const result = await receivedPromise
            return {
                pass: false,
                message: () =>
                    !this.isNot
                        ? matcherHint('.toReject', 'promise', '') +
                          '\n\nbut it resolved with:\n\n' +
                          printReceived(result)
                        : '',
            }
        } catch (e) {
            const msg = this.isNot
                ? matcherHint('.not.toReject', 'promise', '') +
                  '\n\nbut it rejected with:\n\n' +
                  printReceived(e)
                : ''
            if (this.isNot && e instanceof Error) {
                // Rethrow Error to get nice formatted call stack.
                e.message = msg
                throw e
            }
            return {
                pass: true,
                message: () => msg,
            }
        }
    },
})
