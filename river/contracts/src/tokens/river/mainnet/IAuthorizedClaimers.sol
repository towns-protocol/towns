// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// This contract is used to authorize claimers to claim rewards on the authorizer's behalf

interface IAuthorizedClaimers {
  error AuthorizedClaimers_ClaimerAlreadyAuthorized();

  event AuthorizedClaimerChanged(
    address indexed authorizer,
    address indexed claimer
  );
  event AuthorizedClaimerRemoved(address indexed authorizer);

  // Authorize a claimer to claim rewards on the callers behalf
  function authorizeClaimer(address claimer) external;

  // Get the authorized claimer for the authorizer
  function getAuthorizedClaimer(
    address authorizer
  ) external view returns (address);

  // Remove the authorized claimer for the caller
  function removeAuthorizedClaimer() external;
}
