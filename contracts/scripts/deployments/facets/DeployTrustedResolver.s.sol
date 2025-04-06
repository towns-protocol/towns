// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts

import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {TrustedAttesterResolver} from
    "contracts/src/attest/resolvers/trusted/TrustedAttesterResolver.sol";

contract DeployTrustedResolver is FacetHelper, Deployer {
    constructor() {
        addSelector(TrustedAttesterResolver.trustAttesters.selector);
        addSelector(TrustedAttesterResolver.checkForAccount.selector);
        addSelector(bytes4(keccak256("check(address)")));
        addSelector(bytes4(keccak256("check(address,address[],uint256)")));
    }

    function initializer() public pure override returns (bytes4) {
        return TrustedAttesterResolver.__TrustedAttesterResolver_init.selector;
    }

    function versionName() public pure override returns (string memory) {
        return "utils/trustedAttesterResolver";
    }

    function __deploy(address deployer) public override returns (address) {
        vm.startBroadcast(deployer);
        TrustedAttesterResolver trustedAttesterResolver = new TrustedAttesterResolver();
        vm.stopBroadcast();
        return address(trustedAttesterResolver);
    }
}
