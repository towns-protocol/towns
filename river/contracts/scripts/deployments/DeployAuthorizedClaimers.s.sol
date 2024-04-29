// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;

import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {AuthorizedClaimers} from "contracts/src/tokens/river/mainnet/AuthorizedClaimers.sol";

contract DeployAuthorizedClaimers is Deployer {
  function versionName() public pure override returns (string memory) {
    return "authorizedClaimers";
  }

  function __deploy(
    uint256 deployerPK,
    address
  ) public override returns (address) {
    vm.broadcast(deployerPK);
    return address(new AuthorizedClaimers());
  }
}
