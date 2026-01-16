# Global Usernames

## Overview

The Towns Protocol Global Usernames system implements an ENS-compatible cross-chain domain registry system that enables **Global Usernames** - portable usernames (e.g., `ben.towns.eth`) that work across all Towns spaces, channels, chats, GDMS, and DMs. Instead of showing wallet addresses, users see `@ben` with their profile.

### Key Features

| Feature                    | Description                                                       |
| -------------------------- | ----------------------------------------------------------------- |
| **L2 Subdomains**          | Register subdomains on Base L2 (e.g., `ben.towns.eth`)            |
| **NFT Ownership**          | Each subdomain is an ERC721 token, enabling transfers             |
| **Cross-chain Resolution** | Resolves via ENS from L1 using CCIP-Read (EIP-3668)               |
| **Profile Data**           | Store display name, avatar, bio as resolver text records          |
| **Multi-coin Addresses**   | Support ETH (coinType 60) and chain-specific addresses (ENSIP-11) |
| **Tiered Pricing**         | First registration free, subsequent charged via FeeManager        |

## Deployed Addresses

### L2 Registrar

| Network       | Address                                      | Status    |
| ------------- | -------------------------------------------- | --------- |
| Base Sepolia  | `0xCfF032706DE34B65F49d51be68E1eb34F3ffb560` | Deployed  |
| Base (Mainnet)| TBD                                          | Pending   |

## Architecture

The system consists of three main components deployed across two chains:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ETHEREUM L1 (MAINNET)                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     L1 Resolver Diamond                             │    │
│  │  ┌─────────────────────┐                                            │    │
│  │  │  L1ResolverFacet    │ ─── CCIP-Read (EIP-3668)                   │    │
│  │  │  - resolve()        │     OffchainLookup → Gateway               │    │
│  │  │  - resolveWithProof │     ← Verified response                    │    │
│  │  └─────────────────────┘                                            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ CCIP-Read
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CCIP GATEWAY SERVICE                             │
│  - Receives OffchainLookup requests                                         │
│  - Queries L2 Registry via RPC                                              │
│  - Signs responses with expiration                                          │
│  - Returns (result, expires, signature)                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ RPC Query
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               BASE L2                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      L2 Registry Diamond                            │    │
│  │  ┌─────────────────────┐  ┌─────────────────────┐                   │    │
│  │  │  L2RegistryFacet    │  │  AddrResolverFacet  │                   │    │
│  │  │  - createSubdomain()│  │  - setAddr()        │                   │    │
│  │  │  - ERC721 functions │  │  - addr()           │                   │    │
│  │  └─────────────────────┘  └─────────────────────┘                   │    │
│  │  ┌─────────────────────┐  ┌─────────────────────┐                   │    │
│  │  │  TextResolverFacet  │  │  ContentHashFacet   │                   │    │
│  │  │  - setText()        │  │  - setContenthash() │                   │    │
│  │  │  - text()           │  │  - contenthash()    │                   │    │
│  │  └─────────────────────┘  └─────────────────────┘                   │    │
│  │  ┌─────────────────────┐                                            │    │
│  │  │ ExtendedResolverFacet│ ← Direct L2 resolution                    │    │
│  │  └─────────────────────┘                                            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     L2 Registrar Diamond                            │    │
│  │  ┌─────────────────────┐  ┌─────────────────────┐                   │    │
│  │  │  L2RegistrarFacet   │  │  DomainFeeHook      │                   │    │
│  │  │  - register()       │──│  - onChargeFee()    │                   │    │
│  │  │  - isAvailable()    │  │  - tiered pricing   │                   │    │
│  │  └─────────────────────┘  └─────────────────────┘                   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Contract Hierarchy

| Component                  | Location             | Purpose                                     |
| -------------------------- | -------------------- | ------------------------------------------- |
| `L1ResolverFacet`          | `facets/l1/`         | CCIP-Read resolver on Ethereum mainnet      |
| `L1ResolverMod`            | `facets/l1/`         | L1 resolver storage, signature verification |
| `L2RegistryFacet`          | `facets/l2/`         | Domain NFT registry (ERC721) on Base        |
| `L2RegistryMod`            | `facets/l2/modules/` | Subdomain creation, registrar management    |
| `AddrResolverFacet`        | `facets/l2/`         | Multi-coin address records (SLIP-44)        |
| `TextResolverFacet`        | `facets/l2/`         | Key-value text records                      |
| `ContentHashResolverFacet` | `facets/l2/`         | IPFS/IPNS/Swarm content hashes              |
| `ExtendedResolverFacet`    | `facets/l2/`         | EIP-3668 direct on-chain resolution         |
| `L2RegistrarFacet`         | `facets/registrar/`  | Subdomain registration with validation      |
| `L2RegistrarMod`           | `facets/registrar/`  | Label validation, fee charging              |
| `DomainFeeHook`            | `hooks/`             | Tiered pricing, first-free logic            |

