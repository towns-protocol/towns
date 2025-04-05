// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISchemaResolver} from "../interfaces/ISchemaResolver.sol";

library DataTypes {
    // A representation of an empty/uninitialized UID.
    bytes32 constant EMPTY_UID = 0;

    // A zero expiration represents an non-expiring attestation.
    uint64 constant NO_EXPIRATION_TIME = 0;

    enum PluginType {
        Validation,
        Execution,
        Both
    }

    struct Schema {
        bytes32 uid; // The unique identifier of the schema.
        ISchemaResolver resolver; // The address of the resolver that will validate the schema.
        bool revocable; // Whether the schema is revocable.
        string schema; // The schema to register e.g. "(address plugin,uint8 pluginType,bool
            // audited)"
    }

    struct Attestation {
        bytes32 uid; // The unique identifier of the attestation.
        bytes32 schema; // The unique identifier of the schema.
        uint64 time; // The time when the attestation was created (Unix timestamp).
        uint64 expirationTime; // The time when the attestation expires (Unix timestamp).
        uint64 revocationTime; // The time when the attestation was revoked (Unix timestamp).
        bytes32 refUID; // The UID of the related attestation.
        address recipient; // The address of the plugin that is being attested to.
        address attester; // The attester/sender of the attestation.
        bool revocable; // Whether the attestation is revocable.
        bytes data; // Custom attestation data.
    }

    struct TrustedAttester {
        uint8 count; // number of attesters in the linkedList
        uint8 threshold; // minimum number of attestations required to be a trusted attester
        address attester; // the first attester in the linkedList
        mapping(address attester => mapping(address account => address linkedAttester))
            linkedAttesters; // a linkedList of attesters
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       Request Types                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    struct AttestationRequestData {
        address recipient; // The recipient of the attestation.
        uint64 expirationTime; // The time when the attestation expires (Unix timestamp).
        bool revocable; // Whether the attestation is revocable.
        bytes32 refUID; // The UID of the related attestation.
        bytes data; // Custom attestation data.
        uint256 value; // An explicit ETH amount to send to the resolver. This is important to
            // prevent accidental user errors.
    }

    struct AttestationRequest {
        bytes32 schemaId; // The schema to attest to
        AttestationRequestData data; // The data to attest to
    }

    struct RevocationRequestData {
        bytes32 uid; // The identifier of the attestation
        uint256 value; // An explicit ETH amount to send to the resolver. This is important to
            // prevent accidental user errors.
    }

    struct RevocationRequest {
        bytes32 schemaId; // The schema to revoke
        RevocationRequestData data; // The data to revoke
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Errors                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    error InvalidSchemaResolver();
    error SchemaAlreadyRegistered();
    error InvalidSchema();
    error InvalidExpirationTime();
    error Irrevocable();
    error InvalidValue();
    error InvalidAttestation();
    error InvalidRevocation();
    error InvalidRevoker();
    error InvalidAttesters();
    error InvalidThreshold();
    error NoTrustedAttestersFound();
    error InsufficientAttestations();
    error InvalidModuleType();
    error NotPayable();
    error InsufficientBalance();
    error NotFound();
    error InvalidAppRegistry();
    error AccessDenied();
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Events                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    event SchemaRegistered(bytes32 indexed uid, address indexed registrar, Schema schema);

    event AttestationCreated(
        address indexed recipient, address indexed attester, bytes32 indexed uid, bytes32 schemaId
    );

    event AttestationRevoked(
        address indexed recipient, address indexed revoker, bytes32 indexed uid, bytes32 schemaId
    );
}
