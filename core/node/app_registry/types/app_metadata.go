package types

import (
	"net/url"

	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/protocol"
)

type SlashCommand struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type AppMetadata struct {
	// We omit the username property from the JSON serialization of the app metadata object because
	// we store the username in a separate column so that we can performantly guarantee uniqueness
	// between bot usernames.
	Username      string         `json:"-"`
	Description   string         `json:"description"`
	ImageUrl      string         `json:"image_url"`
	ExternalUrl   string         `json:"external_url,omitempty"`
	AvatarUrl     string         `json:"avatar_url"`
	SlashCommands []SlashCommand `json:"slash_commands,omitempty"`
	DisplayName   string         `json:"display_name"`
}

func ProtocolToStorageAppMetadata(metadata *protocol.AppMetadata) AppMetadata {
	if metadata == nil {
		return AppMetadata{}
	}

	externalUrl := ""
	if metadata.ExternalUrl != nil {
		externalUrl = *metadata.ExternalUrl
	}

	// Convert slash commands
	var slashCommands []SlashCommand
	for _, cmd := range metadata.GetSlashCommands() {
		if cmd != nil {
			slashCommands = append(slashCommands, SlashCommand{
				Name:        cmd.GetName(),
				Description: cmd.GetDescription(),
			})
		}
	}

	return AppMetadata{
		Username:      metadata.GetUsername(),
		Description:   metadata.GetDescription(),
		ImageUrl:      metadata.GetImageUrl(),
		ExternalUrl:   externalUrl,
		AvatarUrl:     metadata.GetAvatarUrl(),
		SlashCommands: slashCommands,
		DisplayName:   metadata.GetDisplayName(),
	}
}

func StorageToProtocolAppMetadata(metadata AppMetadata) *protocol.AppMetadata {
	var externalUrl *string
	if metadata.ExternalUrl != "" {
		externalUrl = &metadata.ExternalUrl
	}

	// Convert slash commands
	var slashCommands []*protocol.SlashCommand
	for _, cmd := range metadata.SlashCommands {
		slashCommands = append(slashCommands, &protocol.SlashCommand{
			Name:        cmd.Name,
			Description: cmd.Description,
		})
	}

	return &protocol.AppMetadata{
		Username:      metadata.Username,
		Description:   metadata.Description,
		ImageUrl:      metadata.ImageUrl,
		ExternalUrl:   externalUrl,
		AvatarUrl:     metadata.AvatarUrl,
		SlashCommands: slashCommands,
		DisplayName:   metadata.DisplayName,
	}
}

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

	if len(urlStr) > 8192 {
		return base.RiverError(protocol.Err_INVALID_ARGUMENT, "URL exceeds maximum length").
			Tag("url_length", len(urlStr)).
			Tag("max_length", 8192)
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
	if len(urlStr) > 8192 {
		return base.RiverError(protocol.Err_INVALID_ARGUMENT, "URL exceeds maximum length").
			Tag("url_length", len(urlStr)).
			Tag("max_length", 8192)
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

// ValidateAppMetadata validates app metadata and returns an error if validation fails
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

	// Validate slash commands
	slashCommands := metadata.GetSlashCommands()
	if len(slashCommands) > 25 {
		return base.RiverError(protocol.Err_INVALID_ARGUMENT, "cannot have more than 25 slash commands").
			Tag("commandCount", len(slashCommands))
	}

	// Check for duplicate command names
	commandNames := make(map[string]bool)
	for _, cmd := range slashCommands {
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
