// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IAddrResolver} from "@ensdomains/ens-contracts/resolvers/profiles/IAddrResolver.sol";
import {IAddressResolver} from "@ensdomains/ens-contracts/resolvers/profiles/IAddressResolver.sol";

// libraries
import {AddrResolverMod} from "./modules/AddrResolverMod.sol";
import {L2RegistryMod} from "./modules/L2RegistryMod.sol";
import {VersionRecordMod} from "./modules/VersionRecordMod.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";

contract AddrResolverFacet is IAddrResolver, IAddressResolver, Facet {
    using AddrResolverMod for AddrResolverMod.Layout;
    using VersionRecordMod for VersionRecordMod.Layout;

    function __AddrResolverFacet_init() external onlyInitializing {
        _addInterface(type(IAddrResolver).interfaceId);
        _addInterface(type(IAddressResolver).interfaceId);
    }

    function setAddr(bytes32 node, uint256 coinType, bytes memory a) external {
        L2RegistryMod.onlyAuthorized(node);
        uint64 version = VersionRecordMod.getStorage().recordVersions[node];
        AddrResolverMod.getStorage().setAddr(version, node, coinType, a);
    }

    function setAddr(bytes32 node, address a) external {
        L2RegistryMod.onlyAuthorized(node);
        uint64 version = VersionRecordMod.getStorage().recordVersions[node];
        AddrResolverMod.getStorage().setAddr(version, node, a);
    }

    function addr(bytes32 node, uint256 coinType) external view returns (bytes memory) {
        uint64 version = VersionRecordMod.getStorage().recordVersions[node];
        return AddrResolverMod.getStorage().addr(version, node, coinType);
    }

    function addr(bytes32 node) external view returns (address payable) {
        uint64 version = VersionRecordMod.getStorage().recordVersions[node];
        return AddrResolverMod.getStorage().addr(version, node);
    }
}
