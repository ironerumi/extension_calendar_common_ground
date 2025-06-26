#!/bin/bash

# Chrome Extension Build Script
# Creates a distribution-ready zip file for Chrome Web Store upload

set -e  # Exit on any error

# Configuration
EXTENSION_NAME="common-ground"
DIST_DIR="dist"
TEMP_DIR="$DIST_DIR/temp"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
ZIP_NAME="${EXTENSION_NAME}_${TIMESTAMP}.zip"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Building Chrome Extension: $EXTENSION_NAME${NC}"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "manifest.json" ]; then
    echo -e "${RED}❌ Error: manifest.json not found. Please run this script from the extension root directory.${NC}"
    exit 1
fi

# Clean and create directories
echo -e "${YELLOW}📁 Preparing build directory...${NC}"
rm -rf "$DIST_DIR"
mkdir -p "$TEMP_DIR"

# Define files to include
FILES_TO_INCLUDE=(
    "manifest.json"
    "background.js"
    "calendar-api.js"
    "slot-finder.js"
    "options.html"
    "options.js"
    "sidepanel.html"
    "sidepanel.js"
    "common.css"
    "common-ground-minimal.png"
    "common-ground.png"
)

# Define directories to include
DIRS_TO_INCLUDE=(
    "_locales"
)

# Copy individual files
echo -e "${YELLOW}📋 Copying extension files...${NC}"
for file in "${FILES_TO_INCLUDE[@]}"; do
    if [ -f "$file" ]; then
        cp "$file" "$TEMP_DIR/"
        echo "  ✓ $file"
    else
        echo -e "${RED}  ❌ Warning: $file not found${NC}"
    fi
done

# Copy directories
echo -e "${YELLOW}📁 Copying directories...${NC}"
for dir in "${DIRS_TO_INCLUDE[@]}"; do
    if [ -d "$dir" ]; then
        cp -r "$dir" "$TEMP_DIR/"
        echo "  ✓ $dir/"
    else
        echo -e "${RED}  ❌ Warning: $dir/ not found${NC}"
    fi
done

# Validate critical files
echo -e "${YELLOW}🔍 Validating build...${NC}"
CRITICAL_FILES=("manifest.json" "background.js")
for file in "${CRITICAL_FILES[@]}"; do
    if [ ! -f "$TEMP_DIR/$file" ]; then
        echo -e "${RED}❌ Error: Critical file $file is missing from build${NC}"
        exit 1
    fi
done

# Create zip file
echo -e "${YELLOW}📦 Creating zip archive...${NC}"
cd "$TEMP_DIR"
zip -r "../$ZIP_NAME" . > /dev/null
cd - > /dev/null

# Clean up temp directory
rm -rf "$TEMP_DIR"

# Final output
FINAL_ZIP="$DIST_DIR/$ZIP_NAME"
FILE_SIZE=$(du -h "$FINAL_ZIP" | cut -f1)

echo ""
echo -e "${GREEN}✅ Build completed successfully!${NC}"
echo "=================================================="
echo -e "${GREEN}📦 Extension package: ${NC}$FINAL_ZIP"
echo -e "${GREEN}📏 File size: ${NC}$FILE_SIZE"
echo ""
echo -e "${BLUE}🚀 Ready for Chrome Web Store upload!${NC}"
echo ""
echo "Next steps:"
echo "1. Go to https://chrome.google.com/webstore/developer/dashboard"
echo "2. Upload the zip file: $FINAL_ZIP"
echo "3. Fill in store listing details"
echo ""
