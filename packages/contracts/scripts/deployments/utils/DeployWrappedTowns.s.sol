// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IMessageLibManager} from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/IMessageLibManager.sol";

// libraries
import {LibLayerZeroValues} from "./LibLayerZeroValues.sol";
import {Create2Utils} from "../../../src/utils/libraries/Create2Utils.sol";

// contracts
import {wTowns} from "../../../src/tokens/towns/multichain/wTowns.sol";
import {Deployer} from "scripts/common/Deployer.s.sol";

contract DeployWrappedTowns is Deployer {
    function versionName() public pure override returns (string memory) {
        return "utils/wrapped-towns";
    }

    function __deploy(address deployer) internal override returns (address) {
        address endpoint = LibLayerZeroValues.getEndpoint(block.chainid);

        IMessageLibManager libManager = IMessageLibManager(endpoint);

        vm.startBroadcast(deployer);

        bytes memory initCode = abi.encodePacked(
            type(wTowns).creationCode,
            abi.encode(getDeployment("townsMainnet"), endpoint, deployer)
        );

        bytes32 salt = keccak256(abi.encodePacked(block.chainid, deployer));
        address wrappedTowns = Create2Utils.create2Deploy(salt, initCode);

        libManager.setSendLibrary(
            wrappedTowns,
            LibLayerZeroValues.getEid(56), // Destination chain eid (BNB Testnet)
            LibLayerZeroValues.getSendLib(block.chainid)
        );

        libManager.setReceiveLibrary(
            wrappedTowns,
            LibLayerZeroValues.getEid(block.chainid), // Source chain eid
            LibLayerZeroValues.getReceiveLib(block.chainid),
            0
        );

        vm.stopBroadcast();

        return wrappedTowns;
    }
}
