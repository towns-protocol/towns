package bot_server

// InitializeWebhook calls "initialize" on a bot service specified by the webhook url
// and returns the device id and fallback key returned by the service. This
// (device_id, fallback_key) should match what we observe in the bot's user stream.
// TODO - implement
func InitializeWebhook() {
}

// GetWebhookStatus sends an "info" message to the bot service and expects a 200 with
// version info returned.
// TODO - implement.
func GetWebhookStatus() {
}
