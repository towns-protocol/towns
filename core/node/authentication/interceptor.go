package authentication

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"strings"
	"time"

	"connectrpc.com/connect"

	"github.com/ethereum/go-ethereum/common"
	"github.com/golang-jwt/jwt/v4"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
)

type jwtAuthenticationInterceptor struct {
	shortServiceName           string
	sessionTokenSigningKeyAlgo string
	sessionTokenSigningKey     interface{}
	publicRoutes               []string
}

// NewAuthenticationInterceptor creates a connect Interceptor that can be used to require
// that endpoints on a service which is using authentication do indeed contain a valid
// jwt token issued by this service in the request header.
// The shortServiceName parameter must match the string used by the authentication service
// mixin to construct the JWT token embedded in the session header.
// publicRoutes is an optional list of routes that will be ignored by the interceptor. This
// list is only used to whitelist unary endpoints.
func NewAuthenticationInterceptor(
	shortServiceName string,
	sessionTokenSigningKeyAlgo string,
	sessionTokenSigningKey string,
	publicRoutes ...string,
) (connect.Interceptor, error) {
	if len(shortServiceName) < 2 {
		return nil, RiverError(
			Err_INVALID_ARGUMENT,
			"ShortServiceName must be at least 2 characters long",
		).Func("NewAuthenticationInterceptor")
	}
	key, err := hex.DecodeString(sessionTokenSigningKey)
	if err != nil {
		return nil, RiverError(Err_BAD_CONFIG, "Invalid session token key").Func("NewAuthenticationInterceptor")
	}

	if len(key) != 32 {
		return nil, RiverError(Err_BAD_CONFIG, "Invalid session token key length").Func("NewAuthenticationInterceptor")
	}

	return &jwtAuthenticationInterceptor{
		shortServiceName:           shortServiceName,
		sessionTokenSigningKeyAlgo: sessionTokenSigningKeyAlgo,
		sessionTokenSigningKey:     key,
		publicRoutes:               publicRoutes,
	}, nil
}

func (i *jwtAuthenticationInterceptor) authorize(sessionTokenString string) (common.Address, error) {
	token, err := jwt.Parse(sessionTokenString, func(token *jwt.Token) (interface{}, error) {
		return i.sessionTokenSigningKey, nil
	}, jwt.WithJSONNumber(), jwt.WithValidMethods([]string{"HS256"}))
	if err != nil {
		return common.Address{}, RiverError(Err_UNAUTHENTICATED, "Invalid session token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return common.Address{}, RiverError(Err_UNAUTHENTICATED, "Invalid session token")
	}

	if claims["aud"] != i.shortServiceName {
		return common.Address{}, RiverError(Err_UNAUTHENTICATED, "Invalid session token audience")
	}

	if claims["iss"] != i.shortServiceName {
		return common.Address{}, RiverError(Err_UNAUTHENTICATED, "Invalid session token issuer")
	}

	expiredNumber, ok := claims["exp"].(json.Number)
	if !ok {
		return common.Address{}, RiverError(Err_UNAUTHENTICATED, "Invalid session token exp")
	}

	expired, err := expiredNumber.Int64()
	if err != nil {
		return common.Address{}, RiverError(Err_UNAUTHENTICATED, "Invalid session token exp")
	}

	if time.Now().After(time.Unix(expired, 0)) {
		return common.Address{}, RiverError(Err_UNAUTHENTICATED, "Session token expired")
	}

	subStr, ok := claims["sub"].(string)
	if !ok {
		return common.Address{}, RiverError(Err_UNAUTHENTICATED, "Invalid session token subject")
	}

	return common.HexToAddress(subStr), nil
}

func (i *jwtAuthenticationInterceptor) WrapUnary(next connect.UnaryFunc) connect.UnaryFunc {
	return func(
		ctx context.Context,
		req connect.AnyRequest,
	) (connect.AnyResponse, error) {
		// calls to the authentication service are unauthenticated
		if strings.HasPrefix(req.Spec().Procedure, "/river.AuthenticationService/") {
			return next(ctx, req)
		}

		// Allow public routes to pass through the interceptor
		for _, route := range i.publicRoutes {
			if strings.HasPrefix(req.Spec().Procedure, route) {
				return next(ctx, req)
			}
		}

		authHeader := req.Header().Get("Authorization")
		if authHeader == "" {
			return nil, RiverError(Err_UNAUTHENTICATED, "missing session token")
		}

		userID, err := i.authorize(authHeader)
		if err != nil {
			return nil, err
		}

		return next(contextWithAuthenticatedUser(ctx, userID), req)
	}
}

func (i *jwtAuthenticationInterceptor) WrapStreamingClient(
	next connect.StreamingClientFunc,
) connect.StreamingClientFunc {
	return func(
		ctx context.Context,
		spec connect.Spec,
	) connect.StreamingClientConn {
		return next(ctx, spec)
	}
}

func (i *jwtAuthenticationInterceptor) WrapStreamingHandler(
	next connect.StreamingHandlerFunc,
) connect.StreamingHandlerFunc {
	return func(
		ctx context.Context,
		conn connect.StreamingHandlerConn,
	) error {
		sessionToken := conn.RequestHeader().Get("Authorization")
		userID, err := i.authorize(sessionToken)
		if err != nil {
			return err
		}

		return next(contextWithAuthenticatedUser(ctx, userID), conn)
	}
}
