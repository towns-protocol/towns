// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

// libraries
import {ERC20MetadataStorage} from "./ERC20MetadataStorage.sol";

// contracts

abstract contract ERC20MetadataBase is IERC20Metadata {
  function __ERC20Metadata_init(
    string memory name_,
    string memory symbol_,
    uint8 decimals_
  ) internal {
    ERC20MetadataStorage.Layout storage ds = ERC20MetadataStorage.layout();
    ds.name = name_;
    ds.symbol = symbol_;
    ds.decimals = decimals_;
  }

  /**
   * @notice return token name
   * @return token name
   */
  function _name() internal view virtual returns (string memory) {
    return ERC20MetadataStorage.layout().name;
  }

  /**
   * @notice return token symbol
   * @return token symbol
   */
  function _symbol() internal view virtual returns (string memory) {
    return ERC20MetadataStorage.layout().symbol;
  }

  /**
   * @notice return token decimals, generally used only for display purposes
   * @return token decimals
   */
  function _decimals() internal view virtual returns (uint8) {
    return ERC20MetadataStorage.layout().decimals;
  }

  /*
   * @notice set token name
   * @param name_ token name
   */
  function _setName(string memory name) internal virtual {
    ERC20MetadataStorage.layout().name = name;
  }

  /*
   * @notice set token symbol
   * @param symbol_ token symbol
   */
  function _setSymbol(string memory symbol) internal virtual {
    ERC20MetadataStorage.layout().symbol = symbol;
  }

  /*
   * @notice set token decimals
   * @param decimals_ token decimals
   */
  function _setDecimals(uint8 decimals) internal virtual {
    ERC20MetadataStorage.layout().decimals = decimals;
  }
}
