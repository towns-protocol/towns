// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {IAuthorizedClaimers} from "./IAuthorizedClaimers.sol";

contract AuthorizedClaimers is IAuthorizedClaimers {
  mapping(address => address) authorizedClaimers;

  /// @inheritdoc IAuthorizedClaimers
  function authorizeClaimer(address claimer) external {
    address currentClaimer = authorizedClaimers[msg.sender];

    if (currentClaimer == claimer)
      revert AuthorizedClaimers_ClaimerAlreadyAuthorized();

    authorizedClaimers[msg.sender] = claimer;

    emit AuthorizedClaimerChanged(msg.sender, claimer);
  }

  /// @inheritdoc IAuthorizedClaimers
  function removeAuthorizedClaimer() external {
    delete authorizedClaimers[msg.sender];
    emit AuthorizedClaimerRemoved(msg.sender);
  }

  /// @inheritdoc IAuthorizedClaimers
  function getAuthorizedClaimer(
    address authorizer
  ) external view returns (address) {
    return authorizedClaimers[authorizer];
  }
}
