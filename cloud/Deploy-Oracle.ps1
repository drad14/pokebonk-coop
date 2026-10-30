param(
  [Parameter(Mandatory=$true)][string]$PublicIp,
  [Parameter(Mandatory=$true)][string]$KeyPath,
  [string]$SshUser='ubuntu'
)
$ErrorActionPreference='Stop'
$parsed=$null
if($PublicIp -notmatch '^\d{1,3}(\.\d{1,3}){3}$' -or -not [Net.IPAddress]::TryParse($PublicIp,[ref]$parsed) -or $parsed.AddressFamily -ne [Net.Sockets.AddressFamily]::InterNetwork){throw 'Supply the Oracle public IPv4 address.'}
if($SshUser -notmatch '^[a-z_][a-z0-9_-]*$'){throw 'Invalid SSH username.'}
$PublicIp=$parsed.ToString()
$key=(Resolve-Path -LiteralPath $KeyPath).Path
if(-not(Test-Path -LiteralPath $key -PathType Leaf)){throw 'SSH private-key file not found.'}
$root=Split-Path -Parent $PSScriptRoot
$bundle=Join-Path ([IO.Path]::GetTempPath()) ('pokebonk-'+[guid]::NewGuid().ToString('N')+'.tar.gz')
$target=$SshUser+'@'+$PublicIp
$files=@('server.js','api.js','relay.js','patches.js','tunnel.js','runtime-config.js','gacha.js','loot.js','catalog.json','private.html','package.json','package-lock.json','client','Dockerfile','.dockerignore','compose.yaml','Caddyfile','cloud','LICENSE','README.md','CLOUD-SETUP.md','PATCHNOTES.md','UPSTREAM.md')
$sshOptions=@('-i',$key,'-o','IdentitiesOnly=yes','-o','BatchMode=yes','-o','StrictHostKeyChecking=accept-new')
try{
  & tar.exe -czf $bundle -C $root -- @files
  if($LASTEXITCODE -ne 0){throw 'Could not package the server files.'}
  & scp.exe @sshOptions $bundle "${target}:pokebonk-deploy.tar.gz"
  if($LASTEXITCODE -ne 0){throw 'SSH upload failed. Check the IP, key, username and port 22 access.'}
  $remote="sudo install -d -m 0755 /opt/pokebonk && if test -f /opt/pokebonk/cloud/backup.sh; then sudo bash /opt/pokebonk/cloud/backup.sh; fi && sudo tar -xzf ~/pokebonk-deploy.tar.gz -C /opt/pokebonk && sudo bash /opt/pokebonk/cloud/setup-ubuntu.sh $PublicIp"
  & ssh.exe @sshOptions $target $remote
  if($LASTEXITCODE -ne 0){throw 'Remote setup did not complete. Read the command output; existing data/cache folders are preserved.'}
  Write-Host ('Game address: https://play-'+$PublicIp.Replace('.','-')+'.sslip.io')
}finally{
  if(Test-Path -LiteralPath $bundle){Remove-Item -LiteralPath $bundle}
}
