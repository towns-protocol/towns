// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {DataTypes} from "../DataTypes.sol";

// libraries

// contracts

interface IAttestationRegistry {
  function attest(
    DataTypes.AttestationRequest calldata request
  ) external payable returns (bytes32);

  function revoke(
    DataTypes.RevocationRequest calldata request
  ) external payable;

  function getAttestation(
    bytes32 uid
  ) external view returns (DataTypes.Attestation memory);
}
