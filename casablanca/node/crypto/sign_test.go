package crypto

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestSign(t *testing.T) {
	message := []byte("Hello, World!")
	wallet, err := NewWallet()
	if err != nil {
		return
	}
	hash := HashPersonalMessage(message)

	str, err := wallet.Sign(hash)
	assert.Nil(t, err)
	assert.Equal(t, 65, len(str))

}
