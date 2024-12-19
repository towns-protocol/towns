// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface IProxyBatchDelegation {
  function sendAuthorizedClaimers(uint32 minGasLimit) external;
  function sendDelegators(uint32 minGasLimit) external;
}
