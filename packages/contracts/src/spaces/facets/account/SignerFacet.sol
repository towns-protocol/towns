// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {ERC1271Facet} from "@towns-protocol/diamond/src/facets/accounts/ERC1271Facet.sol";
import {EIP712Facet} from "@towns-protocol/diamond/src/utils/cryptography/EIP712Facet.sol";
import {TokenOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/token/TokenOwnableBase.sol";

contract SignerFacet is ERC1271Facet, EIP712Facet, TokenOwnableBase {
    function _erc1271Signer() internal view override returns (address) {
        return _owner();
    }

    function _domainNameAndVersion()
        internal
        pure
        override
        returns (string memory name, string memory version)
    {
        return ("Towns", "1");
    }
}
