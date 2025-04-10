// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Deployer} from "scripts/common/Deployer.s.sol";
import {Airdrop} from "src/utils/Airdrop.sol";

contract DeployAirdrop is Deployer {
    function versionName() public pure override returns (string memory) {
        return "utils/airdrop";
    }

    function __deploy(address deployer) internal override returns (address) {
        vm.broadcast(deployer);
        return address(new Airdrop());
    }
}
