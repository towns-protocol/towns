// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IMessageLibManager} from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/IMessageLibManager.sol";

// libraries
import {LibLayerZeroValues} from "./LibLayerZeroValues.sol";

// contracts
import {Towns} from "../../../src/tokens/towns/multichain/Towns.sol";
import {Deployer} from "scripts/common/Deployer.s.sol";

contract DeployTownsMulti is Deployer {
    function versionName() public pure override returns (string memory) {
        return "utils/towns";
    }

    function __deploy(address deployer) internal override returns (address) {
        address endpoint = LibLayerZeroValues.getEndpoint(block.chainid);
        require(endpoint != address(0), "Endpoint not found");

        IMessageLibManager libManager = IMessageLibManager(endpoint);

        vm.startBroadcast(deployer);
        Towns towns = new Towns("Towns", "TOWNS", endpoint, deployer);

        libManager.setSendLibrary(
            address(towns),
            LibLayerZeroValues.getEid(11155111), // Destination chain eid (Sepolia Testnet)
            LibLayerZeroValues.getSendLib(block.chainid)
        );

        libManager.setReceiveLibrary(
            address(towns),
            LibLayerZeroValues.getEid(block.chainid), // Source chain eid
            LibLayerZeroValues.getReceiveLib(block.chainid),
            0
        );

        vm.stopBroadcast();
        return address(towns);
    }
}
