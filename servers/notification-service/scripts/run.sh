function check_env() {
    # if  DB_PASSWORD is not set then exit
    if [ -z "$DB_PASSWORD" ]; then
        echo "DB_PASSWORD is not set"
        exit 1
    fi

    # if  DB_USER is not set then exit
    if [ -z "$DB_USER" ]; then
        echo "DB_USER is not set"
        exit 1
    fi

    # if  DB_HOST is not set then exit
    if [ -z "$DB_HOST" ]; then
        echo "DB_HOST is not set"
        exit 1
    fi

    # if  DB_DATABASE is not set then exit
    if [ -z "$DB_DATABASE" ]; then
        echo "DB_DATABASE is not set"
        exit 1
    fi

    # if  DB_PORT is not set then exit
    if [ -z "$DB_PORT" ]; then
        echo "DB_PORT is not set"
        exit 1
    fi
}

function main() {
    echo "Running notification-service"

    local db_schema="notification-service"

    # using the db env vars, contsruct a postgres db url:
    export NOTIFICATION_DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_DATABASE?schema=$db_schema"

    npm start
}

check_env
main
