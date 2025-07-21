// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {Interaction} from "scripts/common/Interaction.s.sol";
import {MockERC721A} from "test/mocks/MockERC721A.sol";

contract InteractMockERC721A is Interaction {
    function __interact(address deployer) internal override {
        address nft = getDeployment("mockERC721A");

        vm.startBroadcast(deployer);
        MockERC721A(nft).mintTo(deployer);
        vm.stopBroadcast();
    }
}
