package types

import (
	"net/url"

	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/protocol"
)

// We allow up to 8K length of URLs to external resources for bot profile image links, etc.
const MAX_RESOURCE_URL_LENGTH = 8192

const MAX_SLASH_COMMANDS = 25

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
	if len(slashCommands) > MAX_SLASH_COMMANDS {
		return base.RiverError(protocol.Err_INVALID_ARGUMENT,
			"app metadata slash command count exceeds maximum").
			Tag("commandCount", len(slashCommands)).
			Tag("maximum", MAX_SLASH_COMMANDS)
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

// AppMetadataUpdateToMap converts protocol AppMetadataUpdate to map for storage
func AppMetadataUpdateToMap(update *protocol.AppMetadataUpdate, updateMask []string) map[string]interface{} {
	if update == nil {
		return map[string]interface{}{}
	}

	updates := make(map[string]interface{})
	
	// Only include fields specified in the update mask
	maskSet := make(map[string]bool)
	for _, field := range updateMask {
		maskSet[field] = true
	}
	
	if maskSet["username"] && update.Username != nil {
		updates["username"] = *update.Username
	}
	
	if maskSet["display_name"] && update.DisplayName != nil {
		updates["display_name"] = *update.DisplayName
	}
	
	if maskSet["description"] && update.Description != nil {
		updates["description"] = *update.Description
	}
	
	if maskSet["image_url"] && update.ImageUrl != nil {
		updates["image_url"] = *update.ImageUrl
	}
	
	if maskSet["avatar_url"] && update.AvatarUrl != nil {
		updates["avatar_url"] = *update.AvatarUrl
	}
	
	if maskSet["external_url"] && update.ExternalUrl != nil {
		updates["external_url"] = *update.ExternalUrl
	}
	
	if maskSet["slash_commands"] && update.SlashCommands != nil {
		// Convert protocol slash commands to storage format
		var slashCommands []SlashCommand
		for _, cmd := range update.SlashCommands {
			if cmd != nil {
				slashCommands = append(slashCommands, SlashCommand{
					Name:        cmd.GetName(),
					Description: cmd.GetDescription(),
				})
			}
		}
		updates["slash_commands"] = slashCommands
	}
	
	return updates
}

// ValidateAppMetadataUpdate validates partial app metadata updates and returns an error if validation fails
func ValidateAppMetadataUpdate(update *protocol.AppMetadataUpdate, updateMask []string) error {
	if update == nil {
		return base.RiverError(protocol.Err_INVALID_ARGUMENT, "metadata update is required")
	}
	
	if len(updateMask) == 0 {
		return base.RiverError(protocol.Err_INVALID_ARGUMENT, "update_mask is required and cannot be empty")
	}
	
	// Create mask set for efficient lookup
	maskSet := make(map[string]bool)
	for _, field := range updateMask {
		maskSet[field] = true
	}
	
	// Validate username if being updated
	if maskSet["username"] && update.Username != nil {
		if *update.Username == "" {
			return base.RiverError(protocol.Err_INVALID_ARGUMENT, "username cannot be empty")
		}
	}
	
	// Validate display_name if being updated
	if maskSet["display_name"] && update.DisplayName != nil {
		if *update.DisplayName == "" {
			return base.RiverError(protocol.Err_INVALID_ARGUMENT, "display_name cannot be empty")
		}
	}
	
	// Validate description if being updated
	if maskSet["description"] && update.Description != nil {
		if *update.Description == "" {
			return base.RiverError(protocol.Err_INVALID_ARGUMENT, "description cannot be empty")
		}
	}
	
	// Validate image_url if being updated
	if maskSet["image_url"] && update.ImageUrl != nil {
		if err := ValidateImageFileUrl(*update.ImageUrl); err != nil {
			return base.RiverErrorWithBase(protocol.Err_INVALID_ARGUMENT, "image_url validation failed", err).
				Tag("image_url", *update.ImageUrl)
		}
	}
	
	// Validate avatar_url if being updated
	if maskSet["avatar_url"] && update.AvatarUrl != nil {
		if err := ValidateImageFileUrl(*update.AvatarUrl); err != nil {
			return base.RiverErrorWithBase(protocol.Err_INVALID_ARGUMENT, "avatar_url validation failed", err).
				Tag("avatar_url", *update.AvatarUrl)
		}
	}
	
	// Validate external_url if being updated
	if maskSet["external_url"] && update.ExternalUrl != nil {
		if *update.ExternalUrl != "" {
			if err := ValidateExternalUrl(*update.ExternalUrl); err != nil {
				return base.RiverErrorWithBase(protocol.Err_INVALID_ARGUMENT, "external_url validation failed", err).
					Tag("external_url", *update.ExternalUrl)
			}
		}
	}
	
	// Validate slash_commands if being updated
	if maskSet["slash_commands"] && update.SlashCommands != nil {
		if len(update.SlashCommands) > MAX_SLASH_COMMANDS {
			return base.RiverError(protocol.Err_INVALID_ARGUMENT,
				"slash command count exceeds maximum").
				Tag("commandCount", len(update.SlashCommands)).
				Tag("maximum", MAX_SLASH_COMMANDS)
		}
		
		// Check for duplicate command names
		commandNames := make(map[string]bool)
		for _, cmd := range update.SlashCommands {
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
	}
	
	return nil
}
