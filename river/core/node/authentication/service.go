package authentication

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"math/big"
	"strings"
	"sync"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	"github.com/golang-jwt/jwt/v4"
	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/river-build/river/core/config"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/logging"
	. "github.com/river-build/river/core/node/protocol"
)

const (
	challengeLength = 16
)

type (
	authenticationChallenge struct {
		challengePrefix string
		userID          common.Address
		expires         time.Time
	}
)

func (c authenticationChallenge) Verify(
	ctx context.Context,
	challenge [challengeLength]byte,
	signature []byte,
	delegateSig []byte,
	delegateExpiryEpochMs int64,
) error {
	// ensure that the auth challenge nor the delegateExpiryEpoch hasn't expired.
	now := time.Now()
	if now.After(c.expires) ||
		(len(delegateSig) > 0 && delegateExpiryEpochMs > 0 && now.After(time.Unix(delegateExpiryEpochMs/1000, 0))) {
		return RiverError(
			Err_UNAUTHENTICATED,
			"authentication expired",
			"expires",
			c.expires,
			"delegateExpiryEpochMs",
			delegateExpiryEpochMs,
		)
	}

	// ensure that the signature that was calculated with:
	// ecdsa_sign(client_key, ETH_SIGN(sha256(PREFIX || user_id || expiration || challenge)))
	// with ETH_SIGN prefix the sha256 digest with \x19Ethereum Signed Message:\n<length>
	// was created with the private key of c.userID
	var (
		buf     bytes.Buffer
		expires = big.NewInt(c.expires.Unix())
	)

	buf.WriteString(c.challengePrefix)
	buf.Write(c.userID.Bytes())
	buf.Write(expires.Bytes())
	buf.Write(challenge[:])
	hash := sha256.Sum256(buf.Bytes())

	signerPubKey, err := crypto.RecoverEthereumMessageSignerPublicKey(hash[:], signature)
	if err != nil {
		return RiverError(Err_UNAUTHENTICATED, "error recovering signer public key", "user", c.userID, "error", err)
	}

	signerAddress := crypto.PublicKeyToAddress(signerPubKey)

	if len(delegateSig) == 0 {
		if c.userID == signerAddress {
			return nil
		} else {
			return RiverError(Err_UNAUTHENTICATED, "user id mismatch", "user", c.userID, "signer", signerAddress)
		}
	}

	return crypto.CheckDelegateSig(c.userID[:], signerPubKey, delegateSig, delegateExpiryEpochMs)
}

// AuthServiceMixin can be used by any service requiring authentication to implement authentication
// for the endpoints of the authentication service, which allows users to attest to their ownership
// of wallets. In order to implement authentication, a service must add this mixin to it's definition,
// call InitAuthentication with appropriate config, and configure the connect service to use the
// authentication interceptor with service metadata derived from the mixin. See notification and bot
// registry services for examples.
type AuthServiceMixin struct {
	authConfig                    *config.AuthenticationConfig
	sessionTokenSigningKey        any
	sessionTokenSigningAlgo       string
	pendingAuthenticationRequests sync.Map
	challengePrefix               string
}

func (s *AuthServiceMixin) ShortServiceName() string {
	return strings.ToLower(s.challengePrefix[:2])
}

