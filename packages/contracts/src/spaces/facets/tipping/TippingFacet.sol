// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ITownsPointsBase} from "../../../airdrop/points/ITownsPoints.sol";
import {IPlatformRequirements} from "../../../factory/facets/platform/requirements/IPlatformRequirements.sol";
import {ITipping} from "./ITipping.sol";

// libraries
import {BasisPoints} from "../../../utils/libraries/BasisPoints.sol";
import {CurrencyTransfer} from "../../../utils/libraries/CurrencyTransfer.sol";
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {MembershipStorage} from "../membership/MembershipStorage.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {ReentrancyGuard} from "solady/utils/ReentrancyGuard.sol";
import {ERC721ABase} from "../../../diamond/facets/token/ERC721A/ERC721ABase.sol";
import {PointsBase} from "../points/PointsBase.sol";
import {TippingBase} from "./TippingBase.sol";

contract TippingFacet is ITipping, TippingBase, ERC721ABase, PointsBase, Facet, ReentrancyGuard {
    using CustomRevert for bytes4;

    uint256 internal constant PROTOCOL_FEE_BPS = 50; // 0.5%

    function __Tipping_init() external onlyInitializing {
        _addInterface(type(ITipping).interfaceId);
    }

    /// @inheritdoc ITipping
    function tip(TipRequest calldata tipRequest) external payable nonReentrant {
        _validateTipRequest(
            msg.sender,
            tipRequest.receiver,
            tipRequest.currency,
            tipRequest.amount
        );

        uint256 tipAmount = _processTipPayment(msg.sender, tipRequest.currency, tipRequest.amount);

        _tipMember(
            msg.sender,
            tipRequest.receiver,
            tipRequest.tokenId,
            tipRequest.currency,
            tipAmount
        );

        emit Tip(
            tipRequest.tokenId,
            tipRequest.currency,
            msg.sender,
            tipRequest.receiver,
            tipRequest.amount,
            tipRequest.messageId,
            tipRequest.channelId
        );
    }

    /// @inheritdoc ITipping
    function tipApp(TipAppRequest calldata tipAppRequest) external payable nonReentrant {
        _validateTipRequest(
            msg.sender,
            tipAppRequest.appAddress,
            tipAppRequest.currency,
            tipAppRequest.amount
        );

        _validateReceiverIsContract(tipAppRequest.appAddress);

        uint256 tipAmount = _processTipPayment(
            msg.sender,
            tipAppRequest.currency,
            tipAppRequest.amount
        );

        _tipApp(msg.sender, tipAppRequest.appAddress, tipAppRequest.currency, tipAmount);

        emit TipApp(
            tipAppRequest.appAddress,
            tipAppRequest.currency,
            msg.sender,
            tipAppRequest.amount,
            tipAppRequest.messageId,
            tipAppRequest.channelId,
            tipAppRequest.metadata
        );
    }

    /// @inheritdoc ITipping
    function tippingCurrencies() external view returns (address[] memory) {
        return _tippingCurrencies();
    }

    /// @inheritdoc ITipping
    function tipsByCurrencyAndTokenId(
        uint256 tokenId,
        address currency
    ) external view returns (uint256) {
        return _tipsByCurrencyByTokenId(tokenId, currency);
    }

    /// @inheritdoc ITipping
    function totalTipsByCurrency(address currency) external view returns (uint256) {
        return _totalTipsByCurrency(currency);
    }

    /// @inheritdoc ITipping
    function tipAmountByCurrency(address currency) external view returns (uint256) {
        return _tipAmountByCurrency(currency);
    }

    /// @inheritdoc ITipping
    function tipsByCurrencyAndApp(
        address appAddress,
        address currency
    ) external view returns (uint256) {
        return _tipsByCurrencyByApp(appAddress, currency);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         Internal                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Pays the protocol fee to the platform fee recipient
    /// @param sender The address sending the tip
    /// @param amount The amount being tipped
    /// @return protocolFee The protocol fee amount
    function _payProtocol(address sender, uint256 amount) internal returns (uint256 protocolFee) {
        MembershipStorage.Layout storage ds = MembershipStorage.layout();
        IPlatformRequirements platform = IPlatformRequirements(ds.spaceFactory);

        protocolFee = BasisPoints.calculate(amount, PROTOCOL_FEE_BPS);

        CurrencyTransfer.transferCurrency(
            CurrencyTransfer.NATIVE_TOKEN,
            sender,
            platform.getFeeRecipient(),
            protocolFee
        );
    }

    /// @notice Processes tip payment including currency validation, protocol fee, and points minting
    /// @param sender The address sending the tip
    /// @param currency The currency being used for the tip
    /// @param amount The amount being tipped
    /// @return tipAmount The final tip amount after protocol fee deduction
    function _processTipPayment(
        address sender,
        address currency,
        uint256 amount
    ) internal returns (uint256 tipAmount) {
        tipAmount = amount;

        if (currency != CurrencyTransfer.NATIVE_TOKEN) {
            if (msg.value != 0) UnexpectedETH.selector.revertWith();
        } else {
            if (msg.value != tipAmount) MsgValueMismatch.selector.revertWith();

            uint256 protocolFee = _payProtocol(sender, tipAmount);
            tipAmount -= protocolFee;

            address airdropDiamond = _getAirdropDiamond();
            uint256 points = _getPoints(
                airdropDiamond,
                ITownsPointsBase.Action.Tip,
                abi.encode(protocolFee)
            );
            _mintPoints(airdropDiamond, sender, points);
        }
    }
}
