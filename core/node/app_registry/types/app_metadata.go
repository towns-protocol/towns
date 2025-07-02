package types

import (
	"net/url"

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

	if metadata.GetAvatarUrl() == "" {
		return base.RiverError(protocol.Err_INVALID_ARGUMENT, "metadata avatar_url must be a valid URL")
	}

	if _, err := url.Parse(metadata.GetAvatarUrl()); err != nil {
		return base.RiverError(protocol.Err_INVALID_ARGUMENT, "metadata avatar_url must be a valid URL")
	}

	if metadata.GetAvatarUrl() == "" {
		return base.RiverError(protocol.Err_INVALID_ARGUMENT, "metadata image_url must be a valid URL")
	}

	if _, err := url.Parse(metadata.GetImageUrl()); err != nil {
		return base.RiverError(protocol.Err_INVALID_ARGUMENT, "metadata image_url must be a valid URL")
	}

	if externalUrl := metadata.GetExternalUrl(); externalUrl != "" {
		if _, err := url.Parse(externalUrl); err != nil {
			return base.RiverError(protocol.Err_INVALID_ARGUMENT, "metadata external_url must be a valid URL")
		}
	}

	return nil
}