### Module Files

| Module                   | Purpose                                              |
| ------------------------ | ---------------------------------------------------- |
| `AddrResolverMod`        | Address storage with versioning (SLIP-44 coin types) |
| `TextResolverMod`        | Text record storage with versioning                  |
| `ContentHashResolverMod` | Content hash storage with versioning                 |
| `VersionRecordMod`       | Record versioning for atomic invalidation            |

## Storage Layout

Each module uses the diamond storage pattern with unique storage slots:

| Module                   | Storage Slot    | Contents                                                |
| ------------------------ | --------------- | ------------------------------------------------------- |
| `L1ResolverMod`          | `0xad5af01a...` | gatewayUrl, gatewaySigner, nameWrapper, registryByNode  |
| `L2RegistryMod`          | `0xd006f566...` | baseNode, names, metadata, registrars, token (ERC721)   |
| `AddrResolverMod`        | `0x8b8a0bb4...` | versionable_addresses[version][node][coinType]          |
| `TextResolverMod`        | `0xccd57d47...` | versionable_texts[version][node][key]                   |
| `ContentHashResolverMod` | `0x792df830...` | versionable_hashes[version][node]                       |
| `VersionRecordMod`       | `0xf2220575...` | recordVersions[node]                                    |
| `L2RegistrarMod`         | `0xd8d41403...` | registry, coinType, spaceFactory, currency              |
| `DomainFeeHook`          | `0x54805b38...` | defaultPrice, priceTiers, registrationCount, feeManager |

## Core Flows

### 1. Cross-chain Resolution Flow (L1 → Gateway → L2)

When a user resolves `ben.towns.eth` from Ethereum mainnet:

```
User/Client: resolve("ben.towns.eth", addr(bytes32))
  │
  ├─ 1. ENS Registry forwards to L1ResolverFacet
  │
  ├─ 2. L1ResolverFacet.resolve()
  │     ├─ Parse name → extract parent domain (towns.eth)
  │     ├─ Look up L2Registry for parent node
  │     └─ REVERT OffchainLookup(gatewayUrl, callData, callback)
  │
  ├─ 3. Client calls CCIP Gateway
  │     ├─ Gateway calls L2 Registry via RPC
  │     ├─ Gets resolver data (addr, text, etc.)
  │     └─ Returns signed response (result, expires, sig)
  │
  ├─ 4. Client calls L1ResolverFacet.resolveWithProof()
  │     ├─ Verify signature from gatewaySigner
  │     ├─ Check expiration timestamp
  │     └─ Return verified result
  │
  └─ 5. Client receives resolved address
```

### 2. Subdomain Registration Flow

When a user registers `ben.towns.eth`:

```
User (Smart Account): L2RegistrarFacet.register("ben", accountAddr)
  │
  ├─ 1. Verify Caller
  │     └─ Must be IModularAccount (towns smart account)
  │
  ├─ 2. Validate Label
  │     ├─ Length: 3-63 characters
  │     ├─ Characters: a-z, 0-9, hyphen
  │     └─ No leading/trailing hyphens
  │
  ├─ 3. Charge Fee (via FeeManager + DomainFeeHook)
  │     ├─ First registration: FREE
  │     └─ Subsequent: Tiered by label length
  │
  ├─ 4. Create Subdomain (L2Registry.createSubdomain)
  │     ├─ Compute subdomainHash = keccak256(parentNode, keccak256(label))
  │     ├─ Mint NFT (tokenId = uint256(subdomainHash))
  │     ├─ Store DNS-encoded name
  │     └─ Set initial records via delegatecall
  │
  ├─ 5. Set Address Records
  │     ├─ setAddr(node, coinType, owner) for current chain
  │     └─ setAddr(node, 60, owner) for ETH mainnet
  │
  └─ 6. Emit Events
      ├─ NewOwner(parentNode, labelhash, owner)
      ├─ SubnodeCreated(node, name, owner)
      └─ NameRegistered(label, owner)
```

