// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {ModularAccount} from "contracts/src/spaces/facets/executor/ModularAccount.sol";

contract DeployModularAccount is Deployer, FacetHelper {
    constructor() {
        addSelector(ModularAccount.installExecution.selector);
        addSelector(ModularAccount.uninstallExecution.selector);
        addSelector(ModularAccount.hasGroupAccess.selector);
        addSelector(ModularAccount.execute.selector);
    }

    // Deploying
    function versionName() public pure override returns (string memory) {
        return "facets/modularAccount";
    }

    function __deploy(address deployer) internal override returns (address) {
        vm.startBroadcast(deployer);
        ModularAccount modularAccount = new ModularAccount();
        vm.stopBroadcast();
        return address(modularAccount);
    }
}
