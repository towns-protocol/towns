# generate the VAPID keys
VAPID_KEYS_DIR=.keys/
VAPID_KEYS_FILE="$VAPID_KEYS_DIR"vapid-keys.json
if [ ! -d "$VAPID_KEYS_DIR" ] 
then
    echo "Directory $VAPID_KEYS_DIR does not exist. Creating it now..."
    mkdir $VAPID_KEYS_DIR
    echo "Directory $VAPID_KEYS_DIR created."
fi

if [ ! -f "$VAPID_KEYS_FILE" ]
then    
    echo "VAPID keys $VAPID_KEYS_FILE does not exist. Generating keys now..."
    npx web-push generate-vapid-keys --json > $VAPID_KEYS_FILE
    echo "VAPID keys generated in $VAPID_KEYS_FILE"
fi

