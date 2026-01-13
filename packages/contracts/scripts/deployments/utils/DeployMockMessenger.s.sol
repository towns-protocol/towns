// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {Deployer} from "scripts/common/Deployer.s.sol";
import {MockMessenger} from "test/mocks/MockMessenger.sol";

contract DeployMockMessenger is Deployer {
    function versionName() public pure override returns (string memory) {
        return "facets/mockMessengerFacet";
    }

    function __deploy(address deployer) internal override returns (address) {
        if (isAnvil() || isTesting()) {
            vm.startBroadcast(deployer);
            MockMessenger messenger = new MockMessenger();
            vm.stopBroadcast();
            return address(messenger);
        } else {
            return _getMessenger();
        }
    }

    function _getMessenger() internal view returns (address) {
        // Base or Base (Sepolia)
        if (block.chainid == 8453 || block.chainid == 84_532) {
            return 0x4200000000000000000000000000000000000007;
        } else if (block.chainid == 1) {
            // Mainnet
            return 0x866E82a600A1414e583f7F13623F1aC5d58b0Afa;
        } else if (block.chainid == 11_155_111) {
            // Sepolia
            return 0xC34855F4De64F1840e5686e64278da901e261f20;
        } else {
            revert("DeployMockMessenger: Invalid network");
        }
    }
}
