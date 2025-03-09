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
- Yarn package manager
- Access to an Ethereum RPC endpoint (local or remote)

## Getting Started

Follow these steps to set up and run the River Subgraph locally:

1. **Start a local blockchain**:

   ```bash
   # Start Anvil (local Ethereum node)
   anvil
   ```

2. **Set the environment**:

   ```bash
   export RIVER_ENV=multi_local
   ```

3. **Deploy the contracts**:

   ```bash
   ./scripts/deploy-contract.sh
   ```

4. **Start the Ponder development server**:

   ```bash
   ponder dev
   ```

   This will start indexing events from the deployed contracts and serve the GraphQL API.

5. **Interact with the contracts to generate events**:
   ```bash
   make interact-any-local context=$RIVER_ENV rpc=base_anvil contract=InteractCreateSpace
   ```

## Available Commands

- `yarn dev`: Start the development server with hot reloading
- `yarn start`: Start the production server
- `yarn db`: Access the database CLI
- `yarn codegen`: Generate TypeScript types from the schema
- `yarn serve`: Serve the API without indexing
- `yarn lint`: Run ESLint
- `yarn typecheck`: Run TypeScript type checking

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

## Troubleshooting

If you encounter issues:

1. Ensure your environment variables are correctly set
2. Check that the contracts are properly deployed
3. Verify that the Ponder server is running
4. Check the console for any error messages

## Contributing

Contributions to improve the River Subgraph are welcome. Please ensure your code follows the project's coding standards and includes appropriate tests.
