// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {SpaceProxyInitializer} from "src/spaces/facets/proxy/SpaceProxyInitializer.sol";
import {Deployer} from "scripts/common/Deployer.s.sol";

contract DeploySpaceProxyInitializer is Deployer {
    function versionName() public pure override returns (string memory) {
        return "utils/spaceProxyInitializer";
    }

    function __deploy(address deployer) internal override returns (address) {
        bytes32 salt = bytes32(uint256(1));
        bytes32 initCodeHash = hashInitCode(type(SpaceProxyInitializer).creationCode);
        address soonToBe = vm.computeCreate2Address(salt, initCodeHash);

        vm.broadcast(deployer);
        SpaceProxyInitializer initializer = new SpaceProxyInitializer{salt: salt}();

        require(address(initializer) == soonToBe, "address mismatch");
        return address(initializer);
    }
}
