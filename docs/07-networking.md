# 7. Networking (Tailscale and LAN)

## Default bind

The host listens on `0.0.0.0:3090` so LAN and Tailscale interfaces can connect.

## Find the right IP

From the `npm start` banner:

```text
Local:   http://localhost:3090
Network: http://100.x.x.x:3090    ← Tailscale (use this from phone over Tailscale)
Network: http://192.168.x.x:3090  ← LAN (same Wi-Fi only)
```

**Phone on Tailscale:** use the `100.x.x.x` address.  
**Phone on same Wi-Fi only:** `192.168.x.x` can work without Tailscale.

## Tailscale checklist

1. Install Tailscale on PC and phone
2. Same account / tailnet
3. Both show Connected
4. PC: `http://100.x.x.x:3090` opens in phone Safari

## Windows Firewall

First run may prompt to allow Node.js. Allow **private** networks.

Manual rule (admin PowerShell) if needed:

```powershell
New-NetFirewallRule -DisplayName "CouchForge 3090" -Direction Inbound -Protocol TCP -LocalPort 3090 -Action Allow
```

## Common network failures

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Safari spins / cannot connect | Wrong IP, Tailscale off, firewall | Verify `100.x` IP; Tailscale Connected; allow port 3090 |
| Works on PC localhost, not phone | Binding/firewall | Confirm `0.0.0.0` listen; firewall rule |
| Works on Wi-Fi, not away from home | Not using Tailscale IP | Use `100.x` address |
| HTTPS error | App is HTTP-only | Use `http://` not `https://` |

## Security notes

- No password on sessions in v0.1 — **session code** is the gate
- Prefer **Tailscale** over exposing 3090 to the public internet
- Anyone who can reach the port and guess/join a live code can view/control

## Ports

| Port | Service |
|------|---------|
| 3090 | CouchForge (this project) |
| 3080 | Couch Share (sibling project) |
