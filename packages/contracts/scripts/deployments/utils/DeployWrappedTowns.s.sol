// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IMessageLibManager} from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/IMessageLibManager.sol";

// libraries
import {LibLayerZeroValues} from "./LibLayerZeroValues.sol";

// contracts
import {wTowns} from "../../../src/tokens/towns/multichain/wTowns.sol";
import {Deployer} from "scripts/common/Deployer.s.sol";

// debuggging
import {console} from "forge-std/console.sol";

contract DeployWrappedTowns is Deployer {
    function versionName() public pure override returns (string memory) {
        return "utils/wrapped-towns";
    }

    function __deploy(address deployer) internal override returns (address) {
        address endpoint = LibLayerZeroValues.getEndpoint(block.chainid);

        IMessageLibManager libManager = IMessageLibManager(endpoint);

        vm.startBroadcast(deployer);
        wTowns towns = new wTowns(LibLayerZeroValues.getToken(block.chainid), endpoint, deployer);

        libManager.setSendLibrary(
            address(towns),
            LibLayerZeroValues.getEid(97), // Destination chain eid (BNB Testnet)
            LibLayerZeroValues.getSendLib(block.chainid)
        );

        libManager.setReceiveLibrary(
            address(towns),
            LibLayerZeroValues.getEid(block.chainid), // Source chain eid
            LibLayerZeroValues.getReceiveLib(block.chainid),
            0
        );

        vm.stopBroadcast();

        console.log("Set these values on destination peer");
        console.log("EID", LibLayerZeroValues.getEid(block.chainid));
        console.log("Peer Id");
        console.logBytes32(bytes32(uint256(uint160(address(towns)))));

        return address(towns);
    }
}
