# Getting Started With Google Chrome Extensions (Hello World)

This example demonstrates how to create a simple "Hello World" Chrome Extension.
For more details, visit the [official tutorial](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world).

## Running This Extension

1. Clone this repository.
2. Load this directory in Chrome as an [unpacked extension](https://developer.chrome.com/docs/extensions/mv3/getstarted/development-basics/#load-unpacked).
3. Click the extension icon in the Chrome toolbar, then select the "Hello Extensions" extension. A popup will appear displaying the text "Hello Extensions".

## Manual Distribution
```bash
zip dist/extension.zip manifest.json background.js calendar-api.js common.css common-ground-minimal.png common-ground.png options.html options.js sidepanel.html sidepanel.js slot-finder.js -r _locales
```