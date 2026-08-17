#!/bin/bash
# Generate a secure SECRET_KEY for Flask in production

echo "Generating secure SECRET_KEY..."
python3 -c "import secrets; print(secrets.token_hex(32))"
