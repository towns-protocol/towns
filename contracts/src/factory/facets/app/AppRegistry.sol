// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IAppRegistry} from "./IAppRegistry.sol";
import {ISchemaResolver} from "./interfaces/ISchemaResolver.sol";
import {IERC7484} from "./interfaces/IERC7484.sol";

// libraries
import {DataTypes} from "./IAppRegistry.sol";
import {SchemaLib} from "./libraries/SchemaLib.sol";
import {AttestationLib} from "./libraries/AttestationLib.sol";
import {TrustedLib} from "./libraries/TrustedLib.sol";
import {ModuleType} from "./libraries/ModuleTypes.sol";
// contracts

contract AppRegistry is IAppRegistry, IERC7484 {
  function __AppRegistry_init() external {}

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                     IERC7484 Implementation                */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  /// @inheritdoc IERC7484
  function trustAttesters(
    uint8 threshold,
    address[] calldata attesters
  ) external {
    TrustedLib.trustAttesters(threshold, attesters);
  }

  /// @inheritdoc IERC7484
  function check(address module) external view {
    TrustedLib.check(msg.sender, module, DataTypes.ZERO_MODULE_TYPE);
  }

  /// @inheritdoc IERC7484
  function check(address module, ModuleType moduleType) external view {
    TrustedLib.check(msg.sender, module, moduleType);
  }

  /// @inheritdoc IERC7484
  function checkForAccount(address account, address module) external view {
    TrustedLib.check(account, module, DataTypes.ZERO_MODULE_TYPE);
  }

  /// @inheritdoc IERC7484
  function checkForAccount(
    address account,
    address module,
    ModuleType moduleType
  ) external view {
    TrustedLib.check(account, module, moduleType);
  }

  /// @inheritdoc IERC7484
  function check(
    address module,
    address[] calldata attesters,
    uint256 threshold
  ) external view {
    TrustedLib.check(module, attesters, threshold);
  }

  /// @inheritdoc IERC7484
  function check(
    address module,
    ModuleType moduleType,
    address[] calldata attesters,
    uint256 threshold
  ) external view {
    TrustedLib.check(module, moduleType, attesters, threshold);
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                     Register Plugins                       */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function registerApp(
    bytes32 schemaId,
    address app,
    string calldata appType,
    bool audited,
    ModuleType[] calldata moduleTypes
  ) external {
    bytes memory encoded = abi.encode(app, appType, audited);

    DataTypes.AttestationRequest memory request = DataTypes.AttestationRequest({
      schemaId: schemaId,
      recipient: app,
      expirationTime: 0,
      data: encoded,
      moduleTypes: moduleTypes
    });

    attest(schemaId, request);
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                     Schema Management                      */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function registerSchema(
    string calldata schema,
    ISchemaResolver resolver
  ) external returns (bytes32) {
    return SchemaLib.registerSchema(schema, resolver);
  }

  function getSchema(
    bytes32 uid
  ) external view returns (DataTypes.Schema memory) {
    return SchemaLib.getSchema(uid);
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                     Attestation Management                   */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function attest(
    bytes32 schemaId,
    DataTypes.AttestationRequest memory request
  ) public {
    DataTypes.Attestation memory attestation = AttestationLib.attest(
      schemaId,
      msg.sender,
      request
    );
    AttestationLib.resolveAttestation(schemaId, attestation, false);
  }

  function revoke(DataTypes.RevocationRequest memory request) external {
    DataTypes.Attestation memory attestation = AttestationLib.revoke(
      msg.sender,
      request
    );
    AttestationLib.resolveAttestation(request.schemaId, attestation, true);
  }

  function getAttestation(
    bytes32 uid
  ) external view returns (DataTypes.Attestation memory) {
    return AttestationLib.getAttestation(uid);
  }
}
