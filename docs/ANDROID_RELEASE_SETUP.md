# Android Release Setup Guide

To enable the automated APK build and signing pipeline, you need to configure the following secrets in your GitHub repository.

## 1. Generate a Keystore

If you haven't already generated a signing key for your Android app, run the following command in your terminal:

```bash
keytool -genkey -v -keystore my-release-key.keystore -alias alora-key -keyalg RSA -keysize 2048 -validity 10000
```

Follow the prompts to set passwords and certificate details.
- **Keystore Password**: Remember this (you'll need it for `STORE_PASSWORD`).
- **Key Password**: Remember this (you'll need it for `KEY_PASSWORD`).
- **Alias**: `alora-key` (or whatever you chose).

## 2. Encode Keystore to Base64

GitHub Secrets cannot store binary files directly, so we encode the keystore file to a Base64 string.

**macOS:**
```bash
base64 -i my-release-key.keystore | pbcopy
# Or just print it to copy manually:
base64 -i my-release-key.keystore
```

**Linux:**
```bash
# Use -w 0 to disable line wrapping
base64 -w 0 my-release-key.keystore
# Or copy to clipboard with xclip:
base64 -w 0 my-release-key.keystore | xclip -selection clipboard
```

**Windows (PowerShell):**
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("./my-release-key.keystore")) | Set-Clipboard
```

## 3. Add Secrets to GitHub

Go to your GitHub Repository -> **Settings** -> **Secrets and variables** -> **Actions** -> **New repository secret**.

Add the following secrets:

| Secret Name | Value |
|-------------|-------|
| `KEYSTORE_BASE64` | The long Base64 string you generated in Step 2. |
| `KEY_ALIAS` | The alias you used (e.g., `alora-key`). |
| `KEY_PASSWORD` | The password for the key itself. |
| `STORE_PASSWORD` | The password for the keystore (usually the same as key password if you didn't separate them). |

## 4. Triggering a Build

1. Push these changes to `main`.
2. Go to the GitHub repository main page.
3. Click **Releases** -> **Draft a new release**.
4. Create a new tag (e.g., `v1.0.0`).
5. Publish the release.

The `Android Release` workflow will automatically run, build the APK, sign it, and upload it as an asset to your release.
