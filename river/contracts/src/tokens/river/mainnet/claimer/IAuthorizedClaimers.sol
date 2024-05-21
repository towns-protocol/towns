// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// This contract is used to authorize claimers to claim rewards on the authorizer's behalf
interface IAuthorizedClaimersBase {
  // Errors
  error AuthorizedClaimers_ClaimerAlreadyAuthorized();
  error AuthorizedClaimers_InvalidSignature();
  error AuthorizedClaimers_ExpiredSignature();

  // Events
  event AuthorizedClaimerChanged(
    address indexed authorizer,
    address indexed claimer
  );
  event AuthorizedClaimerRemoved(address indexed authorizer);
}

interface IAuthorizedClaimers is IAuthorizedClaimersBase {
  // Authorize a claimer to claim rewards on the callers behalf
  function authorizeClaimer(address claimer) external;

  // Authorize a claimer to claim rewards on the authorizer's behalf
  function authorizeClaimerBySig(
    address owner,
    address claimer,
    uint256 nonce,
    uint256 expiry,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external;

  // Get the authorized claimer for the authorizer
  function getAuthorizedClaimer(
    address authorizer
  ) external view returns (address);

  // Remove the authorized claimer for the caller
  function removeAuthorizedClaimer() external;
}
