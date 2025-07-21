package node2nodeauth

import (
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/asn1"
	"errors"
	"fmt"
	"math/big"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/towns-protocol/towns/core/node/base/test"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/logging"
)

func TestCreateCert(t *testing.T) {
	logger := logging.DefaultLogger(zap.DebugLevel)

	ctx := test.NewTestContext(t)
	wallet, err := crypto.NewWallet(ctx)
	require.NoError(t, err)

	cert, err := createCert(logger, wallet, big.NewInt(1))
	require.NoError(t, err)
	require.NotNil(t, cert)

	// Check certificate fields
	x509Cert, err := x509.ParseCertificate(cert.Certificate[0])
	require.NoError(t, err)
	require.Equal(t, fmt.Sprintf("1.%s.towns", wallet.Address.Hex()), x509Cert.Subject.CommonName)
	require.True(t, x509Cert.NotBefore.Before(time.Now()))
	require.True(t, x509Cert.NotAfter.After(time.Now()))

	// Check custom extension
	var certExt node2NodeCertExt
	found := false
	for _, ext := range x509Cert.Extensions {
		if ext.Id.Equal(certExtOID) {
			_, err := asn1.Unmarshal(ext.Value, &certExt)
			require.NoError(t, err)
			found = true
			break
		}
	}
	require.True(t, found)
	require.Equal(t, wallet.Address.Hex(), certExt.Address)
	require.NotEmpty(t, certExt.Signature)
}

func TestCertGetter(t *testing.T) {
	logger := logging.DefaultLogger(zap.DebugLevel)

	ctx := test.NewTestContext(t)
	wallet, err := crypto.NewWallet(ctx)
	require.NoError(t, err)

	getCertFunc := CertGetter(logger, wallet, big.NewInt(1))

	// Test initial certificate creation
	cert, err := getCertFunc(nil)
	require.NoError(t, err)
	require.NotNil(t, cert)

	// Check certificate fields
	x509Cert, err := x509.ParseCertificate(cert.Certificate[0])
	require.NoError(t, err)
	require.Equal(t, fmt.Sprintf("1.%s.towns", wallet.Address.Hex()), x509Cert.Subject.CommonName)
	require.True(t, x509Cert.NotBefore.Before(time.Now()))
	require.True(t, x509Cert.NotAfter.After(time.Now()))

	// Test certificate renewal
	time.Sleep(time.Second * 2) // Simulate time passing
	cert, err = getCertFunc(nil)
	require.NoError(t, err)
	require.NotNil(t, cert)

	// Check renewed certificate fields
	x509Cert, err = x509.ParseCertificate(cert.Certificate[0])
	require.NoError(t, err)
	require.Equal(t, fmt.Sprintf("1.%s.towns", wallet.Address.Hex()), x509Cert.Subject.CommonName)
	require.True(t, x509Cert.NotBefore.Before(time.Now()))
	require.True(t, x509Cert.NotAfter.After(time.Now()))
}

func TestVerifyCert(t *testing.T) {
	logger := logging.DefaultLogger(zap.DebugLevel)

	// Create test wallet
	ctx := test.NewTestContext(t)
	wallet, err := crypto.NewWallet(ctx)
	require.NoError(t, err)

	cert, err := createCert(logger, wallet, big.NewInt(1))
	require.NoError(t, err)
	require.NotNil(t, cert)

	x509Cert, err := x509.ParseCertificate(cert.Certificate[0])
	require.NoError(t, err)

	tests := []struct {
		name       string
		cert       *x509.Certificate
		verifyCert IsValidNodeFunc
		wantErr    string
	}{
		{
			name: "Valid certificate",
			cert: x509Cert,
			verifyCert: func(addr common.Address) error {
				return nil
			},
		},
		{
			name: "Expired certificate",
			cert: &x509.Certificate{
				Subject:    pkix.Name{Organization: []string{"towns.com"}},
				NotBefore:  time.Now().Add(-2 * time.Hour),
				NotAfter:   time.Now().Add(-1 * time.Hour),
				Extensions: []pkix.Extension{{Id: certExtOID, Value: x509Cert.Extensions[0].Value}},
			},
			wantErr: "Certificate expired",
		},
		{
			name: "Invalid extension",
			cert: &x509.Certificate{
				Subject:    pkix.Name{Organization: []string{"towns.com"}},
				NotBefore:  time.Now(),
				NotAfter:   time.Now().Add(time.Hour),
				Extensions: []pkix.Extension{{Id: certExtOID, Value: []byte("invalid")}},
			},
			wantErr: "Failed to unmarshal extra extension",
		},
		{
			name: "Unknown node address",
			cert: x509Cert,
			verifyCert: func(addr common.Address) error {
				return errors.New("node not found")
			},
			wantErr: "node not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := verifyCert(logger, tt.verifyCert, tt.cert)
			if tt.wantErr != "" {
				require.Error(t, err)
				require.Contains(t, err.Error(), tt.wantErr)
			} else {
				require.NoError(t, err)
			}
		})
	}
}
