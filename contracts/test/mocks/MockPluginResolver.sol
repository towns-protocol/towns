// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISchemaResolver} from "contracts/src/factory/facets/app/interfaces/ISchemaResolver.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
// libraries
import {DataTypes} from "contracts/src/factory/facets/app/DataTypes.sol";

// contracts

contract MockPluginResolver is ISchemaResolver {
  mapping(address plugin => address owner) public pluginOwners;

  function isPayable() external pure override returns (bool) {
    return true;
  }

  function supportsInterface(
    bytes4 interfaceId
  ) external pure override returns (bool) {
    return
      interfaceId == type(ISchemaResolver).interfaceId ||
      interfaceId == type(IERC165).interfaceId;
  }

  function attest(
    DataTypes.Attestation calldata attestation
  ) external payable returns (bool) {
    (address plugin, , , ) = abi.decode(
      attestation.data,
      (address, uint8, string, bool)
    );

    if (attestation.recipient != plugin) return false;
    pluginOwners[plugin] = attestation.attester;

    return true;
  }

  function revoke(
    DataTypes.Attestation calldata attestation
  ) external payable returns (bool) {
    if (pluginOwners[attestation.recipient] != attestation.attester) {
      return false;
    }
    return true;
  }
}
