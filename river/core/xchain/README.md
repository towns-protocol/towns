# README.md for XChain Ethereum Node Application in Monorepo

---

## Table of Contents

1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Monorepo Structure](#monorepo-structure)
4. [Installation and Deployment](#installation-and-deployment)
5. [Building and Running Using Makefile](#building-and-running-using-makefile)
6. [Multi-Instance Configuration and Launch](#multi-instance-configuration-and-launch)
7. [API Specification](#api-specification)
8. [Troubleshooting](#troubleshooting)
9. [Contributing](#contributing)

---

## Introduction

This XChain Node resides in a monorepo and interfaces with the `EntitlementChecker` smart contract. The node reads, executes requests, and posts results back to contracts conforming to `IEntitlementGated`.

---

## Prerequisites

- Go 1.22.2 or higher
- Foundry
- Make utility

---

## Monorepo Structure

- Root
  - `/core/xchain`: This Node
  - `/contracts`: Smart Contracts
  - `/scripts`: Smart Contract Deployment scripts

---

## Installation and Deployment

1. **Run Start Dev to configure and start servers:**

   ```bash
   ../../scripts/start_dev.sh
   ```

---

## Building and Running Using Makefile

1. **Navigate to `./core/xchain`:**

   ```bash
   cd ./core/xchain
   ```

2. **Build:**

   ```bash
   make build
   ```

3. **Run Tests:**

   ```bash
   make test
   ```

4. **Run Integration Tests**
   Note: this step requires that a local base chai nbe running.

   ```bash
   ../../scripts/start-local-basechain.sh
   make integration_tests
   ```

5. **Run Go Vet:**

   ```bash
   make vet
   ```

6. **Run Linter:**
   ```bash
   make lint
   ```

---

## Multi-Instance Configuration and Launch

1. ** Start the Dev environment **

   From the root of the repo, run the following command to start the dev environment:

   ```bash
   ./scripts/start_dev.sh
   ```

---

## API Specification for talking to the EntitlementChecker contract

### IEntitlementGated Interface Methods

- `requestEntitlementCheck()`: Clients call this to request an entitlement check.
- `postEntitlementCheckResult(transactionId, result)`: XChain Node calls to post the result of an entitlement check.
- `deleteTransaction(transactionId)`: Clients call to delete a transaction.

### IEntitlementChecker Interface Methods

- `registerNode()`: Registers a node. TODO integrate with Node Registery contract.
- `unregisterNode()`: Unregisters a node. TODO integrate with Node Registery contract.
- `nodeCount()`: Returns the count of registered nodes. Util to help with debugging
- `getRandomNodes(requestedNodeCount, requestingContract)`: Returns a set of random nodes.
- `emitEntitlementCheckRequested(transactionId, selectedNodes)`: Emits an event indicating an entitlement check request.

---

## Troubleshooting

- **Issue:** Node doesn't start

  - **Solution:** Validate that `common/localhost_entitlementChecker.json` and `common/localhost_entitlementGatedExample.json` contains the correct contract addresses.

- **Issue:** Failed transaction posting
  - **Solution:** Confirm Ethereum node connectivity and available funds for transactions.

---
