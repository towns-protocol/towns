// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

// libraries
import {DataTypes} from "../IAppRegistry.sol";

// contracts

interface ISchemaResolver is IERC165 {
  function attest(
    DataTypes.Attestation calldata attestation
  ) external payable returns (bool);

  function revoke(
    DataTypes.Attestation calldata attestation
  ) external payable returns (bool);
}
