#!/bin/bash
set -e

# MeoNote V2 → TestFlight Deploy Script
# Usage: ./deploy-testflight.sh [version]
# Example: ./deploy-testflight.sh 1.0.0
# If no version specified, bumps build number only

PROJECT_DIR="/Users/chris/Code/meonote-fe-v2"
XCODEPROJ="ios/App/App.xcodeproj"
SCHEME="App"
PBXPROJ="ios/App/App.xcodeproj/project.pbxproj"
ARCHIVE_PATH="/tmp/MeoNoteV2.xcarchive"
EXPORT_PATH="/tmp/MeoNoteV2-export"
EXPORT_OPTIONS="/tmp/MeoNoteV2-ExportOptions.plist"
TEAM_ID="5V32LWH584"

cd "$PROJECT_DIR"

echo "🚀 MeoNote V2 → TestFlight Deploy"
echo "================================"

# --- 1. Version Management ---
CURRENT_VERSION=$(grep -m1 'MARKETING_VERSION' "$PBXPROJ" | sed 's/.*= //' | sed 's/;.*//')
CURRENT_BUILD=$(grep -m1 'CURRENT_PROJECT_VERSION' "$PBXPROJ" | sed 's/.*= //' | sed 's/;.*//')

if [ -n "${1:-}" ]; then
    NEW_VERSION="$1"
    NEW_BUILD=1
    sed -i '' "s/MARKETING_VERSION = [^;]*/MARKETING_VERSION = $NEW_VERSION/g" "$PBXPROJ"
    echo "📦 Version: $CURRENT_VERSION → $NEW_VERSION (build $NEW_BUILD)"
else
    NEW_VERSION="$CURRENT_VERSION"
    NEW_BUILD=$((CURRENT_BUILD + 1))
    echo "📦 Version: $NEW_VERSION (build $CURRENT_BUILD → $NEW_BUILD)"
fi

sed -i '' "s/CURRENT_PROJECT_VERSION = [^;]*/CURRENT_PROJECT_VERSION = $NEW_BUILD/g" "$PBXPROJ"

# --- 2. Web Build ---
echo ""
echo "🔨 Building web assets..."
npm run build
echo "✅ Web build done"

# --- 3. Capacitor Sync ---
echo ""
echo "📱 Syncing to iOS..."
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx cap sync ios
echo "✅ Cap sync done"

# --- 4. Clean previous artifacts ---
rm -rf "$ARCHIVE_PATH" "$EXPORT_PATH"

# --- 5. Archive ---
echo ""
echo "📦 Archiving (this takes ~2 min)..."
xcodebuild \
    -project "$XCODEPROJ" \
    -scheme "$SCHEME" \
    -configuration Release \
    -archivePath "$ARCHIVE_PATH" \
    archive \
    -allowProvisioningUpdates \
    CODE_SIGN_STYLE=Automatic \
    DEVELOPMENT_TEAM="$TEAM_ID" \
    -quiet

echo "✅ Archive succeeded"

# --- 6. Create ExportOptions ---
cat > "$EXPORT_OPTIONS" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store-connect</string>
    <key>teamID</key>
    <string>5V32LWH584</string>
    <key>signingStyle</key>
    <string>automatic</string>
    <key>uploadSymbols</key>
    <true/>
    <key>destination</key>
    <string>upload</string>
</dict>
</plist>
PLIST

# --- 7. Export + Upload ---
echo ""
echo "☁️  Uploading to TestFlight..."
xcodebuild \
    -exportArchive \
    -archivePath "$ARCHIVE_PATH" \
    -exportPath "$EXPORT_PATH" \
    -exportOptionsPlist "$EXPORT_OPTIONS" \
    -allowProvisioningUpdates \
    -quiet

echo ""
echo "================================"
echo "✅ MeoNote V2 v${NEW_VERSION} (build ${NEW_BUILD}) → TestFlight!"
echo "   Check App Store Connect in a few minutes."
echo "================================"
