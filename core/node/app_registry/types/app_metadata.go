package types

import (
	"net/url"

	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/protocol"
)

// We allow up to 8K length of URLs to external resources for bot profile image links, etc.
const MAX_RESOURCE_URL_LENGTH = 8192

const MAX_SLASH_COMMANDS = 25


// validFileUrlSchemes defines allowed URL schemes for image files.
var validFileUrlSchemes = map[string]struct{}{
	"https": {},
	"http":  {},
	"ipfs":  {},
}

// validExternalUrlSchemes defines allowed URL schemes for external URLs.
var validExternalUrlSchemes = map[string]struct{}{
	"https": {},
	"http":  {},
}

func ValidateImageFileUrl(urlStr string) error {
	if urlStr == "" {
		return base.RiverError(protocol.Err_INVALID_ARGUMENT, "URL cannot be empty")
	}

	if len(urlStr) > MAX_RESOURCE_URL_LENGTH {
		return base.RiverError(protocol.Err_INVALID_ARGUMENT, "URL exceeds maximum length").
			Tag("url_length", len(urlStr)).
			Tag("max_length", MAX_RESOURCE_URL_LENGTH)
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

	return nil
}

func ValidateExternalUrl(urlStr string) error {
	if len(urlStr) > MAX_RESOURCE_URL_LENGTH {
		return base.RiverError(protocol.Err_INVALID_ARGUMENT, "URL exceeds maximum length").
			Tag("url_length", len(urlStr)).
			Tag("max_length", MAX_RESOURCE_URL_LENGTH)
	}

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

// ValidateAppMetadataFields validates app metadata fields based on update mask
func ValidateAppMetadataFields(metadata *protocol.AppMetadata, fieldMask []string) error {
	if metadata == nil {
		return base.RiverError(protocol.Err_INVALID_ARGUMENT, "metadata is required")
	}

	for _, field := range fieldMask {
		switch field {
		case "username":
			if metadata.Username != nil {
				if *metadata.Username == "" {
					return base.RiverError(protocol.Err_INVALID_ARGUMENT, "username cannot be empty")
				}
			}
		case "description":
			if metadata.Description != nil {
				if *metadata.Description == "" {
					return base.RiverError(protocol.Err_INVALID_ARGUMENT, "description cannot be empty")
				}
			}
		case "image_url":
			if metadata.ImageUrl != nil {
				if err := ValidateImageFileUrl(*metadata.ImageUrl); err != nil {
					return base.RiverErrorWithBase(protocol.Err_INVALID_ARGUMENT, "image_url validation failed", err).
						Tag("image_url", *metadata.ImageUrl)
				}
			}
		case "avatar_url":
			if metadata.AvatarUrl != nil {
				if err := ValidateImageFileUrl(*metadata.AvatarUrl); err != nil {
					return base.RiverErrorWithBase(protocol.Err_INVALID_ARGUMENT, "avatar_url validation failed", err).
						Tag("avatar_url", *metadata.AvatarUrl)
				}
			}
		case "external_url":
			if metadata.ExternalUrl != nil && *metadata.ExternalUrl != "" {
				if err := ValidateExternalUrl(*metadata.ExternalUrl); err != nil {
					return base.RiverErrorWithBase(protocol.Err_INVALID_ARGUMENT, "external_url validation failed", err).
						Tag("external_url", *metadata.ExternalUrl)
				}
			}
		case "display_name":
			if metadata.DisplayName != nil {
				if *metadata.DisplayName == "" {
					return base.RiverError(protocol.Err_INVALID_ARGUMENT, "display_name cannot be empty")
				}
			}
		case "slash_commands":
			if err := ValidateSlashCommands(metadata.GetSlashCommands()); err != nil {
				return err
			}
		default:
			return base.RiverError(protocol.Err_INVALID_ARGUMENT, "invalid field in update mask").
				Tag("field", field)
		}
	}
	return nil
}

// ValidateAppMetadata validates complete app metadata (for compatibility during transition)
func ValidateAppMetadata(metadata *protocol.AppMetadata) error {
	if metadata == nil {
		return base.RiverError(protocol.Err_INVALID_ARGUMENT, "metadata is required")
	}

	if metadata.GetUsername() == "" {
		return base.RiverError(protocol.Err_INVALID_ARGUMENT, "metadata username is required")
	}

	if metadata.GetDisplayName() == "" {
		return base.RiverError(protocol.Err_INVALID_ARGUMENT, "metadata display_name is required")
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

	if err := ValidateSlashCommands(metadata.GetSlashCommands()); err != nil {
		return err
	}

	return nil
}

// ValidateUpdateMask validates the update mask
func ValidateUpdateMask(mask []string) error {
	if len(mask) == 0 {
		return base.RiverError(protocol.Err_INVALID_ARGUMENT, "update_mask cannot be empty")
	}
	
	allowedFields := map[string]bool{
		"username":       true,
		"description":    true,
		"image_url":      true,
		"external_url":   true,
		"avatar_url":     true,
		"slash_commands": true,
		"display_name":   true,
	}
	
	for _, field := range mask {
		if !allowedFields[field] {
			return base.RiverError(protocol.Err_INVALID_ARGUMENT, "invalid field in update mask").
				Tag("field", field)
		}
	}
	return nil
}

// ValidateSlashCommands validates slash commands
func ValidateSlashCommands(commands []*protocol.SlashCommand) error {
	if len(commands) > MAX_SLASH_COMMANDS {
		return base.RiverError(protocol.Err_INVALID_ARGUMENT,
			"app metadata slash command count exceeds maximum").
			Tag("commandCount", len(commands)).
			Tag("maximum", MAX_SLASH_COMMANDS)
	}

	// Check for duplicate command names
	commandNames := make(map[string]bool)
	for _, cmd := range commands {
		if err := validateSlashCommand(cmd); err != nil {
			return err
		}

		cmdName := cmd.GetName()
		if commandNames[cmdName] {
			return base.RiverError(protocol.Err_INVALID_ARGUMENT, "duplicate command name").
				Tag("commandName", cmdName)
		}
		commandNames[cmdName] = true
	}

	return nil
}

// validateSlashCommandName validates a slash command name
func validateSlashCommandName(name string) error {
	if name == "" {
		return base.RiverError(protocol.Err_INVALID_ARGUMENT, "command name is required")
	}

	if len(name) > 32 {
		return base.RiverError(protocol.Err_INVALID_ARGUMENT, "command name must not exceed 32 characters").
			Tag("name", name).
			Tag("length", len(name))
	}

	// Check if name starts with a letter
	if len(name) > 0 && !((name[0] >= 'a' && name[0] <= 'z') || (name[0] >= 'A' && name[0] <= 'Z')) {
		return base.RiverError(protocol.Err_INVALID_ARGUMENT, "command name must start with a letter").
			Tag("name", name)
	}

	// Check if name contains only letters, numbers, and underscores
	for i, ch := range name {
		if !((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9') || ch == '_') {
			return base.RiverError(protocol.Err_INVALID_ARGUMENT, "command name must contain only letters, numbers, and underscores").
				Tag("name", name).
				Tag("invalidCharAt", i)
		}
	}

	return nil
}

// validateSlashCommand validates a single slash command
func validateSlashCommand(cmd *protocol.SlashCommand) error {
	if cmd == nil {
		return base.RiverError(protocol.Err_INVALID_ARGUMENT, "slash command cannot be nil")
	}

	// Validate name
	if err := validateSlashCommandName(cmd.GetName()); err != nil {
		return err
	}

	// Validate description
	description := cmd.GetDescription()
	if description == "" {
		return base.RiverError(protocol.Err_INVALID_ARGUMENT, "command description is required").
			Tag("commandName", cmd.GetName())
	}

	if len(description) > 256 {
		return base.RiverError(protocol.Err_INVALID_ARGUMENT, "command description must not exceed 256 characters").
			Tag("commandName", cmd.GetName()).
			Tag("descriptionLength", len(description))
	}

	return nil
}
