// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";
import {Deployer} from "scripts/common/Deployer.s.sol";
import {MockLegacyMembership} from "test/mocks/legacy/membership/MockLegacyMembership.sol";

contract DeployMockLegacyMembership is Deployer, FacetHelper {
    constructor() {
        addSelector(MockLegacyMembership.joinSpaceLegacy.selector);
    }

    function versionName() public pure override returns (string memory) {
        return "utils/mockLegacyMembership";
    }

    function __deploy(address deployer) internal override returns (address) {
        vm.startBroadcast(deployer);
        address mockLegacyMembership = address(new MockLegacyMembership());
        vm.stopBroadcast();

        return mockLegacyMembership;
    }
}
