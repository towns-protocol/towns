#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

export RIVER_LOG_LEVEL=fatal
export RIVER_REGISTRY_PARALLELREADERS=300

# Parse command line arguments
RESTART=false
COMPARE_ONLY=false
while [[ $# -gt 0 ]]; do
  case $1 in
    --restart)
      RESTART=true
      shift
      ;;
    --compare_only)
      COMPARE_ONLY=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

OUT_DIR=run_files/temp/cmp
mkdir -p $OUT_DIR

# Function to check if we should skip an operation
should_skip() {
  if [ "$RESTART" = true ] && [ -f "$1" ]; then
    echo "Skipping operation as $1 already exists"
    return 0
  fi
  return 1
}

# Function to perform the comparison
compare_streams() {
  echo "Comparing streams per node with all_streams.csv..."
  while IFS=, read -r node_addr rest; do
    node_file="$OUT_DIR/${node_addr}.csv"
    if [ -f "$node_file" ]; then
      node_count=$(wc -l < "$node_file")
      # Count occurrences of this node address in all_streams.csv
      all_streams_count=$(grep -F "$node_addr" "$OUT_DIR/all_streams.csv" | wc -l || true)
      echo "Node $node_addr: $node_count streams in node file, $all_streams_count streams in all_streams.csv"
      
      if [ "$node_count" -ne "$all_streams_count" ]; then
        echo "  WARNING: Mismatch for node $node_addr!"
      fi
    else
      echo "Node $node_addr: File not found"
    fi
  done < "$OUT_DIR/nodes.csv"
}

if [ "$COMPARE_ONLY" = true ]; then
  # Verify that all required files exist
  if [ ! -f "$OUT_DIR/blocknumber.txt" ] || [ ! -f "$OUT_DIR/nodes.csv" ] || [ ! -f "$OUT_DIR/all_streams.csv" ]; then
    echo "Error: Required files not found. Please run without --compare_only first."
    exit 1
  fi
  BLOCK_NUMBER=$(cat $OUT_DIR/blocknumber.txt)
  echo "Block number: $BLOCK_NUMBER"
  echo "Lines in nodes.csv: $(wc -l $OUT_DIR/nodes.csv)"
  echo "Lines in all_streams.csv: $(wc -l $OUT_DIR/all_streams.csv)"
  compare_streams
  exit 0
fi

if ! should_skip "$OUT_DIR/blocknumber.txt"; then
  ./env/omega/run.sh registry blocknumber > $OUT_DIR/blocknumber.txt
fi

BLOCK_NUMBER=$(cat $OUT_DIR/blocknumber.txt)
echo "Block number: $BLOCK_NUMBER"

if ! should_skip "$OUT_DIR/nodes.csv"; then
  ./env/omega/run.sh registry nodes --csv > $OUT_DIR/nodes.csv
fi
echo "Lines in nodes.csv: $(wc -l $OUT_DIR/nodes.csv)"

if ! should_skip "$OUT_DIR/all_streams.csv"; then
  ./env/omega/run.sh registry streams --block $BLOCK_NUMBER --time --csv > $OUT_DIR/all_streams.csv
fi
echo "Lines in all_streams.csv: $(wc -l $OUT_DIR/all_streams.csv)"

# Extract node addresses from the first column of nodes.csv
echo "Extracting streams for each node..."
while IFS=, read -r node_addr rest; do
  echo "Processing node: $node_addr"
  # Create a file for each node's streams
  output_file="$OUT_DIR/${node_addr}.csv"
  if ! should_skip "$output_file"; then
    ./env/omega/run.sh registry streams --node "$node_addr" --block $BLOCK_NUMBER --time --csv > "$output_file"
  fi
  echo "  Streams for $node_addr: $(wc -l < "$output_file")"
done < "$OUT_DIR/nodes.csv"

compare_streams



