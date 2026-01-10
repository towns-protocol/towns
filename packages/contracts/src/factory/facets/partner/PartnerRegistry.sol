// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IPartnerRegistry} from "./IPartnerRegistry.sol";

// libraries

// contracts
import {PartnerRegistryBase} from "./PartnerRegistryBase.sol";
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";

contract PartnerRegistry is PartnerRegistryBase, OwnableBase, IPartnerRegistry, Facet {
    function __PartnerRegistry_init() external onlyInitializing {
        _addInterface(type(IPartnerRegistry).interfaceId);
    }

    function registerPartner(Partner calldata partner) external payable {
        _registerPartner(partner);
    }

    function updatePartner(Partner calldata partner) external {
        _updatePartner(partner);
    }

    function removePartner(address account) external onlyOwner {
        _removePartner(account);
    }

    // =============================================================
    //                           ADMIN
    // =============================================================
    function setMaxPartnerFee(uint256 fee) external onlyOwner {
        _setMaxPartnerFee(fee);
    }

    function setRegistryFee(uint256 fee) external onlyOwner {
        _setRegistryFee(fee);
    }

    function partnerInfo(address account) external view returns (Partner memory) {
        return _partner(account);
    }

    function partnerFee(address account) external view returns (uint256 fee) {
        return _partnerFee(account);
    }

    function maxPartnerFee() external view returns (uint256 fee) {
        return _maxPartnerFee();
    }

    function registryFee() external view returns (uint256 fee) {
        return _registryFee();
    }
}
