
VITE_SENTRY_ORG ?= here-not-there
VITE_SENTRY_PROJECT ?= harmony-web
LOG_LEVEL ?= info

VITE_APP_RELEASE_VERSION ?= $(shell git rev-parse --short HEAD)
AUTH_TOKEN=$(SENTRY_AUTH_TOKEN)

setup_release: create_release upload_sourcemaps finalize_release

create_release:
	@echo "Creating release $(VITE_APP_RELEASE_VERSION)"
	@../node_modules/.bin/sentry-cli releases --log-level $(LOG_LEVEL) --auth-token $(AUTH_TOKEN) -o $(VITE_SENTRY_ORG) new -p $(VITE_SENTRY_PROJECT) $(VITE_APP_RELEASE_VERSION)

upload_sourcemaps:
	@../node_modules/.bin/sentry-cli releases --log-level $(LOG_LEVEL) --auth-token $(AUTH_TOKEN) -o $(VITE_SENTRY_ORG) -p $(VITE_SENTRY_PROJECT) files $(VITE_APP_RELEASE_VERSION) \
		upload-sourcemaps ../clients

finalize_release:
	@../node_modules/.bin/sentry-cli releases --log-level $(LOG_LEVEL) --auth-token $(AUTH_TOKEN) -o $(VITE_SENTRY_ORG) -p $(VITE_SENTRY_PROJECT) finalize $(VITE_APP_RELEASE_VERSION)