// Since AuthServiceMixin is intended to be used as an embedded struct in other service definitions,
// InitAuthentication is the method that initializes the mixin's internal state.
// challengePrefix will be used as a service-specific prefix for the challenge message the user is expected
// sign in order to verify their ownership of a wallet's private key. The first two characters of the prefix
// are also used to populate service-specific values in the issued jwt token's claim map, so it's best to
// make sure they are unique compared to other services that implement authentication for the sake
// of sane debugging.
func (s *AuthServiceMixin) InitAuthentication(challengePrefix string, config *config.AuthenticationConfig) error {
	if len(challengePrefix) < 2 || len(challengePrefix) > 32 {
		return RiverError(Err_INVALID_ARGUMENT, "Challenge prefix length is out of range", "prefix", challengePrefix)
	}

	s.authConfig = config

	// set defaults
	if s.authConfig.ChallengeTimeout <= 0 {
		s.authConfig.ChallengeTimeout = 30 * time.Second
	}
	if s.authConfig.SessionToken.Lifetime <= 0 {
		s.authConfig.SessionToken.Lifetime = 30 * time.Minute
	}

	if len(s.authConfig.SessionToken.Key.Key) != 64 {
		return RiverError(Err_BAD_CONFIG, "Invalid session token key length",
			"len", len(s.authConfig.SessionToken.Key.Key)).
			Func("NewService")
	}

	key, err := hex.DecodeString(s.authConfig.SessionToken.Key.Key)
	if err != nil {
		return RiverError(Err_BAD_CONFIG, "Invalid session token key (not hex)").Func("NewService")
	}

	if len(key) != 32 {
		return RiverError(Err_BAD_CONFIG, "Invalid session token key decoded length").Func("NewService")
	}

	s.sessionTokenSigningAlgo = s.authConfig.SessionToken.Key.Algorithm
	s.sessionTokenSigningKey = key
	s.challengePrefix = challengePrefix

	return nil
}

func (s *AuthServiceMixin) StartAuthentication(
	_ context.Context,
	req *connect.Request[StartAuthenticationRequest],
) (*connect.Response[StartAuthenticationResponse], error) {
	var (
		msg           = req.Msg
		authChallenge = &authenticationChallenge{
			challengePrefix: s.challengePrefix,
			userID:          common.BytesToAddress(msg.GetUserId()),
			expires:         time.Now().Add(s.authConfig.ChallengeTimeout),
		}
		challenge [challengeLength]byte
	)

	if authChallenge.userID == (common.Address{}) {
		return nil, RiverError(Err_INVALID_ARGUMENT, "invalid user id")
	}

	_, err := rand.Read(challenge[:])
	if err != nil {
		return nil, AsRiverError(err, Err_INTERNAL).
			Message("Unable to generate authentication challenge")
	}

	s.pendingAuthenticationRequests.Store(challenge, authChallenge)

	return connect.NewResponse(&StartAuthenticationResponse{
		UserId:     authChallenge.userID[:],
		Challenge:  challenge[:],
		Expiration: timestamppb.New(authChallenge.expires),
	}), nil
}

func (s *AuthServiceMixin) FinishAuthentication(
	ctx context.Context,
	req *connect.Request[FinishAuthenticationRequest],
) (*connect.Response[FinishAuthenticationResponse], error) {
	var (
		msg       = req.Msg
		userID    = common.BytesToAddress(msg.GetUserId())
		challenge [challengeLength]byte
	)

	if len(msg.GetChallenge()) != challengeLength {
		return nil, RiverError(Err_NOT_FOUND, "invalid challenge", "user", userID)
	}

	copy(challenge[:], msg.GetChallenge())

	raw, found := s.pendingAuthenticationRequests.Load(challenge)
	if !found {
		return nil, RiverError(Err_NOT_FOUND, "no pending authentication challenge", "user", userID)
	}

	// challenge is valid for one attempt, user must start a new authentication process for a second attempt
	s.pendingAuthenticationRequests.Delete(challenge)

	// make sure that the caller has access to the private key from which user id was derived
	chal := raw.(*authenticationChallenge)
	err := chal.Verify(ctx, challenge, msg.GetSignature(), msg.GetDelegateSig(), msg.GetDelegateExpiryEpochMs())
	if err != nil {
		return nil, RiverError(Err_PERMISSION_DENIED, "bad signature", "user", userID, "error", err)
	}

	// create a JWT session token that the client can use to make notification service rpc and send it to the client
	now := time.Now()
	shortServiceName := s.ShortServiceName()
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"aud": shortServiceName,
		"iss": shortServiceName,
		"sub": userID.String(),
		"exp": now.Add(s.authConfig.SessionToken.Lifetime).Unix(),
	})

	sessionToken, err := token.SignedString(s.sessionTokenSigningKey)
	if err != nil {
		logging.FromCtx(ctx).Errorw("Unable to sign session token", "err", err)
		return nil, AsRiverError(err, Err_INTERNAL).Tag("user", userID)
	}

	return connect.NewResponse(&FinishAuthenticationResponse{SessionToken: sessionToken}), nil
}
