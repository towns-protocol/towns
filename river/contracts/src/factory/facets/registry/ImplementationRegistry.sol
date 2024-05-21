// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IMetadata} from "contracts/src/diamond/facets/metadata/IMetadata.sol";
import {IImplementationRegistry} from "contracts/src/factory/facets/registry/IImplementationRegistry.sol";

// libraries
import {ImplementationRegistryStorage} from "./ImplementationRegistryStorage.sol";

// contracts
import {OwnableBase} from "contracts/src/diamond/facets/ownable/OwnableBase.sol";
import {Facet} from "contracts/src/diamond/facets/Facet.sol";

contract ImplementationRegistryFacet is
  IImplementationRegistry,
  OwnableBase,
  Facet
{
  function __ImplementationRegistry_init() external {
    _addInterface(type(IImplementationRegistry).interfaceId);
  }

  /// @inheritdoc IImplementationRegistry
  function addImplementation(address implementation) external onlyOwner {
    IMetadata metadata = IMetadata(implementation);

    bytes32 contractType = metadata.contractType();
    if (contractType == bytes32(0)) revert InvalidContractType();

    ImplementationRegistryStorage.Layout
      storage ds = ImplementationRegistryStorage.layout();

    uint32 version = metadata.contractVersion();
    uint32 currentVersion = ds.currentVersion[contractType];

    if (version <= currentVersion) revert InvalidVersion();

    ds.implementation[contractType][version] = implementation;
    ds.currentVersion[contractType] = version;
    ds.approved[implementation] = true;

    emit ImplementationAdded(implementation, contractType, version);
  }

  /// @inheritdoc IImplementationRegistry
  function approveImplementation(
    address implementation,
    bool approval
  ) external onlyOwner {
    ImplementationRegistryStorage.Layout
      storage ds = ImplementationRegistryStorage.layout();

    ds.approved[implementation] = approval;

    emit ImplementationApproved(implementation, approval);
  }

  /// @inheritdoc IImplementationRegistry
  function getImplementation(
    bytes32 contractType,
    uint32 version
  ) external view returns (address) {
    return
      ImplementationRegistryStorage.layout().implementation[contractType][
        version
      ];
  }

  /// @inheritdoc IImplementationRegistry
  function getLatestImplementation(
    bytes32 contractType
  ) external view returns (address) {
    ImplementationRegistryStorage.Layout
      storage ds = ImplementationRegistryStorage.layout();
    return ds.implementation[contractType][ds.currentVersion[contractType]];
  }
}
