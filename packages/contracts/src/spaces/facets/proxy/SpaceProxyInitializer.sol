// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC173} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {IERC5643} from "../../../diamond/facets/token/ERC5643/IERC5643.sol";
import {IMembership} from "../membership/IMembership.sol";
import {ISpaceProxyInitializer} from "./ISpaceProxyInitializer.sol";

// libraries

// contracts
import {Initializable} from "@towns-protocol/diamond/src/facets/initializable/Initializable.sol";
import {IntrospectionBase} from "@towns-protocol/diamond/src/facets/introspection/IntrospectionBase.sol";
import {TokenOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/token/TokenOwnableBase.sol";
import {ERC721ABase} from "../../../diamond/facets/token/ERC721A/ERC721ABase.sol";
import {EntitlementGatedBase} from "../gated/EntitlementGatedBase.sol";
import {MembershipBase} from "../membership/MembershipBase.sol";

contract SpaceProxyInitializer is
    ISpaceProxyInitializer,
    IntrospectionBase,
    TokenOwnableBase,
    ERC721ABase,
    MembershipBase,
    EntitlementGatedBase,
    Initializable
{
    function initialize(
        address owner,
        address manager,
        TokenOwnable memory tokenOwnable,
        Membership memory membership
    ) external initializer {
        __IntrospectionBase_init();
        __TokenOwnableBase_init(tokenOwnable);
        __ERC721ABase_init(membership.name, membership.symbol);
        __MembershipBase_init(membership, manager);

        _safeMint(owner, 1);
        _setFallbackEntitlementChecker();

        _setInterfaceIds();
    }

    function _setInterfaceIds() internal {
        _addInterface(0x80ac58cd); // ERC165 Interface ID for ERC721
        _addInterface(0x5b5e139f); // ERC165 Interface ID for ERC721Metadata
        _addInterface(type(IERC5643).interfaceId); // ERC165 Interface ID for IERC5643
        _addInterface(type(IERC173).interfaceId); // ERC165 Interface ID for IERC173 (owner)
        _addInterface(type(IMembership).interfaceId); // ERC165 Interface ID for IMembership
    }
}
