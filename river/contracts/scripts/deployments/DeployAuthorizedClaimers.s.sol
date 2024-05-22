// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;

import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {AuthorizedClaimers} from "contracts/src/tokens/river/mainnet/claimer/AuthorizedClaimers.sol";

contract DeployAuthorizedClaimers is Deployer, FacetHelper {
  constructor() {
    addSelector(AuthorizedClaimers.authorizeClaimerBySig.selector);
    addSelector(AuthorizedClaimers.getAuthorizedClaimer.selector);
    addSelector(AuthorizedClaimers.authorizeClaimer.selector);
    addSelector(AuthorizedClaimers.removeAuthorizedClaimer.selector);
  }

  function versionName() public pure override returns (string memory) {
    return "authorizedClaimers";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.broadcast(deployer);
    return address(new AuthorizedClaimers());
  }
}
