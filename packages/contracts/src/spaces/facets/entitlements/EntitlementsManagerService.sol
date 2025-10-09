// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IEntitlement} from "../../entitlements/IEntitlement.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {EntitlementsManagerStorage} from "./EntitlementsManagerStorage.sol";

// contracts

library EntitlementsManagerService {
    using EnumerableSet for EnumerableSet.AddressSet;
    using EntitlementsManagerStorage for EntitlementsManagerStorage.Layout;
    using CustomRevert for bytes4;

    error InvalidEntitlementAddress();
    error InvalidEntitlementInterface();
    error ImmutableEntitlement();
    error EntitlementDoesNotExist();
    error EntitlementAlreadyExists();

    string internal constant IN_TOWN = "";

    function checkEntitlement(address entitlement) internal view {
        EntitlementsManagerStorage.Layout storage ds = EntitlementsManagerStorage.layout();

        if (!ds.entitlements.contains(entitlement)) EntitlementDoesNotExist.selector.revertWith();
    }

    // TODO define what isImmutable means
    function addEntitlement(address entitlement, bool isImmutable) internal {
        EntitlementsManagerStorage.Layout storage ds = EntitlementsManagerStorage.layout();

        if (ds.entitlements.contains(entitlement)) {
            EntitlementAlreadyExists.selector.revertWith();
        }

        bool isCrosschain = IEntitlement(entitlement).isCrosschain();

        ds.entitlements.add(entitlement);
        EntitlementsManagerStorage.Entitlement storage entitlementData = ds.entitlementByAddress[
            entitlement
        ];
        entitlementData.entitlement = IEntitlement(entitlement);
        entitlementData.isImmutable = isImmutable;
        entitlementData.isCrosschain = isCrosschain;
    }

    function removeEntitlement(address entitlement) internal {
        EntitlementsManagerStorage.Layout storage ds = EntitlementsManagerStorage.layout();

        if (!ds.entitlements.contains(entitlement)) EntitlementDoesNotExist.selector.revertWith();

        if (ds.entitlementByAddress[entitlement].isImmutable) {
            ImmutableEntitlement.selector.revertWith();
        }

        ds.entitlements.remove(entitlement);
        delete ds.entitlementByAddress[entitlement];
    }

    function getEntitlement(
        address entitlement
    )
        internal
        view
        returns (
            string memory name,
            address moduleAddress,
            string memory moduleType,
            bool isImmutable
        )
    {
        EntitlementsManagerStorage.Layout storage ds = EntitlementsManagerStorage.layout();

        if (!ds.entitlements.contains(entitlement)) EntitlementDoesNotExist.selector.revertWith();

        EntitlementsManagerStorage.Entitlement storage entitlementData = ds.entitlementByAddress[
            entitlement
        ];

        name = IEntitlement(entitlement).name();
        moduleType = IEntitlement(entitlement).moduleType();
        moduleAddress = address(entitlementData.entitlement);
        isImmutable = entitlementData.isImmutable;
    }

    function getEntitlements() internal view returns (address[] memory) {
        return EntitlementsManagerStorage.layout().entitlements.values();
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         VALIDATION                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function validateEntitlement(address entitlement) internal view {
        if (entitlement == address(0)) InvalidEntitlementAddress.selector.revertWith();

        try IERC165(entitlement).supportsInterface(type(IEntitlement).interfaceId) returns (
            bool supported
        ) {
            if (!supported) InvalidEntitlementInterface.selector.revertWith();
        } catch {
            InvalidEntitlementInterface.selector.revertWith();
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       PROXY METHODS                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function proxyGetEntitlementDataByRole(
        address entitlement,
        uint256 role
    ) internal view returns (bytes memory) {
        checkEntitlement(entitlement);
        return IEntitlement(entitlement).getEntitlementDataByRoleId(role);
    }

    function proxyAddRoleToEntitlement(
        address entitlement,
        uint256 role,
        bytes calldata entitlementData
    ) internal {
        checkEntitlement(entitlement);
        IEntitlement(entitlement).setEntitlement(role, entitlementData);
    }

    function proxyRemoveRoleFromEntitlement(address entitlement, uint256 role) internal {
        checkEntitlement(entitlement);
        IEntitlement(entitlement).removeEntitlement(role);
    }
}
