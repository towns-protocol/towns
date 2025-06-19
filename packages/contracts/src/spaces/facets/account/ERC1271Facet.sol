// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {ERC1271} from "solady/accounts/ERC1271.sol";
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {Entitled} from "../Entitled.sol";

contract ERC1271Facet is ERC1271, Entitled, Facet {
    function _domainNameAndVersion()
        internal
        pure
        override
        returns (string memory name, string memory version)
    {
        return ("Space", "1");
    }

    function _erc1271Signer() internal view override returns (address) {
        return _owner();
    }

    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _domainSeparator();
    }
}
