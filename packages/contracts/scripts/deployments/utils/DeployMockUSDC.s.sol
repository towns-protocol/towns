// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Deployer} from "scripts/common/Deployer.s.sol";
import {MockERC20} from "test/mocks/MockERC20.sol";

contract DeployMockUSDC is Deployer {
    function versionName() public pure override returns (string memory) {
        return "utils/mockUSDC";
    }

    function __deploy(address deployer) internal override returns (address) {
        vm.startBroadcast(deployer);
        MockERC20 deployment = new MockERC20("USD Coin", "USDC", 6);
        vm.stopBroadcast();

        return address(deployment);
    }
}
