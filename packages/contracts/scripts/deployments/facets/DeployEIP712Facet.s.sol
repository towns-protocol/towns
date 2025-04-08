// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";
import {EIP712Facet} from "@towns-protocol/diamond/src/utils/cryptography/EIP712Facet.sol";
import {Deployer} from "scripts/common/Deployer.s.sol";

contract DeployEIP712Facet is FacetHelper, Deployer {
    constructor() {
        addSelector(EIP712Facet.DOMAIN_SEPARATOR.selector);
        addSelector(EIP712Facet.nonces.selector);
        addSelector(EIP712Facet.eip712Domain.selector);
    }

    function versionName() public pure override returns (string memory) {
        return "facets/eip712Facet";
    }

    function initializer() public pure override returns (bytes4) {
        return EIP712Facet.__EIP712_init.selector;
    }

    function makeInitData(
        string memory name,
        string memory version
    ) public pure returns (bytes memory) {
        return abi.encodeWithSelector(initializer(), name, version);
    }

    function __deploy(address deployer) internal override returns (address) {
        vm.startBroadcast(deployer);
        EIP712Facet facet = new EIP712Facet();
        vm.stopBroadcast();
        return address(facet);
    }
}
