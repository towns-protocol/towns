package types

import (
	"net/url"
	"strings"

	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/protocol"
)

type AppMetadata struct {
	// We omit the name property from the JSON serialization of the app metadata object because
	// we store the name in a separate column so that we can performantly guarantee uniqueness
	// between bot display names.
	Name        string `json:"-"`
	Description string
	ImageUrl    string
	ExternalUrl string
	AvatarUrl   string
}

func ProtocolToStorageAppMetadata(metadata *protocol.AppMetadata) AppMetadata {
	if metadata == nil {
		return AppMetadata{}
	}

	externalUrl := ""
	if metadata.ExternalUrl != nil {
		externalUrl = *metadata.ExternalUrl
	}

	return AppMetadata{
		Name:        metadata.GetName(),
		Description: metadata.GetDescription(),
		ImageUrl:    metadata.GetImageUrl(),
		ExternalUrl: externalUrl,
		AvatarUrl:   metadata.GetAvatarUrl(),
	}
}

func StorageToProtocolAppMetadata(metadata AppMetadata) *protocol.AppMetadata {
	var externalUrl *string
	if metadata.ExternalUrl != "" {
		externalUrl = &metadata.ExternalUrl
	}

	return &protocol.AppMetadata{
		Name:        metadata.Name,
		Description: metadata.Description,
		ImageUrl:    metadata.ImageUrl,
		ExternalUrl: externalUrl,
		AvatarUrl:   metadata.AvatarUrl,
	}
}

// validFileUrlSchemes defines allowed URL schemes for image files.
var validFileUrlSchemes = map[string]struct{}{
	"https": {},
	"http":  {},
	"ipfs":  {},
}

// validFileUrlSchemes defines allowed URL schemes
var validExternalUrlSchemes = map[string]struct{}{
	"https": {},
	"http":  {},
}

// validExtensions defines allowed file extensions
var validExtensions = map[string]struct{}{
	"png":  {},
	"jpg":  {},
	"jpeg": {},
	"gif":  {},
	"webp": {},
	"svg":  {},
}

func ValidateImageFileUrl(urlStr string) error {
	if urlStr == "" {
		return base.RiverError(protocol.Err_INVALID_ARGUMENT, "URL cannot be empty")
	}

	parsedUrl, err := url.Parse(urlStr)
	if err != nil {
		return base.RiverErrorWithBase(protocol.Err_INVALID_ARGUMENT, "invalid URL format", err).
			Tag("url", urlStr)
	}

	// Check if scheme is valid
	if _, schemeOk := validFileUrlSchemes[parsedUrl.Scheme]; !schemeOk {
		return base.RiverError(protocol.Err_INVALID_ARGUMENT, "URL must have a valid scheme (https, http, or ipfs)").
			Tag("url", urlStr).
			Tag("scheme", parsedUrl.Scheme)
	}

	// Check if path exists
	if parsedUrl.Path == "" || parsedUrl.Path == "/" {
		return base.RiverError(protocol.Err_INVALID_ARGUMENT, "URL must have a valid path to a file").
			Tag("url", urlStr)
	}

	// Extract file extension from path
	path := parsedUrl.Path
	lastDot := strings.LastIndex(path, ".")
	if lastDot == -1 || lastDot == len(path)-1 {
		return base.RiverError(protocol.Err_INVALID_ARGUMENT, "URL must point to a file with a valid extension").
			Tag("url", urlStr)
	}

	extension := strings.ToLower(path[lastDot+1:])
	if _, extOk := validExtensions[extension]; !extOk {
		return base.RiverError(protocol.Err_INVALID_ARGUMENT, "URL must point to a file with a supported extension (png, jpg, jpeg, gif, webp, svg)").
			Tag("url", urlStr).
			Tag("extension", extension)
	}

	return nil
}

func ValidateExternalUrl(urlStr string) error {
	parsedUrl, err := url.Parse(urlStr)
	if err != nil {
		return base.RiverErrorWithBase(protocol.Err_INVALID_ARGUMENT, "invalid URL format", err).
			Tag("url", urlStr)
	}

	// Check if scheme is valid
	if _, schemeOk := validExternalUrlSchemes[parsedUrl.Scheme]; !schemeOk {
		return base.RiverError(protocol.Err_INVALID_ARGUMENT, "URL must have a valid external URL scheme").
			Tag("url", urlStr).
			Tag("scheme", parsedUrl.Scheme)
	}

	return nil
}

// ValidateAppMetadata validates app metadata and returns an error if validation fails
func ValidateAppMetadata(metadata *protocol.AppMetadata) error {
	if metadata == nil {
		return base.RiverError(protocol.Err_INVALID_ARGUMENT, "metadata is required")
	}

	if metadata.GetName() == "" {
		return base.RiverError(protocol.Err_INVALID_ARGUMENT, "metadata name is required")
	}

	if metadata.GetDescription() == "" {
		return base.RiverError(protocol.Err_INVALID_ARGUMENT, "metadata description is required")
	}

	imageUrl := metadata.GetImageUrl()
	if err := ValidateImageFileUrl(imageUrl); err != nil {
		return base.RiverErrorWithBase(protocol.Err_INVALID_ARGUMENT, "metadata image_url validation failed", err).
			Tag("image_url", imageUrl)
	}

	avatarUrl := metadata.GetAvatarUrl()
	if err := ValidateImageFileUrl(avatarUrl); err != nil {
		return base.RiverErrorWithBase(protocol.Err_INVALID_ARGUMENT, "metadata avatar_url validation failed", err).
			Tag("avatar_url", avatarUrl)
	}

	if externalUrl := metadata.GetExternalUrl(); externalUrl != "" {
		if err := ValidateExternalUrl(externalUrl); err != nil {
			return base.RiverErrorWithBase(protocol.Err_INVALID_ARGUMENT, "metadata external_url must be a valid URL", err).
				Tag("external_url", metadata.GetExternalUrl())
		}
	}

	return nil
}
