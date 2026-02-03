#!/usr/bin/env bash
set -e

echo "Generating Python gRPC code from proto files..."

# Find all .proto files in proto/ directory and compile them
uv run python -m grpc_tools.protoc \
    -I proto/ \
    --python_out=. \
    --grpc_python_out=. \
    --pyi_out=. \
    $(find proto -name "*.proto" -type f)

echo "Proto generation complete!"