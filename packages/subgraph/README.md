# River Subgraph

This package contains the subgraph implementation for indexing River protocol events on the blockchain.

## Overview

The River Subgraph indexes key events from the River protocol smart contracts to provide fast and efficient access to protocol data. It uses [Ponder](https://ponder.sh/) as the indexing framework, which offers a modern and developer-friendly approach to blockchain data indexing.

## Key Features

- Indexes blockchain events from River protocol contracts
- Specifically tracks `SpaceCreated` events from the CreateSpace facet
- Stores space data in a structured database including:
  - Space address (as ID)
  - Owner address
  - Token ID
- Provides both GraphQL and SQL query interfaces
- Offers real-time data indexing during development

## Architecture

The subgraph consists of:

- **Event Handlers**: Process blockchain events and store data in the database
- **Schema**: Defines the data model for indexed entities
- **API**: Exposes GraphQL and SQL endpoints for querying indexed data
- **Configuration**: Sets up network connections and contract monitoring

## Prerequisites

- Node.js >= 18.14
- Bun package manager
- Access to an Ethereum RPC endpoint (local or remote)
- Foundry tools (forge, anvil) for local blockchain development

### Running with Docker Compose

```bash
# For Alpha environment
docker compose --env-file .env.alpha up -d

# For Beta environment
docker compose --env-file .env.beta up -d

# For Omega environment
docker compose --env-file .env.omega up -d
```

### Testing the Setup

After starting the services, the API server will be available at http://localhost:42069

Check the following endpoints:

- http://localhost:42069/graphql - Interactive GraphQL playground
- http://localhost:42069/status - Service status information
- http://localhost:42069/ready - Readiness check
- http://localhost:42069/metrics - Prometheus metrics
- http://localhost:42069/health - Health check endpoint

### Managing Services

```bash
# View logs for the indexer (specify environment file)
docker compose --env-file .env.alpha logs -f subgraph-indexer

# View logs for the API server (specify environment file)
docker compose --env-file .env.alpha logs -f subgraph-server

# Stop all services (specify environment file)
docker compose --env-file .env.alpha down

# Stop services and remove volumes (specify environment file)
docker compose --env-file .env.alpha down -v
```

### Troubleshooting

If you encounter issues:

1. **Indexer not starting**: Check that the database is healthy and accessible
2. **API server not responding**: Ensure the indexer has started successfully first
3. **Data not appearing**: Verify the indexer is processing events (check logs)
4. **Port conflicts**: Ensure port 42069 (API) and 5432 (PostgreSQL) are available
5. **Indexer crashing with schema conflict**: Ensure you've removed volume as part of shutdown to prevent schema name conflicts.

## Update schema.graphql

```
# regenerate schema.graphql file with a headless instance
bun run dev:no-ui
```

## Getting Started

Follow these steps to set up and run the River Subgraph locally:

### Option 1: Using the Automated Setup Script

The easiest way to get started is to use our automated setup script:

```bash
# Start the subgraph with an Anvil fork
bun run dev:fork
```

This script will:

1. Create an Anvil fork of the Base Sepolia testnet
2. Configure the subgraph to use the correct block number
3. Start the Ponder development server

### Option 2: Manual Setup

If you prefer more control, you can set up each component manually:

1. **Start an Anvil fork**:

   ```bash
   # Start Anvil fork of Base Sepolia
   ./scripts/anvil-fork.sh
   ```

2. **Set the environment**:

   ```bash
   export RIVER_ENV=beta
   export PONDER_RPC_URL_1=http://localhost:8545
   ```

3. **Start the Ponder development server**:

   ```bash
   cd packages/subgraph
   bun run dev
   ```

## Interacting with Contracts

To create events for the subgraph to index, you can interact with the contracts using the Makefile commands:

```bash
# Create a new space on the Anvil fork
cd contracts
make interact-any-local context=beta rpc=base_anvil contract=InteractCreateSpace
```

This will:

1. Execute the `InteractCreateSpace` script
2. Create a new space on your Anvil fork
3. Emit events that the subgraph will index

The subgraph will automatically detect these events and update its database accordingly.

## Contract Address Resolution

The subgraph uses a dynamic contract address resolution system to find the correct contract addresses based on the current environment:

```typescript
// Get a single contract address
const spaceFactoryAddress = getContractAddress("spaceFactory", "base", "alpha");
```

This system automatically:

- Reads from the correct environment (alpha, beta, omega, etc.)
- Finds the correct network (base, mainnet, etc.)
- Falls back to default environments if needed: beta
- Provides detailed error messages for troubleshooting

## Debugging Tools

If you encounter issues with contract address resolution, you can use our debugging tools:

```bash
# Find the correct path to contract deployments
bun run find-paths
```

You can also enable debug mode in the code:

```typescript
const address = getContractAddress("contractName", network, env, {
  debug: true,
});
```

## Available Commands

- `bun run dev`: Start the development server with hot reloading
- `bun run dev:fork`: Start with an Anvil fork of Base Sepolia
- `bun run start`: Start the production server
- `bun run db`: Access the database CLI
- `bun run codegen`: Generate TypeScript types from the schema
- `bun run serve`: Serve the API without indexing
- `bun run lint`: Run ESLint
- `bun run typecheck`: Run TypeScript type checking
- `bun run find-paths`: Debug tool to find correct contract paths

## API Endpoints

The subgraph exposes the following API endpoints:

- `/graphql`: GraphQL API for querying indexed data
- `/sql`: SQL API for direct database queries

## Data Model

The subgraph currently indexes the following entities:

- **Space**: Represents a space created in the River protocol
  - `id`: The address of the space (primary key)
  - `owner`: The address of the space owner
  - `tokenId`: The token ID associated with the space

## Environment Configuration

The subgraph uses several environment variables for configuration:

- `PONDER_RPC_URL_1`: RPC URL for the blockchain network (default: http://localhost:8545)
- `PONDER_START_BLOCK`: Block number to start indexing from
- `PONDER_ENVIRONMENT`: Environment to use for contract addresses (default: beta)

These can be set in a `.env.local` file or via the command line.

## Working with Different Environments

The subgraph supports multiple environments:

- **alpha**: Development environment
- **beta**: Staging environment
- **omega**: Production environment

To switch environments:

```bash
# Using the fork script
bun run dev:fork --environment beta

# Or manually
export PONDER_ENVIRONMENT=beta
bun run dev
```

## Troubleshooting

If you encounter issues:

1. **Contract Address Resolution**:

   - Run `bun run find-paths` to debug path resolution
   - Enable debug mode: `getContractAddress('contractName', network, env, { debug: true })`
   - Check that the environment is correctly set

2. **Anvil Fork Issues**:

   - Ensure Anvil is running and accessible at the expected port
   - Check for error messages in the Anvil console
   - Try restarting the fork with `./scripts/anvil-fork.sh`

3. **Indexing Issues**:

   - Verify that the start block is set correctly
   - Check that the contract addresses are correct
   - Look for error messages in the Ponder console

4. **General Issues**:
   - Ensure your environment variables are correctly set
   - Check that the contracts are properly deployed
   - Verify that the Ponder server is running

## Contributing

Contributions to improve the River Subgraph are welcome. Please ensure your code follows the project's coding standards and includes appropriate tests.

## Advanced Usage

### Custom Contract Interactions

You can create custom contract interactions to generate specific events:

```bash
# Create a custom interaction script
make interact-any-local context=beta rpc=base_anvil contract=YourCustomInteraction
```

### Transfer Ownership

```bash
bun run transfer-ownership
```

### Working with Multiple Networks

The subgraph can be configured to work with multiple networks simultaneously:

```typescript
// In ponder.config.ts
export default createConfig({
  networks: {
    anvil: {
      chainId: 31337,
      transport: http(process.env.PONDER_RPC_URL_1),
    },
    base: {
      chainId: 8453,
      transport: http(process.env.PONDER_RPC_URL_2),
    },
  },
  // ...
});
```

### Custom Event Handlers

You can create custom event handlers to process specific events:

```typescript
// In your event handler file
ponder.on("CreateSpace:SpaceCreated", async ({ event, context }) => {
  // Custom logic to process the event
});
```

## Setup Ponder for Docker

You can run Ponder in a docker container with a local postgres database. The setup uses a dual-instance architecture for better performance and scalability:

- **subgraph-indexer**: Handles blockchain event indexing and data processing
- **subgraph-server**: Serves HTTP API requests (GraphQL/SQL) without affecting indexing performance

### Architecture Benefits

This separation provides:

- Improved performance by preventing HTTP traffic from affecting indexing
- Ability to scale API servers horizontally if needed
- Better resource isolation between indexing and serving
- Continued indexing even if the API server experiences issues
