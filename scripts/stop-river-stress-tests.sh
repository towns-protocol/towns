function check_env() {
    if [ -z "$ENVIRONMENT_NAME" ]; then
        echo "ENVIRONMENT_NAME is not set. Exiting."
        exit 1
    fi
}

function main() {
    echo "stopping river stress tests for environment: $ENVIRONMENT_NAME"
}

check_env
main