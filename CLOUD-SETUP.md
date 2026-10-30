# Oracle deployment: free address, your PC can be off

This kit is prepared, **not deployed yet**. We need an Oracle Ubuntu VM, its public IP and local SSH-key path to carry out the installation. It does not create or charge for cloud resources.

## Create the VM

1. Finish your Oracle Cloud account signup. Choose your home region carefully; free compute availability varies.
2. In **Compute → Instances → Create instance**, choose **Ubuntu 24.04 LTS**, a public subnet and a public IPv4 address.
3. Choose a shape marked **Always Free eligible**. A1 Flex with **1 OCPU / 6 GB** is a reasonable starting point if available. E2.1.Micro is a smaller fallback. Use only Always Free resources; this kit does not need a paid load balancer or managed database.
4. Download and keep the SSH private key when creating the instance. Default Ubuntu SSH username is `ubuntu`. We can use that file locally; do not paste the private-key contents into chat.
5. Add VCN/security-list ingress rules for **TCP 80 and 443**, source `0.0.0.0/0`. Keep SSH 22 available for setup. Port 8777 stays inside the Docker network.
6. Send the VM's public IPv4 once it is running. We can then use `cloud/Deploy-Oracle.ps1` to upload and configure it.

Check the Oracle console's Always Free badge and estimates before creating resources. Current published A1 free allowances are 2 OCPUs/12 GB total; availability and free-tier policy can change. Oracle may reclaim idle free VMs. This setup is intended to remain running, but it does not guarantee uninterrupted 24/7 service.

## Address and HTTPS

The helper generates `https://play-<PUBLIC-IP-WITH-DASHES>.sslip.io`. You do not buy a domain or register with that DNS service. The hostname stays the same while you keep that public IP. Replacing/releasing the IP changes the address.

Caddy obtains and renews the TLS certificate and proxies both HTTP and WebSockets. DNS must resolve to the VM, and public TCP ports 80/443 must be reachable. Certificate issuance can be rate-limited by the shared DNS service or CA; it is verified after deployment, not assumed from the containers merely starting.

## What runs on Oracle

- A non-root Node container serves the game, account API and eight-player relay.
- Caddy serves HTTPS on ports 80/443. The raw Node port is not published.
- Docker starts the containers after reboot and restarts a crashed process. `unless-stopped` does not override an intentional manual stop.
- `data/` and `cache/` are host bind mounts under `/opt/pokebonk`. Rebuilding/replacing containers does not erase saves or cached game files.
- A daily systemd timer archives saves into `/opt/pokebonk/backups`. These backups are on the same VM; download copies or use an Oracle volume backup for protection against losing the VM.
- The Party invite button uses the configured HTTPS address. No Cloudflare quick tunnel and no join password are used in this deployment.

Any friend can be the first player to start a run. **Your PC does not need to be on.** One connected player's browser still simulates each match; if that player leaves, the existing game ends. The website remains available and another player can start the next run. This kit does not turn the browser simulation into a permanently running dedicated game world.

## Deployment helper

From this extracted kit on Windows, after the VM and ingress rules are ready:

```powershell
./cloud/Deploy-Oracle.ps1 -PublicIp YOUR_PUBLIC_IP -KeyPath 'C:\path\to\ssh-key.key'
```

The helper validates its inputs, uploads only whitelisted application/deployment files, and runs the Ubuntu installer in `/opt/pokebonk`. It never uploads your SSH key, local game saves, cache or node_modules. SSH accepts a new host key, but refuses a changed known host key. Keep the local key file's normal private permissions.

The Ubuntu installer adds Docker's official apt repository if Docker is absent, enables Docker at boot, prepares the persistent folders, writes `.env`, builds/starts the services and enables the daily save-backup timer. It does not edit Oracle ingress rules, flush firewalls, or create paid resources. Use a fresh Ubuntu VM for the first deployment.

## Existing private saves

The first deployment starts a separate cloud save store. Before friends start playing, we can migrate your PC's `data/accounts.json` and existing `cache` onto the VM. The transfer must happen with the game container stopped and must not overwrite newer cloud saves. The bundle excludes these files intentionally. Browser guest sessions are tied to their website address; a new address does not automatically retain a guest token. Official PokéBonk accounts/progress are not imported.

## Maintenance

On the VM:

```bash
cd /opt/pokebonk
sudo docker compose ps
sudo docker compose logs --tail=80 game web
sudo bash cloud/backup.sh
```

Update by rerunning the Windows deployment helper; it backs up existing saves first and leaves `data`, `cache` and existing certificate volumes in place. Restarting/updating interrupts active matches. Keep the pinned cache, since old original game assets may disappear upstream. No original game assets are included in this kit; they download from the public site as needed.

## Validation status

Local tests cover the public URL configuration, correct invite address behind a proxy, no tunnel startup in cloud mode, guest/profile persistence across server restart, and first-visitor hosting without the owner. Compose configuration and installer syntax are checked separately. A Docker engine was not running on this PC during preparation, so image build/container startup, Oracle networking and public TLS still need verification on the actual VM.

Sources: [Oracle Always Free resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm), [sslip.io / nip.io DNS and TLS](https://nip.io/), [Caddy HTTPS](https://caddyserver.com/docs/quick-starts/https), [Caddy WebSockets](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy), [Docker's Ubuntu installation](https://docs.docker.com/engine/install/ubuntu/).
