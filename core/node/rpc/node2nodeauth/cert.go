package node2nodeauth

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/asn1"
	"math/big"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/common"
	ethcrypto "github.com/ethereum/go-ethereum/crypto"
	"go.uber.org/zap"

	"github.com/towns-protocol/towns/core/contracts/river"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/http_client"
	"github.com/towns-protocol/towns/core/node/nodes"
	. "github.com/towns-protocol/towns/core/node/protocol"
)

const (
	certTTL            = time.Hour
	certDurationBuffer = time.Second * 30
	certName           = "node2node"
)

var (
	// certExtOID is the OID of the custom node-2-node client certificate extension.
	certExtOID = asn1.ObjectIdentifier{1, 3, 6, 1, 4, 1, 50000, 1, 1}
)

// VerifyPeerCertificate goes through the peer certificates and verifies the node-2-node client certificate.
// Returns nil if the certificate is valid or not found.
func VerifyPeerCertificate(logger *zap.SugaredLogger, nodeRegistry nodes.NodeRegistry) func([][]byte, [][]*x509.Certificate) error {
	return func(rawCerts [][]byte, _ [][]*x509.Certificate) error {
		for _, rawCert := range rawCerts {
			peerCert, err := x509.ParseCertificate(rawCert)
			if err != nil {
				return err
			}

			if peerCert.Subject.CommonName == certName {
				if err = verifyCert(logger, nodeRegistry, peerCert); err != nil {
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
func verifyCert(logger *zap.SugaredLogger, nodeRegistry nodes.NodeRegistry, cert *x509.Certificate) error {
	if cert == nil {
		return RiverError(Err_UNAUTHENTICATED, "No node-2-node client certificate provided").LogError(logger)
	}

	if cert.Subject.CommonName != certName {
		return RiverError(Err_UNAUTHENTICATED, "Unexpected node-2-node client certificate name").LogError(logger)
	}

	now := time.Now()
	if cert.NotBefore.After(now) || cert.NotAfter.Before(now) {
		return RiverError(Err_UNAUTHENTICATED, "Certificate expired").LogError(logger)
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
		return AsRiverError(err, Err_UNAUTHENTICATED).Message("Failed to extract public key from the cert signature").LogError(logger)
	}
	recoveredAddr := ethcrypto.PubkeyToAddress(*sigPublicKey)

	if recoveredAddr.Cmp(common.HexToAddress(certExt.Address)) != 0 {
		return RiverError(Err_UNAUTHENTICATED, "Node-2-node cert signature does not match address").LogError(logger)
	}

	node, err := nodeRegistry.GetNode(recoveredAddr)
	if err != nil {
		return err
	}

	// Check that that sender node is operational
	if node.Status() != river.NodeStatus_Operational {
		return RiverError(Err_UNAUTHENTICATED, "Node is not operational").LogError(logger)
	}

	return nil
}

// CertGetter returns a GetClientCertFunc that provides a node-2-node client certificate.
func CertGetter(logger *zap.SugaredLogger, wallet *crypto.Wallet) http_client.GetClientCertFunc {
	var (
		lock    sync.Mutex
		tlsCert *tls.Certificate
		cert    *x509.Certificate
	)

	return func(info *tls.CertificateRequestInfo) (*tls.Certificate, error) {
		lock.Lock()
		defer lock.Unlock()

		// Create a new certificate if the current one is nil or about to expire
		if cert == nil || time.Now().Add(certDurationBuffer).After(cert.NotAfter) {
			newCert, err := createCert(logger, wallet)
			if err != nil {
				return nil, err
			}
			tlsCert = newCert

			cert, err = x509.ParseCertificate(tlsCert.Certificate[0])
			if err != nil {
				return nil, AsRiverError(err, Err_INTERNAL).Message("Failed to parse certificate").LogError(logger)
			}
		}

		return tlsCert, nil
	}
}

// createCert creates a node-2-node client certificate.
// The certificate contains a custom extension with the node's address and a signature of the cert's public key.
func createCert(logger *zap.SugaredLogger, wallet *crypto.Wallet) (*tls.Certificate, error) {
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
			CommonName:   certName,
			Organization: []string{"towns"},
		},
		NotBefore:       time.Now().Add(-certDurationBuffer), // Add a small buffer to avoid issues with time differences
		NotAfter:        time.Now().Add(certTTL),
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
