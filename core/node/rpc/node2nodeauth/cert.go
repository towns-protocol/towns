package node2nodeauth

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/asn1"
	"fmt"
	"math/big"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/common"
	ethcrypto "github.com/ethereum/go-ethereum/crypto"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/http_client"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
)

const (
	certTTL            = time.Hour
	certDurationBuffer = time.Minute * 2
	// certNameFmt is the format for the node-2-node client certificate name.
	// The format is: <chain_id>.<node-address>.towns
	certNameFmt = "%s.%s.towns"
	certIssuer  = "towns.com"
)

var (
	// certExtOID is the OID of the custom node-2-node client certificate extension.
	certExtOID = asn1.ObjectIdentifier{1, 3, 6, 1, 4, 1, 50000, 1, 1}
)

// IsValidNodeFunc is a function type that checks if the given address is a valid node.
// It returns an error if the address is not valid or not registered in the node registry.
type IsValidNodeFunc func(addr common.Address) error

// VerifyPeerCertificate returns a function that goes through the peer certificates
// and verifies the node-2-node client certificate, and returns nil if the certificate is valid or not found.
// Since the given certificate is required for the internode service (set of handlers) only, the RequireCertMiddleware
// middleware is used to ensure that the certificate is already present on the internode request. This function is
// applicable for both internode and stream services, but the certificate is provided for the internode service only.
func VerifyPeerCertificate(logger *logging.Log, verifyNode IsValidNodeFunc) func([][]byte, [][]*x509.Certificate) error {
	return func(rawCerts [][]byte, certs [][]*x509.Certificate) error {
		for _, raw := range rawCerts {
			cert, err := x509.ParseCertificate(raw)
			if err != nil {
				return err
			}

			// The given function is applicable for both internode and stream services.
			// The given certificate is provided for the internode service only.
			if len(cert.Subject.Organization) == 1 && cert.Subject.Organization[0] == certIssuer {
				if err = verifyCert(logger, verifyNode, cert); err != nil {
					return err
				}
			}
		}

		return nil
	}
}

// node2NodeCertExt is a custom extension for the node-2-node client certificates.
type node2NodeCertExt struct {
	// Address is the Ethereum address of the node.
	// The given address must correspond to the signature creator address.
	Address string `asn1:"utf8"`
	// Signature is the signature of the cert's public key.
	Signature []byte `asn1:"octet"`
}

// verifyCert verifies the node-2-node client certificate.
// The certificate must have a custom node2nodeCertExt extension.
func verifyCert(logger *logging.Log, verifyNode IsValidNodeFunc, cert *x509.Certificate) error {
	if cert == nil {
		return RiverError(Err_UNAUTHENTICATED, "No node-2-node client certificate provided").LogError(logger)
	}

	if len(cert.Subject.Organization) != 1 || cert.Subject.Organization[0] != certIssuer {
		return RiverError(Err_UNAUTHENTICATED, "Unexpected node-2-node certificate provided").
			Tag("expectedOrg", certIssuer).
			Tag("org", cert.Issuer.CommonName).
			LogError(logger)
	}

	now := time.Now()
	if cert.NotBefore.After(now) || cert.NotAfter.Before(now) {
		return RiverError(Err_UNAUTHENTICATED, "Certificate expired").
			Tag("notBefore", cert.NotBefore).
			Tag("notAfter", cert.NotAfter).
			LogError(logger)
	}

	var certExt node2NodeCertExt
	var found bool
	for _, ext := range cert.Extensions {
		if ext.Id.Equal(certExtOID) {
			if _, err := asn1.Unmarshal(ext.Value, &certExt); err != nil {
				return AsRiverError(err, Err_UNAUTHENTICATED).Message("Failed to unmarshal extra extension").LogError(logger)
			}
			found = true
			break
		}
	}
	if !found {
		return RiverError(Err_UNAUTHENTICATED, "Node-2-node cert extension not found").LogError(logger)
	}

	publicKeyDER, err := x509.MarshalPKIXPublicKey(cert.PublicKey)
	if err != nil {
		return AsRiverError(err, Err_UNAUTHENTICATED).Message("Failed to marshal public key").LogError(logger)
	}

	sigPublicKey, err := ethcrypto.SigToPub(
		crypto.TownsHashForCert.Hash(publicKeyDER).Bytes(),
		certExt.Signature,
	)
	if err != nil {
		return AsRiverError(err, Err_UNAUTHENTICATED).
			Message("Failed to extract public key from the cert signature").
			LogError(logger)
	}
	recoveredAddr := ethcrypto.PubkeyToAddress(*sigPublicKey)

	if recoveredAddr.Cmp(common.HexToAddress(certExt.Address)) != 0 {
		return RiverError(Err_UNAUTHENTICATED, "Node-2-node cert signature does not match address").
			Tag("recoveredAddr", recoveredAddr).
			Tag("certAddr", certExt.Address).
			LogError(logger)
	}

	// Make sure the recovered address is registered in the node registry.
	return verifyNode(recoveredAddr)
}

