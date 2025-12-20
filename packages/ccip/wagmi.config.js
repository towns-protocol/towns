import { defineConfig } from '@wagmi/cli'
import { foundry } from '@wagmi/cli/plugins'

export default defineConfig({
    out: 'src/generated.ts',
    plugins: [
        foundry({
            project: '../contracts',
            artifacts: 'out',
            include: [
                '**/IL1ResolverService.sol/*.json',
                '**/IExtendedResolver.sol/*.json',
                '**/IAddrResolver.sol/*.json', // only needed for tests
            ],
            forge: {
                build: false,
            },
        }),
    ],
})
