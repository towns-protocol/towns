# Encryption Layer

The Encryption layer provides end-to-end encryption for all message content in Towns Protocol.

## Architecture Overview

```mermaid
classDiagram
    class GroupEncryptionCrypto {
        +encryptionDevice: EncryptionDevice
        +groupEncryption: Record~AlgorithmId, EncryptionAlgorithm~
        +groupDecryption: Record~AlgorithmId, DecryptionAlgorithm~
        +cryptoStore: CryptoStore
        +init(opts): Promise~void~
        +encryptGroupEvent(streamId, payload, algorithm): Promise~EncryptedData~
        +decryptGroupEvent(streamId, content): Promise~Uint8Array~
        +encryptWithDeviceKeys(payload, deviceKeys): Promise~Record~
        +decryptWithDeviceKey(ciphertext, senderKey): Promise~string~
        +ensureOutboundSession(streamId, algorithm): Promise~string~
        +importSessionKeys(streamId, sessions): Promise~void~
        +exportRoomKeys(): Promise~GroupEncryptionSession[]~
        +getUserDevice(): UserDevice
    }

    class EncryptionDevice {
        +deviceCurve25519Key: string
        +deviceDoNotUseKey: string
        +fallbackKey: FallbackKey
        +init(opts): Promise~void~
        +createOutboundGroupSession(streamId): Promise~string~
        +createHybridGroupSession(streamId, blockNum, blockHash): Promise
        +getOutboundGroupSessionKey(streamId): Promise~IOutboundGroupSessionKey~
        +encryptGroupMessage(payload, streamId): Promise~EncryptResult~
        +encryptUsingFallbackKey(deviceKey, fallbackKey, payload): Promise
        +decryptMessage(ciphertext, senderKey): Promise~string~
        +addInboundGroupSession(...): Promise~void~
        +exportInboundGroupSession(streamId, sessionId): Promise
        +exportDevice(): Promise~ExportedDevice~
    }

    class EncryptionDelegate {
        +isInitialized: boolean
        +init(): Promise~void~
        +createAccount(): Account
        +createSession(): Session
        +createInboundGroupSession(): InboundGroupSession
        +createOutboundGroupSession(): OutboundGroupSession
    }

    class EncryptionAlgorithm {
        <<abstract>>
        +algorithm: GroupEncryptionAlgorithmId
        +ensureOutboundSession(streamId, opts): Promise~string~
        +hasOutboundSession(streamId): Promise~boolean~
        +encrypt(streamId, payload): Promise~EncryptedData~
    }

    class GroupEncryption {
        +algorithm: GroupEncryption
    }

    class HybridGroupEncryption {
        +algorithm: HybridGroupEncryption
    }

    GroupEncryptionCrypto --> EncryptionDevice
    GroupEncryptionCrypto --> EncryptionAlgorithm
    EncryptionDevice --> EncryptionDelegate
    EncryptionDevice --> CryptoStore
    GroupEncryption --|> EncryptionAlgorithm
    HybridGroupEncryption --|> EncryptionAlgorithm
```

## Encryption Algorithms

Towns supports two encryption algorithms:

| Algorithm | ID | Description |
|-----------|-----|-------------|
| **GroupEncryption** | `r.group-encryption.v1.aes-sha2` | Megolm-based (Signal protocol) |
| **HybridGroupEncryption** | `grpaes` | AES-GCM-256 with Olm key distribution |

### GroupEncryption (Megolm)

Uses the Olm library's Megolm implementation (Signal protocol):

```mermaid
flowchart TD
    subgraph Setup
        Create[Create OutboundGroupSession]
        Create --> Ratchet[Initialize ratchet state]
        Ratchet --> Share[Share session key to members]
    end

    subgraph Encrypt
        Plain[Plaintext] --> Encode[Base64 encode]
        Encode --> MegolmEnc[Megolm encrypt]
        MegolmEnc --> Advance[Advance ratchet]
        Advance --> Cipher[Ciphertext + sessionId]
    end

    subgraph Decrypt
        CipherIn[Ciphertext] --> LoadSession[Load InboundGroupSession]
        LoadSession --> MegolmDec[Megolm decrypt]
        MegolmDec --> Decode[Base64 decode]
        Decode --> PlainOut[Plaintext]
    end
```

