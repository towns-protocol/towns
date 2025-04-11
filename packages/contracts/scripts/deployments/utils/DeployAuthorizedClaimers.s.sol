// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;

import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";
import {Deployer} from "scripts/common/Deployer.s.sol";
import {AuthorizedClaimers} from "src/tokens/mainnet/claimer/AuthorizedClaimers.sol";

contract DeployAuthorizedClaimers is Deployer, FacetHelper {
    constructor() {
        addSelector(AuthorizedClaimers.authorizeClaimerBySig.selector);
        addSelector(AuthorizedClaimers.getAuthorizedClaimer.selector);
        addSelector(AuthorizedClaimers.authorizeClaimer.selector);
        addSelector(AuthorizedClaimers.removeAuthorizedClaimer.selector);
    }

    function versionName() public pure override returns (string memory) {
        return "utils/authorizedClaimers";
    }

    function __deploy(address deployer) internal override returns (address) {
        vm.broadcast(deployer);
        return address(new AuthorizedClaimers());
    }
}
