// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IWalletLinkBase} from "./IWalletLink.sol";
import {IDelegateRegistry} from "./interfaces/IDelegateRegistry.sol";
// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {WalletLinkStorage} from "./WalletLinkStorage.sol";

// contracts
import {Nonces} from "@river-build/diamond/src/utils/Nonces.sol";
import {EIP712Base} from "@river-build/diamond/src/utils/cryptography/signature/EIP712Base.sol";

abstract contract WalletLinkBase is IWalletLinkBase, EIP712Base, Nonces {
  using EnumerableSet for EnumerableSet.AddressSet;

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           Constants
  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /// @dev `keccak256("LinkedWallet(string message,address userID,uint256 nonce)")`.
  // https://eips.ethereum.org/EIPS/eip-712
  bytes32 private constant _LINKED_WALLET_TYPEHASH =
    0x6bb89d031fcd292ecd4c0e6855878b7165cebc3a2f35bc6bbac48c088dd8325c;

  /// @dev Maximum number of linked wallets per root key
  uint256 internal constant MAX_LINKED_WALLETS = 10;

  // Address of delegate.xyz v2 registry
  bytes32 internal constant DELEGATE_REGISTRY_V2 =
    bytes32("DELEGATE_REGISTRY_V2");

  // Address of SCL_EIP6565 verifier library
  bytes32 internal constant SCL_EIP6565 = bytes32("SCL_EIP6565");

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                      External - Write
  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/

  /// @dev Links a caller address to a root wallet
  /// @param rootWallet the root wallet that the caller is linking to
  /// @param nonce a nonce used to prevent replay attacks, nonce must always be higher than previous nonce
  function _linkCallerToRootWallet(
    LinkedWallet memory rootWallet,
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
    LinkedWallet memory wallet,
    LinkedWallet memory rootWallet,
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

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           Remove
  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/

  function _removeLink(
    address walletToRemove,
    LinkedWallet memory rootWallet,
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
    if (ds.defaultWalletByRootKey[rootWallet.addr] == walletToRemove) {
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
    if (ds.defaultWalletByRootKey[rootWallet] == walletToRemove) {
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
    address delegateRegistry = ds.dependencies[DELEGATE_REGISTRY_V2];
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

    // First pass: count total delegations add to totalCount
    for (uint256 i; i < linkedWalletsLength; ++i) {
      IDelegateRegistry.Delegation[] memory delegations = IDelegateRegistry(
        delegateRegistry
      ).getIncomingDelegations(linkedWallets[i]);

      uint256 delegationsLength = delegations.length;
      for (uint256 j; j < delegationsLength; ++j) {
        if (delegations[j].type_ == IDelegateRegistry.DelegationType.ALL) {
          ++totalCount;
        }
      }
    }

    // Initialize result array
    wallets = new address[](totalCount);

    assembly {
      // Copy linked wallets to result array
      let walletsPtr := add(wallets, 0x20)
      let linkedWalletsPtr := add(linkedWallets, 0x20)
      let size := mul(linkedWalletsLength, 0x20)

      // Copy linked wallets data
      pop(staticcall(gas(), 4, linkedWalletsPtr, size, walletsPtr, size))

      // Current position in result array
      let currentIndex := linkedWalletsLength

      // Get the array pointer
      let ptr := walletsPtr

      // Update ptr to the next empty slot
      ptr := add(ptr, mul(currentIndex, 0x20))

      // Store the current position for later use
      mstore(0x40, ptr)
    }

    // Second pass: add delegators
    uint256 currentIndex = linkedWalletsLength;
    for (uint256 i; i < linkedWalletsLength; ) {
      IDelegateRegistry.Delegation[] memory delegations = IDelegateRegistry(
        delegateRegistry
      ).getIncomingDelegations(linkedWallets[i]);

      uint256 delegationsLength = delegations.length;

      assembly {
        // Get delegations array data pointer
        let delegationsPtr := add(delegations, 0x20)

        // Get wallets array data pointer
        let walletsPtr := add(wallets, 0x20)

        // Loop through delegations
        for {
          let j := 0
        } lt(j, delegationsLength) {
          j := add(j, 1)
        } {
          let delegationPtr := mload(add(delegationsPtr, mul(j, 0x20)))

          // Check if type is ALL (1)
          if eq(mload(delegationPtr), 1) {
            // Load the 'from' address and store it
            mstore(
              add(walletsPtr, mul(currentIndex, 0x20)),
              mload(add(delegationPtr, 0x40))
            )
            currentIndex := add(currentIndex, 1)
          }
        }
      }
      unchecked {
        ++i;
      }
    }

    return wallets;
  }

  function _getWalletsByRootKeyWithMetadata(
    address rootKey
  ) internal view returns (WalletWithMetadata[] memory wallets) {
    WalletLinkStorage.Layout storage ds = WalletLinkStorage.layout();

    // Get all linked wallets
    address[] memory linkedWallets = ds.walletsByRootKey[rootKey].values();
    uint256 length = linkedWallets.length;

    // Initialize result array
    wallets = new WalletWithMetadata[](length);

    // Get default wallet for comparison
    address defaultWallet = ds.defaultWalletByRootKey[rootKey];

    // Populate metadata for each wallet
    for (uint256 i; i < length; ++i) {
      address wallet = linkedWallets[i];

      // Check if wallet is a smart account by checking code length
      uint256 codeSize;
      assembly {
        codeSize := extcodesize(wallet)
      }

      bool isSmartAccount = codeSize > 0;
      WalletWithMetadata memory walletWithMetadata = wallets[i];
      walletWithMetadata.wallet = wallet;
      walletWithMetadata.isDefaultWallet = wallet == defaultWallet;
      walletWithMetadata.isSmartAccount = isSmartAccount;
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

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                   Default Wallet Functions                 */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function _setDefaultWallet(address caller, address defaultWallet) internal {
    // check that the default wallet is not address(0)
    if (defaultWallet == address(0)) {
      revert WalletLink__InvalidAddress();
    }

    address rootWallet = _getRootKeyByWallet(defaultWallet);

    // check that the default wallet is linked to a root wallet
    if (rootWallet == address(0)) {
      revert WalletLink__NotLinked(defaultWallet, rootWallet);
    }

    // check that the caller can only be a linked wallet or the root wallet
    if (!_checkIfLinked(rootWallet, caller) && caller != rootWallet) {
      revert WalletLink__NotLinked(caller, rootWallet);
    }

    WalletLinkStorage.Layout storage ds = WalletLinkStorage.layout();

    // check that the default isn't already the default wallet
    if (ds.defaultWalletByRootKey[rootWallet] == defaultWallet) {
      revert WalletLink__DefaultWalletAlreadySet();
    }

    ds.defaultWalletByRootKey[rootWallet] = defaultWallet;

    emit SetDefaultWallet(rootWallet, defaultWallet);
  }

  function _getDefaultWallet(
    address rootKey
  ) internal view returns (address defaultWallet) {
    return WalletLinkStorage.layout().defaultWalletByRootKey[rootKey];
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
