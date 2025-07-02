#!/bin/bash

# Build script - just change the client ID for production
# Usage: ./build.sh [prod]

if [ "$1" = "prod" ]; then
    echo "Building for production..."
    export CLIENT_ID="$PROD_CLIENT_ID"
    envsubst < manifest.template.json > manifest.json
    mkdir -p dist
    zip -r dist/extension-prod.zip manifest.json background.js calendar-api.js common.css *.png options.html options.js sidepanel.html sidepanel.js slot-finder.js index.html _locales
    git checkout -- manifest.json
    echo "Production build created: dist/extension-prod.zip"
else
    echo "Building for development..."
    export CLIENT_ID="$DEV_CLIENT_ID"
    envsubst < manifest.template.json > manifest.json
    mkdir -p dist
    zip -r dist/extension-dev.zip manifest.json background.js calendar-api.js common.css *.png options.html options.js sidepanel.html sidepanel.js slot-finder.js index.html _locales
    git checkout -- manifest.json
    echo "Development build created: dist/extension-dev.zip"
fi
