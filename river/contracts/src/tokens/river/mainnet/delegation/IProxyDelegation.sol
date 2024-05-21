// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface IProxyDelegationBase {
  struct DelegateRequest {
    address delegatee;
    uint256 nonce;
    uint256 expiry;
    bytes signature;
  }

  struct ClaimerRequest {
    address owner;
    address claimer;
    uint256 nonce;
    uint256 expiry;
    bytes signature;
  }

  error InvalidSignatureLength();
}

interface IProxyDelegation is IProxyDelegationBase {
  function delegateBySig(
    address delegatee,
    uint256 nonce,
    uint256 expiry,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external;

  function authorizeBySig(
    address owner,
    address claimer,
    uint256 nonce,
    uint256 expiry,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external;
}
