package app_client

import (
	"encoding/hex"
	"net/http"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/golang-jwt/jwt"
	"github.com/google/uuid"
	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/protocol"
)

func signRequest(req *http.Request, secretKey []byte, appId common.Address) error {
	token := jwt.New(jwt.SigningMethodHS256)
	claims := token.Claims.(jwt.MapClaims)
	claims["exp"] = time.Now().Add(1 * time.Hour).Unix() // token expires in 1 hour
	claims["iat"] = time.Now().Unix()                    // issued at
	claims["aud"] = hex.EncodeToString(appId[:])

	// An app server may optionally use the jti to prevent replay attacks
	claims["jti"] = uuid.NewString()

	tokenString, err := token.SignedString(secretKey)
	if err != nil {
		return base.RiverError(protocol.Err_INTERNAL, "Unable to sign jwt token for app request").
			Tag("appId", appId)
	}

	// Attach the token to the Authorization header.
	req.Header.Set("Authorization", "Bearer "+tokenString)

	return nil
}
