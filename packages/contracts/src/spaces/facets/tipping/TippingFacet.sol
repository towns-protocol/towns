// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ITipping} from "./ITipping.sol";
import {ITownsPointsBase} from "../../../airdrop/points/ITownsPoints.sol";
import {IPlatformRequirements} from "../../../factory/facets/platform/requirements/IPlatformRequirements.sol";
import {IAppRegistry} from "../../../apps/facets/registry/AppRegistryFacet.sol";

// libraries
import {TippingBase} from "./TippingBase.sol";
import {MembershipStorage} from "../membership/MembershipStorage.sol";
import {BasisPoints} from "../../../utils/libraries/BasisPoints.sol";
import {CurrencyTransfer} from "../../../utils/libraries/CurrencyTransfer.sol";
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {DependencyLib} from "../DependencyLib.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {ReentrancyGuard} from "solady/utils/ReentrancyGuard.sol";
import {ERC721ABase} from "src/diamond/facets/token/ERC721A/ERC721ABase.sol";
import {PointsBase} from "../points/PointsBase.sol";

contract TippingFacet is ITipping, ERC721ABase, PointsBase, Facet, ReentrancyGuard {
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

        uint256 tipAmount = tipRequest.amount;
        address receiver = tipRequest.receiver;

        address botApp = _getBotAppAddress(receiver);
        if (botApp != address(0)) receiver = botApp;

        if (tipRequest.currency == CurrencyTransfer.NATIVE_TOKEN) {
            uint256 protocolFee = _payProtocol(msg.sender, tipRequest.amount);
            tipAmount = tipRequest.amount - protocolFee;

            address airdropDiamond = _getAirdropDiamond();
            uint256 points = _getPoints(
                airdropDiamond,
                ITownsPointsBase.Action.Tip,
                abi.encode(protocolFee)
            );
            _mintPoints(airdropDiamond, msg.sender, points);
        }

        TippingBase.tip(msg.sender, receiver, tipRequest.tokenId, tipRequest.currency, tipAmount);

        emit Tip(
            tipRequest.tokenId,
            tipRequest.currency,
            msg.sender,
            receiver,
            tipRequest.amount,
            tipRequest.messageId,
            tipRequest.channelId
        );
    }

    /// @inheritdoc ITipping
    function tippingCurrencies() external view returns (address[] memory) {
        return TippingBase.tippingCurrencies();
    }

    /// @inheritdoc ITipping
    function tipsByCurrencyAndTokenId(
        uint256 tokenId,
        address currency
    ) external view returns (uint256) {
        return TippingBase.tipsByCurrencyByTokenId(tokenId, currency);
    }

    /// @inheritdoc ITipping
    function totalTipsByCurrency(address currency) external view returns (uint256) {
        return TippingBase.totalTipsByCurrency(currency);
    }

    /// @inheritdoc ITipping
    function tipAmountByCurrency(address currency) external view returns (uint256) {
        return TippingBase.tipAmountByCurrency(currency);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         Internal                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _validateTipRequest(
        address sender,
        address receiver,
        address currency,
        uint256 amount
    ) internal pure {
        if (currency == address(0)) {
            CustomRevert.revertWith(CurrencyIsZero.selector);
        }
        if (sender == receiver) CustomRevert.revertWith(CannotTipSelf.selector);
        if (amount == 0) CustomRevert.revertWith(AmountIsZero.selector);
    }

    function _payProtocol(address sender, uint256 amount) internal returns (uint256 protocolFee) {
        MembershipStorage.Layout storage ds = MembershipStorage.layout();
        IPlatformRequirements platform = IPlatformRequirements(ds.spaceFactory);

        protocolFee = BasisPoints.calculate(amount, 50); // 0.5%

        CurrencyTransfer.transferCurrency(
            CurrencyTransfer.NATIVE_TOKEN,
            sender,
            platform.getFeeRecipient(),
            protocolFee
        );
    }

    function _getBotAppAddress(address client) internal view returns (address) {
        return
            IAppRegistry(
                DependencyLib.getDependency(MembershipStorage.layout(), DependencyLib.APP_REGISTRY)
            ).getAppByClient(client);
    }
}
