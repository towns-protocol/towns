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
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";

// contracts

contract AppTreasuryFacet is IAppTreasury, AppTreasuryBase, AppAccountBase, Entitled, Facet {
    using CustomRevert for bytes4;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Requests                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function requestFunds(address currency, uint256 amount) external returns (bytes32 voucherId) {
        if (!_isAppExecuting(msg.sender)) AppTreasury__AppNotExecuting.selector.revertWith();
        if (_isCircuitBreakerTripped(currency)) AppTreasury__TreasuryPaused.selector.revertWith();
        return _requestFunds(currency, amount);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Streams                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    ///@inheritdoc IAppTreasury
    function configureStream(address app, address currency, uint256 flowRate) external {
        _validatePermission(Permissions.ConfigureTreasury);
        _configureStream(app, currency, flowRate);
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
}
