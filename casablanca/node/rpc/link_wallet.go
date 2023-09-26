package rpc

import (
	"context"
	"encoding/hex"

	connect_go "github.com/bufbuild/connect-go"
	"golang.org/x/exp/slog"

	. "casablanca/node/base"
	"casablanca/node/crypto"
	"casablanca/node/infra"
	. "casablanca/node/protocol"

	"github.com/ethereum/go-ethereum/common"
	eth_crypto "github.com/ethereum/go-ethereum/crypto"
)

var (
	linkWallet = infra.NewSuccessMetrics("link_wallet_requests", serviceRequests)
)

func (s *Service) LinkWallet(ctx context.Context, req *connect_go.Request[LinkWalletRequest]) (*connect_go.Response[LinkWalletResponse], error) {
	ctx, log := ctxAndLogForRequest(ctx, req)

	res, err := s.linkWallet(ctx, log, req)
	if err != nil {
		log.Warn("LinkWallet ERROR", "error", err)
		linkWallet.Fail()
		return nil, err
	}
	log.Debug("LinkWallet: DONE", "response", res.Msg)
	linkWallet.Pass()
	return res, nil
}

func (s *Service) linkWallet(ctx context.Context, log *slog.Logger, req *connect_go.Request[LinkWalletRequest]) (*connect_go.Response[LinkWalletResponse], error) {

	err := validateWalletLink(req.Msg)
	if err != nil {
		return nil, RiverErrorf(Err_BAD_LINK_WALLET_BAD_SIGNATURE, "LinkWallet: error validating wallet link: %v", err)
	}
	log.Debug("LinkWallet", "request", req.Msg)

	rootKeyId, err := hex.DecodeString(req.Msg.RootKeyId)
	if err != nil {
		return nil, RiverErrorf(Err_BAD_LINK_WALLET_BAD_SIGNATURE, "LinkWallet: error decoding root key id: %v", err)
	}

	walletAddress, err := hex.DecodeString(req.Msg.WalletAddress[2:])
	if err != nil {
		return nil, RiverErrorf(Err_BAD_LINK_WALLET_BAD_SIGNATURE, "LinkWallet: error decoding wallet address: %v", err)
	}

	rootKeySig, err := hex.DecodeString(req.Msg.RootKeySignature)
	if err != nil {
		return nil, RiverErrorf(Err_BAD_LINK_WALLET_BAD_SIGNATURE, "LinkWallet: error decoding root key signature: %v", err)
	}

	walletSig, err := hex.DecodeString(req.Msg.WalletSignature)
	if err != nil {
		return nil, RiverErrorf(Err_BAD_LINK_WALLET_BAD_SIGNATURE, "LinkWallet: error decoding wallet signature: %v", err)
	}
	//  TODO once HNT-2344 is implemented, we will pass wallet address and cross wallet-rootkey signatures to the contract
	err = s.walletLinkContract.LinkWallet(common.BytesToAddress(rootKeyId), common.Address(walletAddress), rootKeySig, walletSig)
	if err != nil {
		return nil, RiverErrorf(Err_BAD_LINK_WALLET_BAD_SIGNATURE, "LinkWallet: error linking wallet: %v", err)
	}

	return &connect_go.Response[LinkWalletResponse]{Msg: &LinkWalletResponse{}}, nil
}

// Checks if the wallet registration event is valid.
// The event is valid if:
// 1. The root key is signed by the wallet
// 2. The root key signed the wallet address
// 3. The root key is already registered (user stream already exist)
func validateWalletLink(message *LinkWalletRequest) error {

	walletAddressBytes, err := hex.DecodeString(message.WalletAddress[2:])
	if err != nil {
		return err
	}

	rootKeyPub, err := hex.DecodeString(message.RootKeyId)
	if err != nil {
		return err
	}

	walletSig, err := hex.DecodeString(message.WalletSignature)
	if err != nil {
		return err
	}
	/**
		* Using standard ethereum message signature here.
	    * The signature is produced by pop-up message signing by the ethereum wallet (e.g. Metamask)
	    * The message in this case is the public part of the River Root Key.
	    * Specifically, the signature is calculated like this:
	    *   1. Message := \x19Ethereum Signed Message:\n{length of message}{RootKey public part}
	    *   2. Signature := Sign(keccak256(Message), wallet private key)
	*/
	err = crypto.CheckEthereumMessageSignature(walletAddressBytes, rootKeyPub, walletSig)
	if err != nil {
		return err
	}

	rootKeyAddress := eth_crypto.Keccak256(rootKeyPub[1:])[12:]

	rootKeySig, err := hex.DecodeString(message.RootKeySignature)
	if err != nil {
		return err
	}

	err = crypto.CheckDelegateSig(rootKeyAddress, walletAddressBytes, rootKeySig)
	return err
}
