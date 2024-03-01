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

- Go 1.20 or higher
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

1. **Clone the Monorepo:**

   ```bash
   git clone https://github.com/HereNotThere/harmony.git
   ```

2. **Navigate to Monorepo:**
   ```bash
   cd harmony
   ```
3. **Deploy Contracts:**
   ```bash
   ./scripts/deploy-entitlement-checker.sh
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
4. **Run Go Vet:**

   ```bash
   make vet
   ```

5. **Run Linter:**
   ```bash
   make lint
   ```

---

## Multi-Instance Configuration and Launch

1. **Create Multi-Instance Configs:**

   ```bash
   ./create_multi.sh
   ```

   This will create five instance configurations in `./core/xchain/instance_1-5` using the template in `./core/xchain/config-template.yaml`.

2. **Launch Multiple Instances:**
   ```bash
   ./launch-multi.sh
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