// CertGetter returns a GetClientCertFunc that provides a node-2-node client certificate.
func CertGetter(
	logger *logging.Log,
	wallet *crypto.Wallet,
	riverChainId *big.Int,
) http_client.GetClientCertFunc {
	var (
		lock    sync.Mutex
		tlsCert *tls.Certificate
		cert    *x509.Certificate
	)

	return func(info *tls.CertificateRequestInfo) (*tls.Certificate, error) {
		lock.Lock()
		defer lock.Unlock()

		// Create a new certificate if the current one is nil or about to expire
		if tlsCert == nil || time.Now().Add(certDurationBuffer).After(cert.NotAfter) {
			newCert, err := createCert(logger, wallet, riverChainId)
			if err != nil {
				return nil, err
			}
			tlsCert = newCert

			if cert, err = x509.ParseCertificate(tlsCert.Certificate[0]); err != nil {
				return nil, AsRiverError(err, Err_INTERNAL).Message("Failed to parse certificate").LogError(logger)
			}
		}

		return tlsCert, nil
	}
}

// createCert creates a node-2-node client certificate.
// The certificate contains a custom extension with the node's address and a signature of the cert's public key.
func createCert(logger *logging.Log, wallet *crypto.Wallet, riverChainId *big.Int) (*tls.Certificate, error) {
	if wallet == nil {
		return nil, RiverError(Err_INTERNAL, "No wallet provided").LogError(logger)
	}

	privateKeyA, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return nil, AsRiverError(err, Err_INTERNAL).Message("Failed to generate private key").LogError(logger)
	}

	publicKeyDER, err := x509.MarshalPKIXPublicKey(&privateKeyA.PublicKey)
	if err != nil {
		return nil, AsRiverError(err, Err_INTERNAL).Message("Failed to marshal public key").LogError(logger)
	}

	signature, err := wallet.SignHash(crypto.TownsHashForCert.Hash(publicKeyDER))
	if err != nil {
		return nil, AsRiverError(err, Err_INTERNAL).Message("Failed to sign public key").LogError(logger)
	}

	extensionValue, err := asn1.Marshal(node2NodeCertExt{
		Address:   wallet.Address.Hex(),
		Signature: signature,
	})
	if err != nil {
		return nil, AsRiverError(err, Err_INTERNAL).Message("Failed to marshal extra extension").LogError(logger)
	}

	template := &x509.Certificate{
		SerialNumber: big.NewInt(1),
		Subject: pkix.Name{
			Organization: []string{certIssuer},
			CommonName:   fmt.Sprintf(certNameFmt, riverChainId, wallet.Address.Hex()),
		},
		NotBefore:       time.Now().Add(-certDurationBuffer),          // Add a small buffer to avoid issues with time differences
		NotAfter:        time.Now().Add(certTTL + certDurationBuffer), // Add a small buffer to avoid issues with time differences
		KeyUsage:        x509.KeyUsageDigitalSignature,
		ExtKeyUsage:     []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth},
		ExtraExtensions: []pkix.Extension{{Id: certExtOID, Value: extensionValue}},
	}

	certDER, err := x509.CreateCertificate(rand.Reader, template, template, privateKeyA.Public(), privateKeyA)
	if err != nil {
		return nil, AsRiverError(err, Err_INTERNAL).Message("Failed to create certificate").LogError(logger)
	}

	return &tls.Certificate{
		Certificate: [][]byte{certDER},
		PrivateKey:  privateKeyA,
	}, nil
}
