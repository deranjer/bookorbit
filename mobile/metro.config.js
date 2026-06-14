const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The reader assets (foliate.js + host page + bridge) are shipped as `.txt` files so
// Metro treats them as bundlable assets rather than source modules — see
// src/reader/assets.ts, which copies them to disk (stripping `.txt`) for the WebView.
config.resolver.assetExts.push('txt');

module.exports = config;
