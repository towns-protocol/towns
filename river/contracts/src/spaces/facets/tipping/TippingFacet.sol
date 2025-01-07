// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ITipping} from "./ITipping.sol";

// libraries
import {TippingBase} from "./TippingBase.sol";
import {CustomRevert} from "contracts/src/utils/libraries/CustomRevert.sol";

// contracts
import {ERC721ABase} from "contracts/src/diamond/facets/token/ERC721A/ERC721ABase.sol";
import {Facet} from "@river-build/diamond/src/facets/Facet.sol";

contract TippingFacet is ITipping, ERC721ABase, Facet {
  function __Tipping_init() external onlyInitializing {
    _addInterface(type(ITipping).interfaceId);
  }

  /// @inheritdoc ITipping
  function tip(TipRequest calldata tipRequest) external payable {
    _validateTipRequest(
      msg.sender,
      tipRequest.receiver,
      tipRequest.currency,
      tipRequest.amount
    );

    TippingBase.tip(
      msg.sender,
      tipRequest.receiver,
      tipRequest.tokenId,
      tipRequest.currency,
      tipRequest.amount
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
  function totalTipsByCurrency(
    address currency
  ) external view returns (uint256) {
    return TippingBase.totalTipsByCurrency(currency);
  }

  /// @inheritdoc ITipping
  function tipAmountByCurrency(
    address currency
  ) external view returns (uint256) {
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
    if (currency == address(0))
      CustomRevert.revertWith(CurrencyIsZero.selector);
    if (sender == receiver) CustomRevert.revertWith(CannotTipSelf.selector);
    if (amount == 0) CustomRevert.revertWith(AmountIsZero.selector);
  }
}
