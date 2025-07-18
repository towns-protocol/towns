// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IMessageLibManager} from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/IMessageLibManager.sol";

// libraries
import {LibLayerZeroValues} from "./LibLayerZeroValues.sol";
import {Create2Utils} from "../../../src/utils/libraries/Create2Utils.sol";

// contracts
import {Towns} from "../../../src/tokens/towns/multichain/Towns.sol";
import {Deployer} from "scripts/common/Deployer.s.sol";

contract DeployTownsMulti is Deployer {
    function versionName() public pure override returns (string memory) {
        return "utils/townsBnb";
    }

    function __deploy(address deployer) internal override returns (address) {
        address endpoint = LibLayerZeroValues.getEndpoint(block.chainid);
        require(endpoint != address(0), "Endpoint not found");

        IMessageLibManager libManager = IMessageLibManager(endpoint);

        bytes memory initCode = abi.encodePacked(
            type(Towns).creationCode,
            abi.encode("Towns", "TOWNS", endpoint, deployer)
        );

        vm.startBroadcast(deployer);

        // test salt, remove before deploying
        bytes32 salt = keccak256(abi.encodePacked(block.chainid, deployer));
        address towns = Create2Utils.create2Deploy(salt, initCode);

        libManager.setSendLibrary(
            address(towns),
            LibLayerZeroValues.getEid(1), // Destination chain eid (Mainnet)
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
