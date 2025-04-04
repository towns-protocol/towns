// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISchemaResolver} from "./interfaces/ISchemaResolver.sol";

// types
import {PackedModuleTypes, ModuleType} from "./libraries/ModuleTypes.sol";

library DataTypes {
  // A representation of an empty/uninitialized UID.
  bytes32 constant EMPTY_UID = 0;

  // A zero expiration represents an non-expiring attestation.
  uint64 constant NO_EXPIRATION_TIME = 0;

  // A zero module type represents an unfiltered attestation.
  ModuleType constant ZERO_MODULE_TYPE = ModuleType.wrap(0);

  struct Schema {
    bytes32 uid; // The unique identifier of the schema.
    ISchemaResolver resolver; // The address of the resolver that will validate the schema.
    string definition; // The schema to register e.g. "(address plugin,string pluginType,bool audited)"
  }

  struct Attestation {
    bytes32 uid; // The unique identifier of the attestation.
    bytes32 schemaId; // The unique identifier of the schema.
    uint64 time; // The time when the attestation was created (Unix timestamp).
    uint64 expirationTime; // The time when the attestation expires (Unix timestamp).
    uint64 revocationTime; // The time when the attestation was revoked (Unix timestamp).
    PackedModuleTypes moduleTypes; // The type of the module.
    address recipient; // The address of the plugin that is being attested to.
    address attester; // The attester/sender of the attestation.
    bytes data; // The data to attest to.
  }

  struct TrustedAttester {
    uint8 count; // number of attesters in the linkedList
    uint8 threshold; // minimum number of attestations required to be a trusted attester
    address attester; // the first attester in the linkedList
    mapping(address attester => mapping(address account => address linkedAttester)) linkedAttesters; // a linkedList of attesters
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                       Request Types                        */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  struct AttestationRequest {
    bytes32 schemaId; // The schema to attest to
    address recipient; // The address of the plugin that is being attested to.
    uint64 expirationTime; // The time at which the attestation will expire.
    bytes data; // The data to attest to.
    ModuleType[] moduleTypes; // The type of the module.
  }

  struct RevocationRequest {
    bytes32 schemaId; // The identifier of the schema
    bytes32 uid; // The identifier of the attestation
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           Errors                           */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
  error InvalidSchemaResolver();
  error SchemaAlreadyRegistered();
  error InvalidSchema();
  error InvalidExpirationTime();
  error Irrevocable();
  error InvalidRefUID();
  error InvalidValue();
  error InvalidAttestation();
  error InvalidRevocation();
  error InvalidRevoker();
  error InvalidAttesters();
  error InvalidThreshold();
  error NoTrustedAttestersFound();
  error InsufficientAttestations();
  error InvalidModuleType();
  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           Events                           */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
  event SchemaRegistered(
    bytes32 indexed uid,
    address indexed registrar,
    Schema schema
  );

  event AttestationCreated(
    address indexed recipient,
    address indexed attester,
    bytes32 indexed uid,
    bytes32 schemaId
  );

  event AttestationRevoked(
    address indexed recipient,
    address indexed revoker,
    bytes32 indexed uid,
    bytes32 schemaId
  );
}

interface IAppRegistry {
  /// @notice Register a schema
  /// @param schema The schema to register e.g. "(address plugin,string pluginType,bool audited)"
  /// @param resolver A contract that will validate the schema whenever someone attests to it
  /// @return schemaId The UID of the schema
  function registerSchema(
    string calldata schema,
    ISchemaResolver resolver // OPTIONAL
  ) external returns (bytes32);

  /// @notice Get the schema record for a given schemaId
  /// @param schemaId The schemaId of the schema
  /// @return The schema record
  function getSchema(
    bytes32 schemaId
  ) external view returns (DataTypes.Schema memory);

  /// @notice Attest a request
  /// @param request The request to attest to
  function attest(
    bytes32 schemaId,
    DataTypes.AttestationRequest calldata request
  ) external;

  /// @notice Revoke a plugin
  /// @param request The request to revoke
  function revoke(DataTypes.RevocationRequest calldata request) external;
}
