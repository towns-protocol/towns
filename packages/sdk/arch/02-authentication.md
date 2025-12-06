# Authentication Layer

The Authentication layer manages wallet delegation, signing contexts, and bearer tokens for authenticating with River nodes.

## SignerContext

`SignerContext` is the core authentication primitive that holds credentials for signing events.

### Interface

```mermaid
classDiagram
    class SignerContext {
        +signerPrivateKey(): string
        +creatorAddress: Uint8Array
        +delegateSig?: Uint8Array
        +delegateExpiryEpochMs?: bigint
    }
```

| Field | Description |
|-------|-------------|
| `signerPrivateKey` | Function returning the private key used to sign events |
| `creatorAddress` | The user's Ethereum address (derived from primary wallet) |
| `delegateSig` | Signature from primary wallet authorizing the delegate |
| `delegateExpiryEpochMs` | When the delegation expires |

## Delegation Model

Towns uses a **key delegation** model where:
1. **Primary Wallet** - The user's main Ethereum wallet (MetaMask, hardware wallet, etc.)
2. **Delegate Wallet** - A temporary device-specific key that signs events on behalf of the user

```mermaid
flowchart TB
    subgraph User
        PW[Primary Wallet]
        PWPub[Primary Public Key]
        PWPriv[Primary Private Key]
    end

    subgraph Device
        DW[Delegate Wallet]
        DWPub[Delegate Public Key]
        DWPriv[Delegate Private Key]
    end

    subgraph SignerContext
        SP[signerPrivateKey = DWPriv]
        CA[creatorAddress = PWPub]
        DS[delegateSig]
        EX[delegateExpiryEpochMs]
    end

    PWPriv -->|signs| DS
    DWPub -->|included in| DS
    DWPriv --> SP
    PWPub --> CA
```

### Delegation Signature

The delegate signature proves the primary wallet authorized the delegate:

```mermaid
sequenceDiagram
    participant PW as Primary Wallet
    participant DW as Delegate Wallet
    participant River as River Node

    Note over DW: Generate random Curve25519 keypair
    DW->>PW: delegatePublicKey + expiryEpochMs
    PW->>PW: hashSrc = riverDelegateHashSrc(delegatePubKey, expiry)
    PW->>PW: delegateSig = sign(hashSrc)
    PW-->>DW: delegateSig

    Note over DW: SignerContext ready
    DW->>River: Event signed with delegatePrivateKey
    River->>River: Recover creatorAddress from delegateSig
    River->>River: Verify event signature matches delegatePubKey
```

## Creating SignerContext

### From Wallet (Interactive)

```typescript
import { makeSignerContext } from '@towns-protocol/sdk'
import { ethers } from 'ethers'

const primaryWallet = new ethers.Wallet(privateKey)
const delegateWallet = ethers.Wallet.createRandom()

const signerContext = await makeSignerContext(
    primaryWallet,
    delegateWallet,
    { days: 7 }  // expiry
)
```

```mermaid
sequenceDiagram
    participant App
    participant makeSignerContext
    participant Primary as Primary Wallet
    participant Delegate as Delegate Wallet

    App->>makeSignerContext: (primaryWallet, delegateWallet, expiry)
    makeSignerContext->>Delegate: Get publicKey
    makeSignerContext->>makeSignerContext: Calculate expiryEpochMs
    makeSignerContext->>Primary: signMessage(hashSrc)
    Primary-->>makeSignerContext: delegateSig
    makeSignerContext->>Primary: getAddress()
    Primary-->>makeSignerContext: creatorAddress
    makeSignerContext-->>App: SignerContext
```

### From Bearer Token (Non-Interactive)

Bearer tokens allow authentication without user interaction:

```typescript
import { makeBearerToken, makeSignerContextFromBearerToken } from '@towns-protocol/sdk'

// Create token (one-time, requires wallet)
const token = await makeBearerToken(signer, { days: 30 })

// Later: restore context from token
const signerContext = await makeSignerContextFromBearerToken(token)
```

```mermaid
flowchart LR
    subgraph Creation
        Signer[ethers.Signer] --> MBT[makeBearerToken]
        MBT --> Token[Bearer Token String]
    end

    subgraph Usage
        Token --> MSCFT[makeSignerContextFromBearerToken]
        MSCFT --> SC[SignerContext]
    end
```

### Bearer Token Structure

```mermaid
classDiagram
    class BearerToken {
        +delegatePrivateKey: string
        +delegateSig: Uint8Array
        +expiryEpochMs: bigint
    }
```

The bearer token is serialized as a hex-encoded protobuf message containing all the information needed to recreate the SignerContext.

## Authentication Flow

### Initial Setup

```mermaid
sequenceDiagram
    participant User
    participant App
    participant SDK
    participant River as River Node

    User->>App: Connect wallet
    App->>SDK: createTownsClient({ privateKey })
    SDK->>SDK: Create delegate wallet
    SDK->>SDK: makeSignerContext()
    SDK->>River: getOperationalNodeUrls()
    River-->>SDK: [url1, url2, ...]
    SDK->>River: createStream (user streams)
    Note over SDK,River: Events signed with delegatePrivateKey
    River->>River: Verify delegateSig
    River->>River: Verify event signature
    River-->>SDK: Stream created
```

### Event Signing

Every event sent to River nodes is signed using the SignerContext:

```mermaid
sequenceDiagram
    participant Client
    participant makeEvent
    participant SignerContext
    participant River

    Client->>makeEvent: (signerContext, payload, miniblockHash)
    makeEvent->>SignerContext: signerPrivateKey()
    SignerContext-->>makeEvent: privateKey
    makeEvent->>makeEvent: Sign envelope
    makeEvent->>makeEvent: Attach delegateSig (if present)
    makeEvent-->>Client: Envelope

    Client->>River: addEvent(envelope)
    River->>River: Verify signature chain
```

## Key Hierarchy

```mermaid
flowchart TB
    subgraph Blockchain["Blockchain Layer"]
        ETH[Ethereum Address]
        ENS[ENS Name]
    end

    subgraph Identity["Identity Layer"]
        UserId[userId = userIdFromAddress]
    end

    subgraph Auth["Auth Layer"]
        Primary[Primary Wallet]
        Delegate[Delegate Wallet]
    end

    subgraph Crypto["Encryption Layer"]
        DeviceKey[Device Encryption Key]
        FallbackKey[Fallback Key]
    end

    ETH --> UserId
    ENS -.-> ETH
    Primary --> Delegate
    Delegate --> DeviceKey
    Delegate --> FallbackKey
```

## Expiry Handling

Delegation can expire. The SDK supports flexible expiry configuration:

```typescript
// Specific duration
await makeSignerContext(primary, delegate, { days: 7 })
await makeSignerContext(primary, delegate, { hours: 24 })
await makeSignerContext(primary, delegate, { minutes: 30 })

// Absolute timestamp
await makeSignerContext(primary, delegate, 1735689600000n)

// No expiry (legacy, not recommended)
await makeSignerContext(primary, delegate, 0n)
```

## Security Considerations

1. **Primary Key Protection** - The primary key only signs the delegation; it's never sent to River nodes
2. **Delegate Rotation** - Generate new delegates regularly; don't reuse across devices
3. **Bearer Token Storage** - Store bearer tokens securely; they grant full access
4. **Expiry** - Set reasonable expiry times; don't use infinite delegations in production

## Source Files

| File | Description |
|------|-------------|
| `src/signerContext.ts` | SignerContext interface and factory functions |
| `src/sign.ts` | Event signing and envelope creation |
| `@towns-protocol/utils` | Delegate signature utilities |
