# XChain Monitoring Service

Monitor the chain for XChain transaction and emit error logs whenever a transaction is unterminated.

## Local development

Copy `.env.example` to `.env.local` and be sure to add in a BASE_PROVIDER_URL. (We are unable
to use viem's default provider as it frequently 503s.)

To start the service, run

```
yarn dev
```
