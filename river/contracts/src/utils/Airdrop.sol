// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

/**
 * @title Airdrop
 * @notice highly optimized airdrop contract
 */
contract Airdrop {
  /// @notice Airdrop ERC721 tokens to a list of addresses
  /// @param nft The address of the ERC721 contract
  /// @param addresses The addresses to airdrop to
  /// @param tokenIds The tokenIds to airdrop
  function airdropERC721(
    address nft,
    address[] calldata addresses,
    uint256[] calldata tokenIds
  ) external payable {
    assembly {
      // Check that the number of addresses matches the number of tokenIds
      if iszero(eq(tokenIds.length, addresses.length)) {
        revert(0, 0)
      }
      // transferFrom(address from, address to, uint256 tokenId)
      mstore(0x00, hex"23b872dd")
      // from address
      mstore(0x04, caller())

      // end of array
      let end := add(addresses.offset, shl(5, addresses.length))
      // diff = addresses.offset - tokenIds.offset
      let diff := sub(addresses.offset, tokenIds.offset)

      // Loop through the addresses
      for {
        let addressOffset := addresses.offset
      } 1 {

      } {
        // to address
        mstore(0x24, calldataload(addressOffset))
        // tokenId
        mstore(0x44, calldataload(sub(addressOffset, diff)))
        // transfer the token
        if iszero(call(gas(), nft, 0, 0x00, 0x64, 0, 0)) {
          revert(0, 0)
        }
        // increment the address offset
        addressOffset := add(addressOffset, 0x20)
        // if addressOffset >= end, break
        if iszero(lt(addressOffset, end)) {
          break
        }
      }
    }
  }

  /// @notice Airdrop ERC20 tokens to a list of addresses
  /// @param token The address of the ERC20 contract
  /// @param addresses The addresses to airdrop to
  /// @param amounts The amounts to airdrop
  /// @param totalAmount The total amount to airdrop
  function airdropERC20(
    address token,
    address[] calldata addresses,
    uint256[] calldata amounts,
    uint256 totalAmount
  ) external payable {
    assembly {
      // Check that the number of addresses matches the number of amounts
      if iszero(eq(amounts.length, addresses.length)) {
        revert(0, 0)
      }

      // transferFrom(address from, address to, uint256 amount)
      mstore(0x00, hex"23b872dd")
      // from address
      mstore(0x04, caller())
      // to address (this contract)
      mstore(0x24, address())
      // total amount
      mstore(0x44, totalAmount)

      // transfer total amount to this contract
      if iszero(call(gas(), token, 0, 0x00, 0x64, 0, 0)) {
        revert(0, 0)
      }

      // transfer(address to, uint256 value)
      mstore(0x00, hex"a9059cbb")

      // end of array
      let end := add(addresses.offset, shl(5, addresses.length))
      // diff = addresses.offset - amounts.offset
      let diff := sub(addresses.offset, amounts.offset)

      // Loop through the addresses
      for {
        let addressOffset := addresses.offset
      } 1 {

      } {
        // to address
        mstore(0x04, calldataload(addressOffset))
        // amount
        mstore(0x24, calldataload(sub(addressOffset, diff)))
        // transfer the tokens
        if iszero(call(gas(), token, 0, 0x00, 0x64, 0, 0)) {
          revert(0, 0)
        }
        // increment the address offset
        addressOffset := add(addressOffset, 0x20)
        // if addressOffset >= end, break
        if iszero(lt(addressOffset, end)) {
          break
        }
      }
    }
  }

  /// @notice Airdrop ETH to a list of addresses
  /// @param addresses The addresses to airdrop to
  /// @param amounts The amounts to airdrop
  function airdropETH(
    address[] calldata addresses,
    uint256[] calldata amounts
  ) external payable {
    assembly {
      // Check that the number of addresses matches the number of amounts
      if iszero(eq(amounts.length, addresses.length)) {
        revert(0, 0)
      }

      // iterator
      let i := addresses.offset
      // end of array
      let end := add(i, shl(5, addresses.length))
      // diff = addresses.offset - amounts.offset
      let diff := sub(amounts.offset, addresses.offset)

      // Loop through the addresses
      for {

      } 1 {

      } {
        // transfer the ETH
        if iszero(
          call(
            gas(),
            calldataload(i),
            calldataload(add(i, diff)),
            0x00,
            0x00,
            0x00,
            0x00
          )
        ) {
          revert(0x00, 0x00)
        }
        // increment the iterator
        i := add(i, 0x20)
        // if i >= end, break
        if eq(end, i) {
          break
        }
      }
    }
  }
}
