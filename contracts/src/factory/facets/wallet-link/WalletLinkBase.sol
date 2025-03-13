// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IWalletLinkBase} from "./IWalletLink.sol";
import {IDelegateRegistry} from "./interfaces/IDelegateRegistry.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {ECDSA} from "solady/utils/ECDSA.sol";
import {WalletLinkStorage} from "./WalletLinkStorage.sol";

import {WalletLinkLib} from "./libraries/WalletLinkLib.sol";

import {WalletLib} from "./libraries/WalletLib.sol";
import {CustomRevert} from "contracts/src/utils/libraries/CustomRevert.sol";
import {SolanaUtils} from "./libraries/SolanaUtils.sol";

// contracts
import {Nonces} from "@river-build/diamond/src/utils/Nonces.sol";
import {EIP712Base} from "@river-build/diamond/src/utils/cryptography/signature/EIP712Base.sol";

abstract contract WalletLinkBase is IWalletLinkBase, EIP712Base, Nonces {
  using EnumerableSet for EnumerableSet.AddressSet;
  using EnumerableSet for EnumerableSet.Bytes32Set;
  using WalletLib for WalletLib.RootWallet;

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           Constants
  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /// @dev `keccak256("LinkedWallet(string message,address userID,uint256 nonce)")`.
  // https://eips.ethereum.org/EIPS/eip-712
  bytes32 private constant _LINKED_WALLET_TYPEHASH =
    0x6bb89d031fcd292ecd4c0e6855878b7165cebc3a2f35bc6bbac48c088dd8325c;

  /// @dev Maximum number of linked wallets per root key
  uint256 internal constant MAX_LINKED_WALLETS = 10;

  /// @dev Dependency name of SCL_EIP6565 verifier library
  bytes32 internal constant SCL_EIP6565 = bytes32("SCL_EIP6565");

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                      External - Write
  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/

  /// @dev Links a caller address to a root wallet
  /// @param rootWallet the root wallet that the caller is linking to
  /// @param nonce a nonce used to prevent replay attacks, nonce must always be higher than previous nonce
  function _linkCallerToRootWallet(
    LinkedWalletData calldata rootWallet,
    uint256 nonce
  ) internal {
    WalletLinkStorage.Layout storage ds = WalletLinkStorage.layout();

    // The caller is the wallet that is being linked to the root wallet
    address newWallet = msg.sender;

    _verifyWallets(ds, newWallet, rootWallet.addr);

    bytes32 structHash = _getLinkedWalletTypedDataHash(
      rootWallet.message,
      newWallet,
      nonce
    );

    //Verify that the root wallet signature contains the correct nonce and the correct caller wallet
    bytes32 rootKeyMessageHash = _hashTypedDataV4(structHash);

    // Verify the signature of the root wallet is correct for the nonce and wallet address
    if (
      ECDSA.recover(rootKeyMessageHash, rootWallet.signature) != rootWallet.addr
    ) {
      revert WalletLink__InvalidSignature();
    }

    //Check that the nonce being used is higher than the last nonce used
    _useCheckedNonce(rootWallet.addr, nonce);

    //set link in mapping
    ds.walletsByRootKey[rootWallet.addr].add(newWallet);
    ds.rootKeyByWallet[newWallet] = rootWallet.addr;

    emit LinkWalletToRootKey(newWallet, rootWallet.addr);
  }

  /// @dev Links a wallet to a root wallet
  /// @param wallet the wallet that is being linked to the root wallet
  /// @param rootWallet the root wallet that the wallet is linking to
  /// @param nonce The root wallet's nonce used to prevent replay attacks, nonce must always be higher than previous nonce
  /// @dev Links a wallet to a root wallet by verifying both the wallet's signature and root wallet's signature.
  /// The wallet signs a message containing the root wallet's address and nonce, while the root wallet signs a message
  /// containing the wallet's address and nonce. Both signatures must be valid for the link to be created.
  function _linkWalletToRootWallet(
    LinkedWalletData calldata wallet,
    LinkedWalletData calldata rootWallet,
    uint256 nonce
  ) internal {
    WalletLinkStorage.Layout storage ds = WalletLinkStorage.layout();

    _verifyWallets(ds, wallet.addr, rootWallet.addr);

    bytes32 structHash = _getLinkedWalletTypedDataHash(
      wallet.message,
      wallet.addr,
      nonce
    );

    //Verify that the root wallet signature contains the correct nonce and the correct wallet
    bytes32 rootKeyMessageHash = _hashTypedDataV4(structHash);

    // Verify the signature of the root wallet is correct for the nonce and wallet address
    if (
      ECDSA.recover(rootKeyMessageHash, rootWallet.signature) != rootWallet.addr
    ) {
      revert WalletLink__InvalidSignature();
    }

    structHash = _getLinkedWalletTypedDataHash(
      rootWallet.message,
      rootWallet.addr,
      nonce
    );
    bytes32 walletMessageHash = _hashTypedDataV4(structHash);

    // Verify the signature of the wallet is correct for the nonce and root wallet address
    if (ECDSA.recover(walletMessageHash, wallet.signature) != wallet.addr) {
      revert WalletLink__InvalidSignature();
    }

    //Check that the nonce being used is higher than the last nonce used
    _useCheckedNonce(rootWallet.addr, nonce);

    //set link in mapping
    ds.walletsByRootKey[rootWallet.addr].add(wallet.addr);
    ds.rootKeyByWallet[wallet.addr] = rootWallet.addr;

    emit LinkWalletToRootKey(wallet.addr, rootWallet.addr);
  }

  function _linkNonEVMWalletToRootWalletViaCaller(
    NonEVMLinkedWalletData calldata nonEVMWallet,
    uint256 nonce
  ) internal {
    WalletLinkStorage.Layout storage ds = WalletLinkStorage.layout();
    address linkedWallet = msg.sender;
    bytes32 walletHash = keccak256(
      abi.encode(nonEVMWallet.addr, nonEVMWallet.vmType)
    );

    _validateNonEVMWalletInputs(ds, nonEVMWallet, walletHash);

    address rootKey = ds.rootKeyByWallet[linkedWallet];

    WalletLib.RootWallet storage rootWallet = ds.rootWalletByRootKey[rootKey];

    if (rootWallet.exists(walletHash)) {
      revert WalletLink__NonEVMWalletAlreadyLinked(nonEVMWallet.addr, rootKey);
    }

    // Check that we haven't reached the maximum number of linked wallets
    if (rootWallet.walletHashes.length() >= MAX_LINKED_WALLETS) {
      revert WalletLink__MaxLinkedWalletsReached();
    }

    if (nonEVMWallet.vmType == VirtualMachineType.SVM) {
      _validateAddressFormatByVMType(nonEVMWallet.addr, nonEVMWallet.vmType);
      _verifySolanaWallet(nonEVMWallet);
    } else {
      CustomRevert.revertWith(
        IWalletLinkBase.WalletLink__UnsupportedVMType.selector
      );
    }

    ds.rootKeyByHash[walletHash] = rootKey;
    rootWallet.addWallet(walletHash, nonEVMWallet.addr, nonEVMWallet.vmType);

    _useCheckedNonce(rootKey, nonce);

    emit LinkNonEVMWalletToRootWallet(walletHash, rootKey);
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           Remove
  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/

  function _removeNonEVMWalletLink(
    string memory addr,
    VirtualMachineType vmType,
    uint256 nonce
  ) internal {
    WalletLinkStorage.Layout storage ds = WalletLinkStorage.layout();
    address linkedWallet = msg.sender;
    bytes32 walletHash = keccak256(abi.encode(addr, vmType));
    address rootKey = ds.rootKeyByWallet[linkedWallet];

    if (rootKey == address(0)) {
      revert WalletLink__NotLinked(linkedWallet, rootKey);
    }

    WalletLib.RootWallet storage rootWallet = ds.rootWalletByRootKey[rootKey];

    if (!rootWallet.exists(walletHash)) {
      revert WalletLink__NonEVMWalletNotLinked(addr, rootKey);
    }

    // Check that the nonce is higher than the last nonce used
    _useCheckedNonce(rootKey, nonce);

    // Remove the wallet from the root wallet
    rootWallet.removeWallet(walletHash);

    emit RemoveNonEVMWalletLink(walletHash, rootKey);
  }

  function _removeLink(
    address walletToRemove,
    LinkedWalletData calldata rootWallet,
    uint256 nonce
  ) internal {
    WalletLinkStorage.Layout storage ds = WalletLinkStorage.layout();

    // Check walletToRemove or rootWallet.addr are not address(0)
    if (walletToRemove == address(0) || rootWallet.addr == address(0)) {
      revert WalletLink__InvalidAddress();
    }

    // Check walletToRemove is not the root wallet
    if (walletToRemove == rootWallet.addr) {
      revert WalletLink__CannotRemoveRootWallet();
    }

    // Check that the wallet is linked to the root wallet
    if (ds.rootKeyByWallet[walletToRemove] != rootWallet.addr) {
      revert WalletLink__NotLinked(walletToRemove, rootWallet.addr);
    }

    // Check that the wallet is not the default wallet
    if (
      ds.rootWalletByRootKey[rootWallet.addr].defaultWallet == walletToRemove
    ) {
      revert WalletLink__CannotRemoveDefaultWallet();
    }

    // Verify that the root wallet signature contains the correct nonce and the correct wallet
    bytes32 structHash = _getLinkedWalletTypedDataHash(
      rootWallet.message,
      walletToRemove,
      nonce
    );
    bytes32 rootKeyMessageHash = _hashTypedDataV4(structHash);

    // Verify the signature of the root wallet is correct for the nonce and wallet address
    if (
      ECDSA.recover(rootKeyMessageHash, rootWallet.signature) != rootWallet.addr
    ) {
      revert WalletLink__InvalidSignature();
    }

    //Check that the nonce being used is higher than the last nonce used
    _useCheckedNonce(rootWallet.addr, nonce);

    // Remove the link in the walletToRemove to root keys map
    ds.rootKeyByWallet[walletToRemove] = address(0);
    ds.walletsByRootKey[rootWallet.addr].remove(walletToRemove);

    emit RemoveLink(walletToRemove, msg.sender);
  }

  function _removeCallerLink() internal {
    WalletLinkStorage.Layout storage ds = WalletLinkStorage.layout();
    address walletToRemove = msg.sender;
    address rootWallet = ds.rootKeyByWallet[walletToRemove];

    if (rootWallet == address(0)) {
      revert WalletLink__NotLinked(walletToRemove, rootWallet);
    }

    // check that the default wallet is not the wallet to remove
    if (ds.rootWalletByRootKey[rootWallet].defaultWallet == walletToRemove) {
      revert WalletLink__CannotRemoveDefaultWallet();
    }

    // Remove the link in the walletToRemove to root keys map
    ds.rootKeyByWallet[walletToRemove] = address(0);
    ds.walletsByRootKey[rootWallet].remove(walletToRemove);

    emit RemoveLink(walletToRemove, rootWallet);
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                        Read
  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  function _getWalletsByRootKey(
    address rootKey
  ) internal view returns (address[] memory wallets) {
    return WalletLinkStorage.layout().walletsByRootKey[rootKey].values();
  }

  function _getWalletsByRootKeyWithDelegations(
    address rootKey
  ) internal view returns (address[] memory wallets) {
    // Single storage read for layout
    WalletLinkStorage.Layout storage ds = WalletLinkStorage.layout();
    EnumerableSet.AddressSet storage linkedWalletsSet = ds.walletsByRootKey[
      rootKey
    ];

    uint256 linkedWalletsLength = linkedWalletsSet.length();
    if (linkedWalletsLength == 0) {
      return new address[](0);
    }

    // Get linked wallets and count total delegations
    address[] memory linkedWallets = linkedWalletsSet.values();
    uint256 totalCount = linkedWalletsLength;

    IDelegateRegistry.Delegation[][] memory allDelegations = WalletLinkLib
      .getDelegationsForWallets(linkedWallets);

    for (uint256 i; i < linkedWalletsLength; ++i) {
      IDelegateRegistry.Delegation[] memory delegations = allDelegations[i];

      uint256 delegationsLength = delegations.length;
      for (uint256 j; j < delegationsLength; ++j) {
        if (delegations[j].type_ == IDelegateRegistry.DelegationType.ALL) {
          ++totalCount;
        }
      }
    }

    // Initialize result array
    wallets = new address[](totalCount);

    assembly ("memory-safe") {
      // Copy linked wallets to result array
      let walletsPtr := add(wallets, 0x20)
      let linkedWalletsPtr := add(linkedWallets, 0x20)
      let size := shl(5, linkedWalletsLength)

      // Copy linked wallets data
      pop(staticcall(gas(), 4, linkedWalletsPtr, size, walletsPtr, size))
    }

    // Second pass: add delegators
    uint256 currentIndex = linkedWalletsLength;

    for (uint256 i; i < linkedWalletsLength; ++i) {
      IDelegateRegistry.Delegation[] memory delegations = allDelegations[i];
      uint256 delegationsLength = delegations.length;
      for (uint256 j; j < delegationsLength; ++j) {
        IDelegateRegistry.Delegation memory delegation = delegations[j];
        if (delegation.type_ == IDelegateRegistry.DelegationType.ALL) {
          unchecked {
            wallets[currentIndex++] = delegation.from;
          }
        }
      }
    }

    return wallets;
  }

  function _getRootKeyByWallet(
    address wallet
  ) internal view returns (address rootKey) {
    return WalletLinkStorage.layout().rootKeyByWallet[wallet];
  }

  function _checkIfLinked(
    address rootKey,
    address wallet
  ) internal view returns (bool) {
    WalletLinkStorage.Layout storage ds = WalletLinkStorage.layout();
    return ds.rootKeyByWallet[wallet] == rootKey;
  }

  function _checkIfNonEVMWalletLinked(
    address rootKey,
    bytes32 walletHash
  ) internal view returns (bool) {
    return WalletLinkStorage.layout().rootKeyByHash[walletHash] == rootKey;
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                   Default Wallet Functions                 */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function _setDefaultWallet(address caller, address defaultWallet) internal {
    // check that the default wallet is not address(0)
    if (defaultWallet == address(0)) {
      revert WalletLink__InvalidAddress();
    }

    address rootKey = _getRootKeyByWallet(defaultWallet);

    // check that the default wallet is linked to a root wallet
    if (rootKey == address(0)) {
      revert WalletLink__NotLinked(defaultWallet, rootKey);
    }

    // check that the caller can only be a linked wallet or the root wallet
    if (!_checkIfLinked(rootKey, caller) && caller != rootKey) {
      revert WalletLink__NotLinked(caller, rootKey);
    }

    WalletLinkStorage.Layout storage ds = WalletLinkStorage.layout();
    WalletLib.RootWallet storage rootWallet = ds.rootWalletByRootKey[rootKey];

    // check that the default isn't already the default wallet
    if (rootWallet.defaultWallet == defaultWallet) {
      revert WalletLink__DefaultWalletAlreadySet();
    }

    rootWallet.defaultWallet = defaultWallet;

    emit SetDefaultWallet(rootKey, defaultWallet);
  }

  function _getDefaultWallet(
    address rootKey
  ) internal view returns (address defaultWallet) {
    return
      WalletLinkStorage.layout().rootWalletByRootKey[rootKey].defaultWallet;
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                      Dependencies Functions                */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
  function _getDependency(bytes32 dependency) internal view returns (address) {
    return WalletLinkStorage.layout().dependencies[dependency];
  }

  function _setDependency(
    bytes32 dependency,
    address dependencyAddress
  ) internal {
    WalletLinkStorage.layout().dependencies[dependency] = dependencyAddress;
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           Helpers
  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  function _validateNonEVMWalletInputs(
    WalletLinkStorage.Layout storage ds,
    NonEVMLinkedWalletData calldata nonEVMWallet,
    bytes32 walletHash
  ) internal view {
    address caller = msg.sender;

    // Check that the wallet address string is not empty
    if (bytes(nonEVMWallet.addr).length == 0) {
      revert WalletLink__InvalidNonEVMAddress();
    }

    // Limit wallet address length
    if (bytes(nonEVMWallet.addr).length > 100) {
      revert WalletLink__InvalidNonEVMAddress();
    }

    address callerRootKey = ds.rootKeyByWallet[msg.sender];

    // Check that the caller wallet is linked to a root wallet
    if (callerRootKey == address(0)) {
      revert WalletLink__NotLinked(caller, address(0));
    }

    address rootKey = ds.rootKeyByHash[walletHash];

    // Ensure the caller's root key is consistent with intended operations
    if (rootKey != address(0) && rootKey != callerRootKey) {
      revert WalletLink__RootKeyMismatch(callerRootKey, rootKey);
    }
  }

  function _verifyWallets(
    WalletLinkStorage.Layout storage ds,
    address wallet,
    address rootWallet
  ) internal view {
    // Check wallet or rootWallet.addr are not address(0)
    if (wallet == address(0) || rootWallet == address(0)) {
      revert WalletLink__InvalidAddress();
    }

    // Check not linking wallet to itself
    if (wallet == rootWallet) {
      revert WalletLink__CannotLinkToSelf();
    }

    // Check that the wallet is not already linked to the root wallet
    if (ds.rootKeyByWallet[wallet] != address(0)) {
      revert WalletLink__LinkAlreadyExists(wallet, rootWallet);
    }

    // Check that the root wallet is not already linked to another root wallet
    if (ds.rootKeyByWallet[rootWallet] != address(0)) {
      revert WalletLink__LinkedToAnotherRootKey(
        wallet,
        ds.rootKeyByWallet[rootWallet]
      );
    }

    // Check that the wallet is not itself a root wallet
    if (ds.walletsByRootKey[wallet].length() > 0) {
      revert WalletLink__CannotLinkToRootWallet(wallet, rootWallet);
    }

    // Check that we haven't reached the maximum number of linked wallets
    if (ds.walletsByRootKey[rootWallet].length() >= MAX_LINKED_WALLETS) {
      revert WalletLink__MaxLinkedWalletsReached();
    }
  }

  function _verifySolanaWallet(
    NonEVMLinkedWalletData calldata nonEVMWallet
  ) internal {
    SolanaSpecificData memory solanaSpecificData = abi.decode(
      nonEVMWallet.extraData[0].value,
      (SolanaSpecificData)
    );

    // Check that the extPubKey and the wallet address match
    if (
      !SolanaUtils.isValidSolanaAddress(
        nonEVMWallet.addr,
        solanaSpecificData.extPubKey
      )
    ) {
      revert WalletLink__AddressMismatch();
    }

    (uint256 r, uint256 s) = abi.decode(
      nonEVMWallet.signature,
      (uint256, uint256)
    );

    bool isValidSignature = WalletLinkLib.verifySolanaSignature(
      nonEVMWallet.message,
      r,
      s,
      solanaSpecificData.extPubKey
    );

    if (!isValidSignature) {
      revert WalletLink__InvalidSignature();
    }
  }

  function _validateAddressFormatByVMType(
    string memory addr,
    VirtualMachineType vmType
  ) internal pure {
    if (vmType == VirtualMachineType.SVM) {
      // Validate Solana address format (base58, 32-44 chars)
      if (bytes(addr).length < 32 || bytes(addr).length > 44) {
        CustomRevert.revertWith(WalletLink__InvalidNonEVMAddress.selector);
      }
    }
  }

  function _getLinkedWalletTypedDataHash(
    string memory message,
    address addr,
    uint256 nonce
  ) internal pure returns (bytes32) {
    // https://eips.ethereum.org/EIPS/eip-712
    // ATTENTION: "The dynamic values bytes and string are encoded as a keccak256 hash of their contents."
    // in this case, the message is a string, so it is keccak256 hashed
    return
      keccak256(
        abi.encode(
          _LINKED_WALLET_TYPEHASH,
          keccak256(bytes(message)),
          addr,
          nonce
        )
      );
  }
}
