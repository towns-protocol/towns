// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IPartnerRegistryBase} from "./IPartnerRegistry.sol";

// libraries

import {PartnerRegistryStorage} from "./PartnerRegistryStorage.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// contracts

abstract contract PartnerRegistryBase is IPartnerRegistryBase {
    using EnumerableSet for EnumerableSet.AddressSet;

    function __PartnerRegistryBase_init(uint256 registryFee, uint256 maxPartnerFee) internal {
        PartnerRegistryStorage.Layout storage ds = PartnerRegistryStorage.layout();

        ds.partnerSettings = PartnerRegistryStorage.PartnerSettings({
            registryFee: registryFee,
            maxPartnerFee: maxPartnerFee
        });
    }

    function _registerPartner(Partner memory partner) internal {
        PartnerRegistryStorage.Layout storage ds = PartnerRegistryStorage.layout();

        PartnerRegistryStorage.PartnerSettings memory settings = ds.partnerSettings;

        if (msg.value != settings.registryFee) {
            revert PartnerRegistry__RegistryFeeNotPaid(settings.registryFee);
        }

        if (partner.fee > settings.maxPartnerFee) {
            revert PartnerRegistry__InvalidPartnerFee(partner.fee);
        }

        if (!ds.partners.add(partner.account)) {
            revert PartnerRegistry__PartnerAlreadyRegistered(partner.account);
        }

        ds.partnerByAccount[partner.account] = PartnerRegistryStorage.Partner({
            recipient: partner.recipient,
            fee: partner.fee,
            createdAt: block.timestamp,
            active: partner.active
        });

        emit PartnerRegistered(partner.account);
    }

    function _updatePartner(Partner memory partner) internal {
        if (partner.account != msg.sender) {
            revert PartnerRegistry__NotPartnerAccount(msg.sender);
        }

        if (partner.recipient == address(0)) {
            revert PartnerRegistry__InvalidRecipient();
        }

        PartnerRegistryStorage.Layout storage ds = PartnerRegistryStorage.layout();

        if (!ds.partners.contains(partner.account)) {
            revert PartnerRegistry__PartnerNotRegistered(partner.account);
        }

        PartnerRegistryStorage.PartnerSettings memory settings = ds.partnerSettings;

        if (partner.fee > settings.maxPartnerFee) {
            revert PartnerRegistry__InvalidPartnerFee(partner.fee);
        }

        ds.partnerByAccount[partner.account].recipient = partner.recipient;
        ds.partnerByAccount[partner.account].fee = partner.fee;
        ds.partnerByAccount[partner.account].active = partner.active;

        emit PartnerUpdated(partner.account);
    }

    function _removePartner(address account) internal {
        PartnerRegistryStorage.Layout storage ds = PartnerRegistryStorage.layout();

        if (!ds.partners.remove(account)) {
            revert PartnerRegistry__PartnerNotRegistered(account);
        }

        delete ds.partnerByAccount[account];

        emit PartnerRemoved(account);
    }

    function _setMaxPartnerFee(uint256 fee) internal {
        PartnerRegistryStorage.Layout storage ds = PartnerRegistryStorage.layout();
        ds.partnerSettings.maxPartnerFee = fee;

        emit MaxPartnerFeeSet(fee);
    }

    function _setRegistryFee(uint256 fee) internal {
        PartnerRegistryStorage.Layout storage ds = PartnerRegistryStorage.layout();
        ds.partnerSettings.registryFee = fee;

        emit RegistryFeeSet(fee);
    }

    function _partner(address account) internal view returns (Partner memory partner) {
        PartnerRegistryStorage.Layout storage ds = PartnerRegistryStorage.layout();

        partner = Partner({
            account: account,
            recipient: ds.partnerByAccount[account].recipient,
            fee: ds.partnerByAccount[account].fee,
            active: ds.partnerByAccount[account].active
        });
    }

    function _partnerFee(address account) internal view returns (uint256 fee) {
        PartnerRegistryStorage.Layout storage ds = PartnerRegistryStorage.layout();
        fee = ds.partnerByAccount[account].fee;
    }

    function _maxPartnerFee() internal view returns (uint256 fee) {
        PartnerRegistryStorage.Layout storage ds = PartnerRegistryStorage.layout();
        fee = ds.partnerSettings.maxPartnerFee;
    }

    function _registryFee() internal view returns (uint256 fee) {
        PartnerRegistryStorage.Layout storage ds = PartnerRegistryStorage.layout();
        fee = ds.partnerSettings.registryFee;
    }
}
