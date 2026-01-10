// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IEntryPoint} from "@eth-infinitism/account-abstraction/core/EntryPoint.sol";
import {IAccount} from "@eth-infinitism/account-abstraction/interfaces/IAccount.sol";
import {ISimpleAccount} from "./ISimpleAccount.sol";
import {IERC7821} from "@openzeppelin/contracts/interfaces/draft-IERC7821.sol";

// contracts
import {SimpleAccountBase} from "./SimpleAccountBase.sol";
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";
import {ERC7821} from "solady/accounts/ERC7821.sol";

// libraries
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {UserOperationLib, PackedUserOperation} from "@eth-infinitism/account-abstraction/core/UserOperationLib.sol";
import {ECDSA} from "solady/utils/ECDSA.sol";
import {LibBit} from "solady/utils/LibBit.sol";
import {SIG_VALIDATION_FAILED, SIG_VALIDATION_SUCCESS} from "@eth-infinitism/account-abstraction/core/Helpers.sol";
import {SimpleAppStorage} from "../app/SimpleAppStorage.sol";
import {SimpleAccountStorage} from "./SimpleAccountStorage.sol";
import {Validator} from "../../../utils/libraries/Validator.sol";

contract SimpleAccountFacet is ISimpleAccount, SimpleAccountBase, OwnableBase, ERC7821, Facet {
    using CustomRevert for bytes4;
    using UserOperationLib for PackedUserOperation;

    function __SimpleAccountFacet_init(
        address entrypoint,
        address coordinator
    ) external onlyInitializing {
        Validator.checkAddress(entrypoint);
        Validator.checkAddress(coordinator);
        __SimpleAccountFacet_init_unchained(entrypoint, coordinator);
    }

    /// @inheritdoc ISimpleAccount
    function updateEntryPoint(address newEntryPoint) external onlyOwner {
        Validator.checkAddress(newEntryPoint);
        SimpleAccountStorage.Layout storage $ = SimpleAccountStorage.getLayout();
        address oldEntryPoint = $.entryPoint;
        $.entryPoint = newEntryPoint;
        emit EntryPointUpdated(oldEntryPoint, newEntryPoint);
    }

    /// @inheritdoc ISimpleAccount
    function updateCoordinator(address newCoordinator) external onlyOwner {
        Validator.checkAddress(newCoordinator);
        SimpleAccountStorage.Layout storage $ = SimpleAccountStorage.getLayout();
        address oldCoordinator = $.coordinator;
        $.coordinator = newCoordinator;
        emit CoordinatorUpdated(oldCoordinator, newCoordinator);
    }

    /// @inheritdoc IAccount
    function validateUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external virtual override returns (uint256 validationData) {
        _requireFromEntryPoint();
        validationData = _validateSignature(userOp, userOpHash);
        _validateNonce(userOp.nonce);
        _payPrefund(missingAccountFunds);
    }

    /// @notice Return the account nonce.
    /// @dev This method returns the next sequential nonce.
    /// @dev For a nonce of a specific key, use `entrypoint.getNonce(account, key)`
    /// @return The next sequential nonce.
    function getNonce() public view virtual returns (uint256) {
        return entryPoint().getNonce(address(this), 0);
    }

    /// @notice Return the entryPoint used by this account.
    function entryPoint() public view override(SimpleAccountBase) returns (IEntryPoint) {
        return IEntryPoint(SimpleAccountStorage.getLayout().entryPoint);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      INTERNAL FUNCTIONS                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function __SimpleAccountFacet_init_unchained(address entrypoint, address coordinator) internal {
        SimpleAccountStorage.Layout storage $ = SimpleAccountStorage.getLayout();
        $.entryPoint = entrypoint;
        $.coordinator = coordinator;
        _addInterface(type(IAccount).interfaceId);
        _addInterface(type(ISimpleAccount).interfaceId);
        _addInterface(type(IERC7821).interfaceId);
    }

    /// @dev Override the 4-parameter execution to add custom authorization before the standard checks
    function _execute(
        bytes32,
        bytes calldata,
        Call[] calldata calls,
        bytes calldata opData
    ) internal virtual override {
        if (opData.length == 0) {
            _requireForExecute();
            return _execute(calls, bytes32(0));
        }

        SimpleAccount__OpDataNotSupported.selector.revertWith();
    }

    function _validateSignature(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash
    ) internal virtual override returns (uint256 validationData) {
        address signer = ECDSA.recoverCalldata(userOpHash, userOp.signature);
        address owner = _owner();

        // Early return for owner
        if (signer == owner) return SIG_VALIDATION_SUCCESS;

        // Check client using LibBit for consistency
        SimpleAppStorage.Layout storage $ = SimpleAppStorage.getLayout();
        if (signer == $.client) return SIG_VALIDATION_SUCCESS;

        return SIG_VALIDATION_FAILED;
    }

    function _getCoordinator() internal view returns (address) {
        return SimpleAccountStorage.getLayout().coordinator;
    }

    /// @notice Override the _requireForExecute function to allow the owner, client, coordinator, entry point, and self-calls.
    function _requireForExecute() internal view override {
        // Early return for owner
        if (msg.sender == _owner()) return;

        SimpleAppStorage.Layout storage $ = SimpleAppStorage.getLayout();
        SimpleAccountStorage.Layout storage $$ = SimpleAccountStorage.getLayout();

        // Use LibBit.or for efficient multi-condition check
        if (
            LibBit.or(
                LibBit.or(msg.sender == $.client, msg.sender == $$.coordinator),
                LibBit.or(msg.sender == $$.entryPoint, msg.sender == address(this))
            )
        ) return;

        SimpleAccount__NotFromTrustedCaller.selector.revertWith();
    }
}
