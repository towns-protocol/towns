// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IEntitlementChecker} from "src/base/registry/facets/checker/IEntitlementChecker.sol";

// libraries

// contracts
import {Deployer} from "scripts/common/Deployer.s.sol";
import {MockEntitlementGated} from "test/mocks/MockEntitlementGated.sol";

contract DeployEntitlementGatedExample is Deployer {
    function versionName() public pure override returns (string memory) {
        return "utils/entitlementGatedExample";
    }

    function __deploy(address deployer) internal override returns (address) {
        vm.broadcast(deployer);
        return
            address(new MockEntitlementGated(IEntitlementChecker(getDeployment("baseRegistry"))));
    }
}