### 3. Record Update Flow

When a domain owner updates resolver records:

```
Owner: AddrResolverFacet.setAddr(usernameHash, coinType, addr)
       TextResolverFacet.setText(usernameHash, "avatar", "ipfs://...")
  │
  ├─ 1. Authorization Check (L2RegistryMod.onlyAuthorized)
  │     ├─ Is caller the token owner?
  │     ├─ Is caller approved by token owner?
  │     └─ Is caller an approved registrar?
  │
  ├─ 2. Get Current Version
  │     └─ version = VersionRecordMod.recordVersions[usernameHash]
  │
  ├─ 3. Update Storage
  │     └─ versionable_addresses[version][usernameHash][coinType] = addr
  │
  └─ 4. Emit Event
      └─ AddressChanged(usernameHash, coinType, addr)
```

### 4. Record Clearing Flow

When an owner wants to clear all records atomically:

```
Owner: clearRecords(node)
  │
  ├─ 1. Increment version number
  │     └─ recordVersions[node]++
  │
  └─ 2. All previous records become inaccessible
      └─ Queries use new version, old records orphaned
```

## Access Control

### L2 Registry Access Control

| Action                 | Who Can Perform                             |
| ---------------------- | ------------------------------------------- |
| `createSubdomain`      | Domain owner OR approved registrar          |
| `addRegistrar`         | Root domain owner only                      |
| `removeRegistrar`      | Root domain owner only                      |
| `setMetadata`          | Approved registrar only                     |
| `setAddr/setText/etc.` | Node owner, approved operator, OR registrar |

### L2 Registrar Access Control

| Action            | Who Can Perform                             |
| ----------------- | ------------------------------------------- |
| `register`        | Towns smart accounts only (IModularAccount) |
| `setRegistry`     | Contract owner only                         |
| `setSpaceFactory` | Contract owner only                         |
| `setCurrency`     | Contract owner only                         |

### L1 Resolver Access Control

| Action             | Who Can Perform                            |
| ------------------ | ------------------------------------------ |
| `setL2Registry`    | ENS node owner (via NameWrapper or direct) |
| `setGatewayURL`    | Contract owner only                        |
| `setGatewaySigner` | Contract owner only                        |

## Label Validation Rules

The registrar enforces DNS-compatible label rules:

| Rule                | Constraint                            |
| ------------------- | ------------------------------------- |
| **Length**          | 3-63 characters                       |
| **Characters**      | Lowercase a-z, digits 0-9, hyphen (-) |
| **Hyphen Position** | Cannot start or end with hyphen       |
| **Case**            | Must be lowercase (no uppercase)      |

```solidity
// Character validation bitmask
ALLOWED_LABEL_CHARS = LOWERCASE_7_BIT_ASCII | DIGITS_7_BIT_ASCII | (1 << 45)
// 45 = ASCII code for hyphen '-'
```

## Fee Structure

### DomainFeeHook Pricing Logic

```
Registration Fee Calculation:
  │
  ├─ If registrationCount[user] == 0
  │     └─ Fee = 0 (first registration FREE)
  │
  └─ Else
      ├─ Get labelLength from context
      ├─ price = priceTiers[labelLength]
      └─ If price == 0 → use defaultPrice $5.00
```

### Fee Hook Integration

```solidity
// In L2RegistrarMod.chargeFee()
uint256 expectedFee = IFeeManager(spaceFactory).calculateFee(
    FeeTypesLib.DOMAIN_REGISTRATION,
    msg.sender,
    0,
    abi.encode(bytes(label).length)  // extraData = label length
);

ProtocolFeeLib.chargeAlways(
    spaceFactory,
    FeeTypesLib.DOMAIN_REGISTRATION,
    msg.sender,
    currency,
    expectedFee,
    expectedFee,
    extraData
);
```

## ENS Compatibility

### Supported Resolver Interfaces

| Interface              | EIP      | Function                                       |
| ---------------------- | -------- | ---------------------------------------------- |
| `IAddrResolver`        | EIP-137  | `addr(bytes32 node)` → ETH address             |
| `IAddressResolver`     | EIP-2304 | `addr(bytes32, uint256 coinType)` → multi-coin |
| `ITextResolver`        | EIP-634  | `text(bytes32, string key)` → text records     |
| `IContentHashResolver` | EIP-1577 | `contenthash(bytes32)` → IPFS/Swarm            |
| `IExtendedResolver`    | EIP-3668 | `resolve(bytes, bytes)` → CCIP-Read            |

