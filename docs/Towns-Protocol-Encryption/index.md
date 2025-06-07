# Towns Protocol Encryption

## Enumerations

- [DecryptionStatus](enumerations/DecryptionStatus.md)
- [EncryptionAlgorithmId](enumerations/EncryptionAlgorithmId.md)
- [GroupEncryptionAlgorithmId](enumerations/GroupEncryptionAlgorithmId.md)

## Classes

- [BaseDecryptionExtensions](classes/BaseDecryptionExtensions.md)
- [CryptoStore](classes/CryptoStore.md)
- [DecryptionAlgorithm](classes/DecryptionAlgorithm.md)
- [DecryptionError](classes/DecryptionError.md)
- [EncryptionAlgorithm](classes/EncryptionAlgorithm.md)
- [EncryptionDelegate](classes/EncryptionDelegate.md)
- [EncryptionDevice](classes/EncryptionDevice.md)
- [GroupDecryption](classes/GroupDecryption.md)
- [GroupEncryption](classes/GroupEncryption.md)
- [GroupEncryptionCrypto](classes/GroupEncryptionCrypto.md)
- [HybridGroupDecryption](classes/HybridGroupDecryption.md)
- [HybridGroupEncryption](classes/HybridGroupEncryption.md)

## Interfaces

- [AccountRecord](interfaces/AccountRecord.md)
- [DecryptedContentError](interfaces/DecryptedContentError.md)
- [DecryptionSessionError](interfaces/DecryptionSessionError.md)
- [EncryptedContentItem](interfaces/EncryptedContentItem.md)
- [EntitlementsDelegate](interfaces/EntitlementsDelegate.md)
- [EventSignatureBundle](interfaces/EventSignatureBundle.md)
- [ExtendedInboundGroupSessionData](interfaces/ExtendedInboundGroupSessionData.md)
- [GroupEncryptionSession](interfaces/GroupEncryptionSession.md)
- [GroupSessionRecord](interfaces/GroupSessionRecord.md)
- [GroupSessionsData](interfaces/GroupSessionsData.md)
- [HybridGroupSessionRecord](interfaces/HybridGroupSessionRecord.md)
- [IDecryptedGroupMessage](interfaces/IDecryptedGroupMessage.md)
- [IDecryptionParams](interfaces/IDecryptionParams.md)
- [IEncryptionParams](interfaces/IEncryptionParams.md)
- [IGroupEncryptionClient](interfaces/IGroupEncryptionClient.md)
- [ImportRoomKeyProgressData](interfaces/ImportRoomKeyProgressData.md)
- [ImportRoomKeysOpts](interfaces/ImportRoomKeysOpts.md)
- [InboundGroupSessionData](interfaces/InboundGroupSessionData.md)
- [IOutboundGroupSessionKey](interfaces/IOutboundGroupSessionKey.md)
- [KeyFulfilmentData](interfaces/KeyFulfilmentData.md)
- [KeySolicitationContent](interfaces/KeySolicitationContent.md)
- [KeySolicitationData](interfaces/KeySolicitationData.md)
- [KeySolicitationItem](interfaces/KeySolicitationItem.md)
- [NewGroupSessionItem](interfaces/NewGroupSessionItem.md)
- [UserDevice](interfaces/UserDevice.md)
- [UserDeviceCollection](interfaces/UserDeviceCollection.md)
- [UserDeviceRecord](interfaces/UserDeviceRecord.md)

## Type Aliases

- [Account](type-aliases/Account.md)
- [DecryptionEvents](type-aliases/DecryptionEvents.md)
- [EncryptionDeviceInitOpts](type-aliases/EncryptionDeviceInitOpts.md)
- [GroupSessionExtraData](type-aliases/GroupSessionExtraData.md)
- [InboundGroupSession](type-aliases/InboundGroupSession.md)
- [OutboundGroupSession](type-aliases/OutboundGroupSession.md)
- [PkDecryption](type-aliases/PkDecryption.md)
- [PkEncryption](type-aliases/PkEncryption.md)
- [PkSigning](type-aliases/PkSigning.md)
- [Session](type-aliases/Session.md)
- [Utility](type-aliases/Utility.md)

## Variables

- [AES\_GCM\_DERIVED\_ALGORITHM](variables/AES_GCM_DERIVED_ALGORITHM.md)

## Functions

- [decryptAesGcm](functions/decryptAesGcm.md)
- [encryptAesGcm](functions/encryptAesGcm.md)
- [exportAesGsmKeyBytes](functions/exportAesGsmKeyBytes.md)
- [generateNewAesGcmKey](functions/generateNewAesGcmKey.md)
- [hybridSessionKeyHash](functions/hybridSessionKeyHash.md)
- [importAesGsmKeyBytes](functions/importAesGsmKeyBytes.md)
- [isDecryptionError](functions/isDecryptionError.md)
- [isGroupEncryptionAlgorithmId](functions/isGroupEncryptionAlgorithmId.md)
- [makeSessionKeys](functions/makeSessionKeys.md)
- [parseGroupEncryptionAlgorithmId](functions/parseGroupEncryptionAlgorithmId.md)
