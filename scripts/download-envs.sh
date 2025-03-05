#!/usr/bin/env bash

# File: scripts/download_envs.sh
# Usage Examples:
#    bash scripts/download_envs.sh           # Download ALL envs (omega, fast-app, alpha, gamma)
#    bash scripts/download_envs.sh alpha     # Download ONLY alpha
#    bash scripts/download_envs.sh omega fast-app
#    bash scripts/download_envs.sh gamma alpha

# Associating each URL with its corresponding .env target
declare -a targets=(
  "https://app.towns.com/|.deployment.env.omega"
  "https://fast-app.towns.com/|.deployment.env.fast-app"
  "https://app.alpha.towns.com/|.deployment.env.alpha"
  "https://app.gamma.towns.com/|.deployment.env.gamma"
)

# Collect user-specified environments, if any
selected_envs=("$@")   # e.g. ["alpha", "omega", ...]

# Helper function: check if an element ($1) is in the array selected_envs
function is_in_selected() {
  local needle="$1"
  # If no arguments were passed to the script, we want to match ALL.
  # Otherwise, match only if $needle is in selected_envs.
  if [ ${#selected_envs[@]} -eq 0 ]; then
    return 0  # "true" => no selection, so everything is included
  else
    for item in "${selected_envs[@]}"; do
      if [ "$item" == "$needle" ]; then
        return 0  # "true"
      fi
    done
  fi
  return 1  # "false"
}

# Iterate over all URL -> env file pairs
for pair in "${targets[@]}"; do
  IFS="|" read -r url envfile <<< "$pair"

  # "envfile" is something like ".env.alpha" or ".env.gamma" or ".env.fast-app"
  # We'll extract the part after ".env." => "alpha", "fast-app", etc.
  short_name=$(echo "$envfile" | sed -E 's/\.deployment\.env\.//')

  # Check if this short_name is in the user selection (or if none specified, do all).
  if is_in_selected "$short_name"; then
    echo "Processing $url -> $envfile"

    # Create a temporary file to collect variables (deduplicate later)
    env_temp="$(mktemp)"
    # Ensure we remove it if the script ends unexpectedly
    trap 'rm -f "$env_temp"' EXIT

    # 1. Fetch HTML, find lines with <script type="module"...>, then extract src="..."
    script_srcs=$(curl -s "$url" \
      | grep -E 'type="module"' \
      | grep -oE 'src="[^"]+"' \
      | sed -E 's/src="([^"]+)"/\1/'
    )

    # 2. For each JS file, download and parse for VITE_ variables -> append to $env_temp
    for src in $script_srcs; do
      script_url="${url%/}/${src#"/"}"

      echo "  --> Downloading and parsing $script_url"

      curl -s "$script_url" \
        | grep -oE 'VITE_[A-Z0-9_]+[=:]\s*["'"'"'][^"'"'"']+["'"'"']' \
        | while IFS= read -r match; do
            varname=$(echo "$match" | sed -E 's/([A-Z0-9_]+)[=:].*/\1/')
            value=$(echo "$match"  | sed -E 's/.*[=:]\s*["'"'"']([^"'"'"']+)["'"'"'].*/\1/')
            echo "${varname}=\"${value}\"" >> "$env_temp"
          done
    done

    # 3. Dedupe variables and write final .env file
    env_path="clients/web/app/$envfile"
    sort -u "$env_temp" > "$env_path"

    echo "Finished -> $env_path"
    echo

    # Cleanup the temp file
    rm -f "$env_temp"
    trap - EXIT
  fi
done


echo "All done!"
