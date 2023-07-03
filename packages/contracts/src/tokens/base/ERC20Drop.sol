// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

// interfaces

// libraries
import {CurrencyTransfer} from "contracts/src/utils/libraries/CurrencyTransfer.sol";

// contracts
import {ERC20Base} from "./ERC20Base.sol";
import {PrimarySale} from "contracts/src/utils/PrimarySale.sol";
import {Drop} from "contracts/src/utils/Drop.sol";

/// @title ERC20Drop
/// @notice A drop contract that mints ERC20 tokens.
/// @dev The `drop` function is a distribution mechanism for tokens. It lets you set conditions such as price per token, currency, allowlist, and quantity per address.
contract ERC20Drop is ERC20Base, PrimarySale, Drop {
  constructor(
    string memory _name,
    string memory _symbol,
    address _primarySale
  ) ERC20Base(_name, _symbol) {
    _setPrimarySaleRecipient(_primarySale);
  }

  // =============================================================
  //                           Internal
  // =============================================================

  /// @dev Collects and distributes the primary sale value of tokens being claimed.
  function _collectPriceOnClaim(
    address _primarySaleRecipient,
    uint256 _quantityToClaim,
    address _currency,
    uint256 _pricePerToken
  ) internal virtual override {
    // check that price per token is not 0
    if (_pricePerToken == 0) {
      return;
    }

    // calculate the total price
    uint256 _totalPrice = (_quantityToClaim * _pricePerToken) / 1 ether;

    // check that total price is not 0
    require(_totalPrice > 0, "ERC20Drop: total price is 0");

    // check that currency and msg.value are the same
    if (_currency == CurrencyTransfer.NATIVE_TOKEN) {
      require(
        msg.value == _totalPrice,
        "ERC20Drop: msg.value is not equal to total price"
      );
    }

    // transfer the total price to the primary sale recipient
    address saleRecipient = _primarySaleRecipient == address(0)
      ? primarySaleRecipient()
      : _primarySaleRecipient;

    CurrencyTransfer.transferCurrency(
      _currency,
      _msgSender(),
      saleRecipient,
      _totalPrice
    );
  }

  /// @dev Transfers tokens being claimed.
  function _transferTokensOnClaim(
    address _to,
    uint256 _quantityBeingClaimed
  ) internal virtual override returns (uint256) {
    _mint(_to, _quantityBeingClaimed);
    return 0;
  }

  /// @dev Checks if the sender can set claim conditions.
  function _canSetClaimConditions() internal view override returns (bool) {
    return _msgSender() == owner();
  }

  /// @dev Checks if the sender can set contract uri
  function _canSetContractURI() internal view virtual override returns (bool) {
    return _msgSender() == owner();
  }

  /// @dev Checks if the sender can mint.
  function _canMint() internal view virtual override returns (bool) {
    return _msgSender() == owner();
  }

  /// @dev Checks if sender can set primary sale recipient.
  function _canSetPrimarySaleRecipient()
    internal
    view
    virtual
    override
    returns (bool)
  {
    return _msgSender() == owner();
  }
}