### Coin Type Mapping (ENSIP-11)

For L2 address resolution, coin types are computed as:

```solidity
// ENSIP-11: Maps EVM chainId to ENS coinType
coinType = 0x80000000 | block.chainid

// Examples:
// Base (chainId 8453) → coinType 2147492101
// Ethereum (chainId 1) → coinType 60 (SLIP-44 standard)
```

### Common Text Record Keys

| Key                   | Purpose                           |
| --------------------- | --------------------------------- |
| `displayName`         | Human-readable display name       |
| `avatar`              | Profile picture URL (IPFS, HTTPS) |
| `description` / `bio` | User bio text                     |
| `url`                 | Personal website                  |
| `email`               | Email address                     |
| `com.twitter`         | Twitter handle                    |
| `com.discord`         | Discord username                  |
| `com.github`          | GitHub username                   |

## Integration Examples

### Register a Subdomain

```solidity
// User must be a Towns smart account (IModularAccount)
IL2Registrar registrar = IL2Registrar(REGISTRAR_ADDRESS);

// Check availability first
require(registrar.isAvailable("ben"), "Not available");

// Register (first one is free!)
registrar.register("ben", msg.sender);

// Result: ben.towns.eth is now owned by msg.sender
```

### Resolve an Address (L2 Direct)

```solidity
IL2Registry registry = IL2Registry(REGISTRY_ADDRESS);

// Compute namehash
bytes32 node = registry.namehash("ben.towns.eth");

// Get ETH address (coinType 60)
address owner = IAddrResolver(address(registry)).addr(node);

// Get Base address (coinType 2147492101)
bytes memory baseAddr = IAddressResolver(address(registry)).addr(node, 2147492101);
```

### Set Profile Records

```solidity
IL2Registry registry = IL2Registry(REGISTRY_ADDRESS);
bytes32 usernameHash = registry.namehash("ben.towns.eth");

// Only usernameHash owner can set records
ITextResolver(address(registry)).setText(usernameHash, "displayName", "ben");
ITextResolver(address(registry)).setText(usernameHash, "avatar", "ipfs://Qm...");
ITextResolver(address(registry)).setText(usernameHash, "bio", "Building on Towns");
```

### Resolve via CCIP-Read (L1)

```typescript
// Using viem/ethers with ENS resolution
import { normalize } from "viem/ens";

const client = createPublicClient({ chain: mainnet, transport: http() });

// This triggers CCIP-Read automatically
const address = await client.getEnsAddress({
  name: normalize("ben.towns.eth"),
});
```

## Events

### L2 Registry Events

| Event              | Parameters                     | When                           |
| ------------------ | ------------------------------ | ------------------------------ |
| `SubnodeCreated`   | `node, name, owner`            | New subdomain minted           |
| `NewOwner`         | `parentNode, labelhash, owner` | ENS-compatible ownership event |
| `RegistrarAdded`   | `registrar`                    | New registrar approved         |
| `RegistrarRemoved` | `registrar`                    | Registrar removed              |
| `MetadataSet`      | `node, metadata`               | Subdomain metadata updated     |

### Resolver Events

| Event                | Parameters              | When                       |
| -------------------- | ----------------------- | -------------------------- |
| `AddrChanged`        | `node, addr`            | ETH address updated        |
| `AddressChanged`     | `node, coinType, addr`  | Multi-coin address updated |
| `TextChanged`        | `node, key, key, value` | Text record updated        |
| `ContenthashChanged` | `node, hash`            | Content hash updated       |
| `VersionChanged`     | `node, version`         | Records cleared            |

### L1 Resolver Events

| Event              | Parameters                       | When                      |
| ------------------ | -------------------------------- | ------------------------- |
| `GatewayURLSet`    | `gatewayUrl`                     | Gateway URL updated       |
| `GatewaySignerSet` | `gatewaySigner`                  | Signer address updated    |
| `L2RegistrySet`    | `node, chainId, registryAddress` | L2 registry mapping added |

## Error Reference

### L1 Resolver Errors

