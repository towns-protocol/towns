//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./NodeManager.sol";

contract NodeManagerUpgradeTest is NodeManager {
    uint16 private constant CONTRACT_VERSION = 2;

    function initialize() public override initializer {
        super.initialize();
        deployedContractVersion = CONTRACT_VERSION;
    }

    function getContractVersion() public pure override returns (uint16) {
        return super.getContractVersion() + 1;
    }

    function test() public pure override returns (string memory) {
        return "Greetings from NodeManagerUpgradeTest";
    }
}