### HybridGroupEncryption (AES-GCM)

Uses symmetric AES-GCM-256 encryption with Olm for key distribution:

```mermaid
flowchart TD
    subgraph Setup
        GenKey[Generate AES-GCM-256 key]
        GenKey --> StoreKey[Store in CryptoStore]
        StoreKey --> ShareKey[Encrypt key to members using Olm]
    end

    subgraph Encrypt
        Plain[Plaintext bytes] --> GenIV[Generate 12-byte IV]
        GenIV --> AESEnc[AES-GCM encrypt]
        AESEnc --> Output[ciphertext + IV + sessionId]
    end

    subgraph Decrypt
        CipherIn[Ciphertext + IV] --> LoadKey[Load AES key from store]
        LoadKey --> AESDec[AES-GCM decrypt]
        AESDec --> PlainOut[Plaintext bytes]
    end
```

## Message Encryption Flow

```mermaid
sequenceDiagram
    participant Client
    participant Crypto as GroupEncryptionCrypto
    participant Algorithm as EncryptionAlgorithm
    participant Device as EncryptionDevice
    participant Store as CryptoStore

    Client->>Crypto: encryptGroupEvent(streamId, payload, algorithm)
    Crypto->>Algorithm: encrypt(streamId, payload)
    Algorithm->>Device: ensureOutboundSession(streamId)

    alt No existing session
        Device->>Device: createOutboundGroupSession()
        Device->>Store: storeOutboundGroupSession()
        Device-->>Algorithm: sessionId
        Algorithm->>Client: shareSession (async)
    else Existing session
        Device->>Store: getOutboundGroupSession()
        Store-->>Device: session
        Device-->>Algorithm: sessionId
    end

    Algorithm->>Device: encryptGroupMessage(payload, streamId)
    Device-->>Algorithm: {ciphertext, sessionId}
    Algorithm-->>Crypto: EncryptedData
    Crypto-->>Client: EncryptedData
```

## Message Decryption Flow

```mermaid
sequenceDiagram
    participant Client
    participant Crypto as GroupEncryptionCrypto
    participant Algorithm as DecryptionAlgorithm
    participant Device as EncryptionDevice
    participant Store as CryptoStore

    Client->>Crypto: decryptGroupEvent(streamId, encryptedData)
    Crypto->>Crypto: parseAlgorithm(encryptedData.algorithm)
    Crypto->>Algorithm: decrypt(streamId, encryptedData)

    Algorithm->>Device: decryptGroupMessage(...)
    Device->>Store: getInboundGroupSession(sessionId)

    alt Session found
        Store-->>Device: session
        Device->>Device: Decrypt with session
        Device-->>Algorithm: cleartext
        Algorithm-->>Crypto: Uint8Array
        Crypto-->>Client: decrypted content
    else Session not found
        Device-->>Algorithm: DecryptionError
        Algorithm-->>Crypto: throw error
        Note over Client: Queue for key solicitation
    end
```

## Device Key Management

Each device has its own encryption identity:

```mermaid
classDiagram
    class UserDevice {
        +deviceKey: string
        +fallbackKey: string
    }

    class EncryptionDevice {
        +deviceCurve25519Key: string
        +deviceDoNotUseKey: string
        +fallbackKey: FallbackKey
    }

    class FallbackKey {
        +keyId: string
        +key: string
    }

    EncryptionDevice --> FallbackKey
```

### Device Initialization

```mermaid
flowchart TD
    Init[init] --> CheckExport{fromExportedDevice?}

    CheckExport -->|Yes| ImportDevice[Import from exported data]
    CheckExport -->|No| CheckStore{Account in store?}

    CheckStore -->|Yes| LoadAccount[Load from CryptoStore]
    CheckStore -->|No| CreateAccount[Create new Olm Account]

    ImportDevice --> ExtractKeys[Extract device keys]
    LoadAccount --> ExtractKeys
    CreateAccount --> StoreAccount[Store in CryptoStore]
    StoreAccount --> ExtractKeys

    ExtractKeys --> GenFallback[Generate fallback key if needed]
    GenFallback --> Ready[Device ready]
```

