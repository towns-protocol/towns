# Debug Tips

## Logging

Enabling logging for tests in the shell:

    DEBUG=csb:* DEBUG_DEPTH=100 yarn test src/my.test.ts -t testCaseName

To enabling debug logging in the browser, set var in console:

    localStorage.debug = 'csb:*'

## Inspecting Network Traffic

Set this in console to switch encoding to JSON instead of binary:

    localStorage.RIVER_DEBUG_TRANSPORT = 'true'

Now in Network tab of the browser dev tool requests and responses are more readable.
