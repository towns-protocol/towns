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
)

var (
	linkWallet = infra.NewSuccessMetrics("link_wallet_requests", serviceRequests)
)

func (s *Service) LinkWallet(ctx context.Context, req *connect_go.Request[LinkWalletRequest]) (*connect_go.Response[LinkWalletResponse], error) {
	ctx, log := ctxAndLogForRequest(ctx, req)

	log.Debug("LinkWallet ENTER", "request", req.Msg)

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
		return nil, WrapRiverError(Err_BAD_LINK_WALLET_BAD_SIGNATURE, err).Func("LinkWallet").Message("error validating wallet link")
	}

	rootKeyAddress, err := ParseEthereumAddress(req.Msg.RootKeyId)
	if err != nil {
		return nil, WrapRiverError(Err_BAD_LINK_WALLET_BAD_SIGNATURE, err).Func("LinkWallet").Message("error decoding root key id")
	}
	// get nonce from the contract
	nonce, err := s.walletLinkContract.GetLatestNonceForRootKey(rootKeyAddress)
	if err != nil {
		return nil, WrapRiverError(Err_BAD_LINK_WALLET_BAD_SIGNATURE, err).Func("LinkWallet").Message("error decoding wallet address")
	}
	nonce = nonce + 1

	walletAddress, err := ParseEthereumAddress(req.Msg.WalletAddress)
	if err != nil {
		return nil, WrapRiverError(Err_BAD_LINK_WALLET_BAD_SIGNATURE, err).Func("LinkWallet").Message("error decoding wallet address")
	}

	rootKeySig, err := hex.DecodeString(req.Msg.RootKeySignature)
	if err != nil {
		return nil, WrapRiverError(Err_BAD_LINK_WALLET_BAD_SIGNATURE, err).Func("LinkWallet").Message("error decoding root key signature")
	}

	walletSig, err := hex.DecodeString(req.Msg.WalletSignature)
	if err != nil {
		return nil, WrapRiverError(Err_BAD_LINK_WALLET_BAD_SIGNATURE, err).Func("LinkWallet").Message("error decoding wallet signature")
	}

	err = s.walletLinkContract.LinkWalletToRootKey(rootKeyAddress, walletAddress, rootKeySig, walletSig, nonce)
	if err != nil {
		return nil, WrapRiverError(Err_BAD_LINK_WALLET_BAD_SIGNATURE, err).Func("LinkWallet").Message("error linking wallet")
	}

	return &connect_go.Response[LinkWalletResponse]{Msg: &LinkWalletResponse{}}, nil
}

func (s *Service) GetLinkWalletNonce(ctx context.Context, req *connect_go.Request[GetLinkWalletNonceRequest]) (*connect_go.Response[GetLinkWalletNonceResponse], error) {
	ctx, log := ctxAndLogForRequest(ctx, req)

	res, err := s.getLinkWalletNonce(ctx, log, req)
	if err != nil {
		log.Warn("GetLinkWalletNonce ERROR", "error", err)
		linkWallet.Fail()
		return nil, err
	}
	log.Debug("GetLinkWalletNonce: DONE", "response", res.Msg)
	linkWallet.Pass()
	return res, nil
}

func (s *Service) getLinkWalletNonce(ctx context.Context, log *slog.Logger, req *connect_go.Request[GetLinkWalletNonceRequest]) (*connect_go.Response[GetLinkWalletNonceResponse], error) {

	log.Debug("GetLinkWalletNonce", "request", req.Msg)

	rootKeyAddress, err := ParseEthereumAddress(req.Msg.RootKeyId)
	if err != nil {
		return nil, err
	}

	nonce, err := s.walletLinkContract.GetLatestNonceForRootKey(rootKeyAddress)
	if err != nil {
		return nil, WrapRiverError(Err_BAD_LINK_WALLET_BAD_SIGNATURE, err).Func("GetLinkWalletNonce").Message("error getting nonce")

	}

	return &connect_go.Response[GetLinkWalletNonceResponse]{Msg: &GetLinkWalletNonceResponse{
		Nonce: nonce,
	}}, nil
}

// Checks if the wallet registration event is valid.
// The event is valid if:
// 1. The root key is signed by the wallet
// 2. The root key signed the wallet address
// 3. The root key is already registered (user stream already exist)
func validateWalletLink(message *LinkWalletRequest) error {

	walletAddress, err := ParseEthereumAddress(message.WalletAddress)
	if err != nil {
		return err
	}

	rootKeyAddress, err := ParseEthereumAddress(message.RootKeyId)
	if err != nil {
		return err
	}

	walletSig, err := hex.DecodeString(message.WalletSignature)
	if err != nil {
		return err
	}

	walletSigHash, err := crypto.PackWithNonce(rootKeyAddress, message.Nonce)
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
	err = crypto.CheckEthereumMessageSignature(walletAddress.Bytes(), walletSigHash, walletSig)
	if err != nil {
		return err
	}

	rootKeySig, err := hex.DecodeString(message.RootKeySignature)
	if err != nil {
		return err
	}

	rootSigHash, err := crypto.PackWithNonce(walletAddress, message.Nonce)
	if err != nil {
		return err
	}

	err = crypto.CheckEthereumMessageSignature(rootKeyAddress.Bytes(), rootSigHash, rootKeySig)
	return err
}
