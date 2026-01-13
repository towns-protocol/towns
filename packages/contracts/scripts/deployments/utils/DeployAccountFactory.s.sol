// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {EntryPoint} from "@eth-infinitism/account-abstraction/core/EntryPoint.sol";
import {SimpleAccountFactory} from "@eth-infinitism/account-abstraction/samples/SimpleAccountFactory.sol";
import {Deployer} from "scripts/common/Deployer.s.sol";

contract DeployAccountFactory is Deployer {
    function versionName() public pure override returns (string memory) {
        return "utils/accountFactory";
    }

    function __deploy(address deployer) internal override returns (address) {
        if (!isAnvil()) revert("not supported");

        address entrypoint = getDeployment("entrypoint");

        bytes32 salt = bytes32(uint256(1));
        bytes32 initCodeHash = hashInitCode(
            type(SimpleAccountFactory).creationCode,
            abi.encode(entrypoint)
        );

        address soonToBe = computeCreate2Address(salt, initCodeHash);

        vm.broadcast(deployer);
        SimpleAccountFactory factory = new SimpleAccountFactory{salt: salt}(
            EntryPoint(payable(entrypoint))
        );

        require(address(factory) == soonToBe, "address mismatch");

        return address(factory);
    }
}
