// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IAppTreasury} from "./IAppTreasury.sol";

// libraries
import {Permissions} from "src/spaces/facets/Permissions.sol";
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";

// contracts
import {AppAccountBase} from "src/spaces/facets/account/AppAccountBase.sol";
import {AppTreasuryBase} from "./AppTreasuryBase.sol";
import {Entitled} from "src/spaces/facets/Entitled.sol";
import {ReentrancyGuardTransient} from "solady/utils/ReentrancyGuardTransient.sol";
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";

// contracts

contract AppTreasuryFacet is
    IAppTreasury,
    AppTreasuryBase,
    AppAccountBase,
    Entitled,
    ReentrancyGuardTransient,
    Facet
{
    using CustomRevert for bytes4;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Requests                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    ///@inheritdoc IAppTreasury
    function fundsRequest(address currency, uint256 amount) external returns (bytes32 voucherId) {
        if (!_isAppExecuting(msg.sender)) AppTreasury__AppNotExecuting.selector.revertWith();
        if (_isCircuitBreakerTripped(currency)) AppTreasury__TreasuryPaused.selector.revertWith();
        return _fundsRequest(currency, amount);
    }

    ///@inheritdoc IAppTreasury
    function claimVoucher(bytes32 voucherId) external {
        _claimVoucher(voucherId);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Streams                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    ///@inheritdoc IAppTreasury
    function configureStream(
        address app,
        address currency,
        uint256 flowRate,
        uint256 maxBalance
    ) external {
        _validatePermission(Permissions.ConfigureTreasury);
        _configureStream(app, currency, flowRate, maxBalance);
    }

    ///@inheritdoc IAppTreasury
    function pauseStream(address app, address currency) external {
        _validatePermission(Permissions.ConfigureTreasury);
        _pauseStream(app, currency);
    }

    ///@inheritdoc IAppTreasury
    function resumeStream(address app, address currency) external {
        _validatePermission(Permissions.ConfigureTreasury);
        _resumeStream(app, currency);
    }

    ///@inheritdoc IAppTreasury
    function getStreamBalance(address app, address currency) external view returns (uint256) {
        return _getStreamBalance(app, currency);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          Vouchers                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    ///@inheritdoc IAppTreasury
    function approveVoucher(bytes32 voucherId) external {
        _validatePermission(Permissions.ConfigureTreasury);
        _approveVoucher(voucherId);
    }

    ///@inheritdoc IAppTreasury
    function cancelVoucher(bytes32 voucherId) external {
        _validatePermission(Permissions.ConfigureTreasury);
        _cancelVoucher(voucherId);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         Circuits                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    ///@inheritdoc IAppTreasury
    function configureCircuitBreaker(
        address currency,
        uint256 limit,
        uint256 duration,
        uint256 coolingOffPeriod
    ) external {
        _validatePermission(Permissions.ConfigureTreasury);
        _configureCircuitBreaker(currency, limit, duration, coolingOffPeriod);
    }
}