## Device-to-Device Encryption

For sharing session keys between devices:

```mermaid
sequenceDiagram
    participant Sender
    participant SenderDevice as Sender's Device
    participant ReceiverDevice as Receiver's Device
    participant Receiver

    Note over Sender: Want to share session key

    Sender->>SenderDevice: encryptWithDeviceKeys(payload, [receiver])
    SenderDevice->>SenderDevice: Get receiver's deviceKey + fallbackKey
    SenderDevice->>SenderDevice: encryptUsingFallbackKey(...)
    SenderDevice-->>Sender: {[deviceKey]: ciphertext}

    Sender->>Receiver: Send via UserInbox stream

    Receiver->>ReceiverDevice: decryptWithDeviceKey(ciphertext, senderKey)
    ReceiverDevice->>ReceiverDevice: decryptMessage(...)
    ReceiverDevice-->>Receiver: session key plaintext

    Receiver->>Receiver: importSessionKeys(streamId, sessions)
```

## EncryptedData Structure

```mermaid
classDiagram
    class EncryptedData {
        +algorithm: string
        +senderKey: string
        +sessionId?: string
        +ciphertext?: string
        +sessionIdBytes?: Uint8Array
        +ciphertextBytes?: Uint8Array
        +ivBytes?: Uint8Array
        +version: EncryptedDataVersion
    }
```

| Field | GroupEncryption | HybridGroupEncryption |
|-------|-----------------|----------------------|
| `algorithm` | `r.group-encryption.v1.aes-sha2` | `grpaes` |
| `senderKey` | Device Curve25519 key | Device Curve25519 key |
| `sessionId` | Megolm session ID (string) | - |
| `ciphertext` | Base64 Megolm ciphertext | - |
| `sessionIdBytes` | - | AES session ID (bytes) |
| `ciphertextBytes` | - | AES-GCM ciphertext |
| `ivBytes` | - | 12-byte IV |
| `version` | 0 (legacy) or 1 (binary) | 0 (legacy) or 1 (binary) |

## Export/Import Device

Devices can be exported and restored:

```mermaid
flowchart LR
    subgraph Export
        Device --> ExportDevice[exportDevice]
        ExportDevice --> ExportedDevice
    end

    subgraph ExportedDevice
        Pickle[accountPickle]
        Sessions[groupSessions]
        Hybrid[hybridGroupSessions]
        PK[pickleKey]
    end

    subgraph Import
        ExportedDevice --> InitOpts[EncryptionDeviceInitOpts]
        InitOpts --> NewDevice[new EncryptionDevice]
        NewDevice --> RestoreAccount
        NewDevice --> RestoreSessions
    end
```

## Security Properties

1. **Forward Secrecy** - Megolm provides limited forward secrecy through ratcheting
2. **Post-Compromise Recovery** - New sessions created after key compromise are secure
3. **Deniability** - Messages can't be cryptographically proven to come from a specific user
4. **End-to-End** - Server never sees plaintext content

## Source Files

| File | Description |
|------|-------------|
| `packages/encryption/src/groupEncryptionCrypto.ts` | Main orchestrator class |
| `packages/encryption/src/encryptionDevice.ts` | Device key and session management |
| `packages/encryption/src/encryptionDelegate.ts` | Olm library wrapper |
| `packages/encryption/src/groupEncryption.ts` | Megolm encryption algorithm |
| `packages/encryption/src/hybridGroupEncryption.ts` | AES-GCM hybrid algorithm |
| `packages/encryption/src/groupDecryption.ts` | Megolm decryption |
| `packages/encryption/src/hybridGroupDecryption.ts` | AES-GCM hybrid decryption |
| `packages/encryption/src/cryptoAesGcm.ts` | Web Crypto API AES-GCM utilities |
| `packages/encryption/src/olmLib.ts` | Algorithm IDs and session types |
