package authentication

import (
	"bytes"
	"context"
	"crypto/sha256"
	"math/big"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/accounts"
	eth_crypto "github.com/ethereum/go-ethereum/crypto"
	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/node/crypto"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
)

// Authenticate[T] generates the jwt token for primaryWallet by completing the authentication
// challenge-response, and adds it to the header of the supplied request.
func Authenticate[T any](
	ctx context.Context,
	challengePrefix string,
	req *require.Assertions,
	authClient protocolconnect.AuthenticationServiceClient,
	primaryWallet *crypto.Wallet,
	request *connect.Request[T],
) {
	token := GetAuthenticationToken(ctx, challengePrefix, req, authClient, primaryWallet, request)
	request.Header().Set("authorization", token)
}

// GetAuthenticationToken completes the authentication challenge-response for the supplied wallet and
// generates a jwt token that can be used across requests to authenticate this wallet.
func GetAuthenticationToken[T any](
	ctx context.Context,
	challengePrefix string,
	req *require.Assertions,
	authClient protocolconnect.AuthenticationServiceClient,
	primaryWallet *crypto.Wallet,
	request *connect.Request[T],
) string {
	resp, err := authClient.StartAuthentication(ctx, connect.NewRequest(&StartAuthenticationRequest{
		UserId: primaryWallet.Address[:],
	}))
	req.NoError(err)

	// create a delegate signature that grants a device to make the request on behalf
	// of the users primary wallet. This device key is generated on the fly.
	deviceWallet, err := crypto.NewWallet(ctx)
	req.NoError(err)

	devicePubKey := eth_crypto.FromECDSAPub(&deviceWallet.PrivateKeyStruct.PublicKey)

	delegateExpiryEpochMs := 1000 * (time.Now().Add(time.Hour).Unix())
	// create the delegate signature by signing it with the primary wallet
	hashSrc, err := crypto.RiverDelegateHashSrc(devicePubKey, delegateExpiryEpochMs)
	req.NoError(err)
	hash := accounts.TextHash(hashSrc)
	delegateSig, err := eth_crypto.Sign(hash, primaryWallet.PrivateKeyStruct)
	req.NoError(err)

	var (
		nonce      = resp.Msg.GetChallenge()
		expiration = big.NewInt(resp.Msg.GetExpiration().GetSeconds())
		buf        bytes.Buffer
	)

	// Sign the authentication request with the device key
	buf.WriteString(challengePrefix)
	buf.Write(primaryWallet.Address.Bytes())
	buf.Write(expiration.Bytes())
	buf.Write(nonce)

	digest := sha256.Sum256(buf.Bytes())
	bufHash := accounts.TextHash(digest[:])

	signature, err := deviceWallet.SignHash(bufHash[:])
	req.NoError(err)

	resp2, err := authClient.FinishAuthentication(ctx, connect.NewRequest(&FinishAuthenticationRequest{
		UserId:                primaryWallet.Address[:],
		Challenge:             nonce,
		Signature:             signature,
		DelegateSig:           delegateSig,
		DelegateExpiryEpochMs: delegateExpiryEpochMs,
	}))

	req.NoError(err)

	return resp2.Msg.SessionToken
}