| Error                              | Cause                            |
| ---------------------------------- | -------------------------------- |
| `L1Resolver__InvalidGatewayURL`    | Empty gateway URL                |
| `L1Resolver__InvalidGatewaySigner` | Zero address signer              |
| `L1Resolver__InvalidL2Registry`    | No L2 registry for parent domain |
| `L1Resolver__InvalidName`          | Name has fewer than 2 parts      |
| `L1Resolver__InvalidOwner`         | Caller not ENS node owner        |
| `L1Resolver__SignatureExpired`     | Gateway response expired         |
| `L1Resolver__InvalidSignature`     | Signature verification failed    |

### L2 Registry Errors

| Error                               | Cause                               |
| ----------------------------------- | ----------------------------------- |
| `L2RegistryMod_LabelTooShort`       | Label < 1 character                 |
| `L2RegistryMod_LabelTooLong`        | Label > 255 characters              |
| `L2RegistryMod_NotAvailable`        | Subdomain already exists            |
| `L2RegistryMod_NotOwnerOrRegistrar` | Unauthorized for subdomain creation |
| `L2RegistryMod_NotOwner`            | Not root domain owner               |
| `L2RegistryMod_NotRegistrar`        | Not approved registrar              |
| `L2RegistryMod_NotAuthorized`       | Not authorized for record updates   |

### L2 Registrar Errors

| Error                          | Cause                        |
| ------------------------------ | ---------------------------- |
| `L2Registrar__InvalidLabel`    | Label fails validation rules |
| `L2Registrar__NotSmartAccount` | Caller not IModularAccount   |

### DomainFeeHook Errors

| Error                           | Cause                                   |
| ------------------------------- | --------------------------------------- |
| `DomainFeeHook__InvalidContext` | Missing/invalid label length in context |
| `DomainFeeHook__LengthMismatch` | Array lengths don't match in batch set  |
| `DomainFeeHook__Unauthorized`   | Caller not authorized FeeManager        |
| `DomainFeeHook__TooManyLengths` | Batch update exceeds 10 tiers           |

## Security Considerations

1. **Gateway Signer Key Security**: The L1 resolver trusts responses signed by `gatewaySigner`. Key compromise allows forged resolutions.

2. **Signature Expiration**: Gateway responses include expiration timestamps. Clients should verify freshness.

3. **Registrar Approval**: Only approved registrars can mint subdomains without being domain owners. Carefully manage registrar list.

4. **Smart Account Requirement**: Registration requires IModularAccount to prevent bot spam and ensure identity verification.

5. **Record Versioning**: Incrementing a node's version atomically invalidates all records - useful for ownership transfers.

6. **Cross-chain Consistency**: L1 resolver maps to specific L2 registry addresses. Ensure mappings stay synchronized.

## Appendix: Key Functions

### Registration

```solidity
// L2RegistrarFacet.sol
function register(string calldata label, address owner) external nonReentrant

// L2RegistryFacet.sol
function createSubdomain(
    bytes32 domainHash,
    string calldata subdomain,
    address owner,
    bytes[] calldata records,
    bytes calldata metadata
) external
```

### Resolution

```solidity
// L1ResolverFacet.sol
function resolve(bytes calldata name, bytes calldata data) external view returns (bytes memory)
function resolveWithProof(bytes calldata response, bytes calldata extraData) external view returns (bytes memory)

// AddrResolverFacet.sol
function addr(bytes32 node) external view returns (address payable)
function addr(bytes32 node, uint256 coinType) external view returns (bytes memory)
```

### Record Management

```solidity
// TextResolverFacet.sol
function setText(bytes32 node, string calldata key, string calldata value) external
function text(bytes32 node, string calldata key) external view returns (string memory)

// AddrResolverFacet.sol
function setAddr(bytes32 node, address a) external
function setAddr(bytes32 node, uint256 coinType, bytes memory a) external

// ContentHashResolverFacet.sol
function setContenthash(bytes32 node, bytes calldata hash) external
function contenthash(bytes32 node) external view returns (bytes memory)
```

### Administration

```solidity
// L2RegistryFacet.sol
function addRegistrar(address registrar) external
function removeRegistrar(address registrar) external

// L1ResolverFacet.sol
function setL2Registry(bytes32 node, uint64 chainId, address registryAddress) external
function setGatewayURL(string calldata gatewayUrl) external onlyOwner
function setGatewaySigner(address gatewaySigner) external onlyOwner
```
