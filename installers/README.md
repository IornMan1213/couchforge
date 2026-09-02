# CouchForge installers (v0.2.0)

Install **without** cloning the full git repo.

## Windows

1. Open [Releases](https://github.com/IornMan1213/couchforge/releases)
2. Download **Install-CouchForge.cmd** and **Install-CouchForge.ps1** (same folder)
3. Double-click **Install-CouchForge.cmd**
4. Use **Start CouchForge** on the Desktop
5. Open `http://localhost:3090` — room **COUCH1**

Requires Node.js 18+. If missing, the script tries winget.

> A fully self-contained `.exe` is not included yet (`robotjs` is native). The installer is the supported one-click path.

## Linux

```bash
curl -fsSL https://raw.githubusercontent.com/IornMan1213/couchforge/v0.2.0/installers/linux/install.sh | bash
```

## macOS

```bash
curl -fsSL https://raw.githubusercontent.com/IornMan1213/couchforge/v0.2.0/installers/macos/install.sh | bash
```
