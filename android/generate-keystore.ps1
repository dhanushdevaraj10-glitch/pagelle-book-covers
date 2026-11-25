Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " PAGELLE BOOK COVERS - ANDROID RELEASE KEYSTORE CREATOR" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$keystoreFile = "pagelle-release-key.jks"
$alias = "pagelle"
$validityDays = 10000

if (Test-Path $keystoreFile) {
    Write-Warning "$keystoreFile already exists in this folder! Please back it up before generating a new one."
    exit
}

Write-Host "Generating 2048-bit RSA release signing key..." -ForegroundColor Yellow
$dname = "CN=Pagelle, OU=Mobile, O=Pagelle Book Covers, L=Bangalore, ST=Karnataka, C=IN"

& keytool -genkeypair -v -keystore $keystoreFile -alias $alias -keyalg RSA -keysize 2048 -validity $validityDays -dname $dname -storepass "PagellePass2026!" -keypass "PagellePass2026!"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n========================================================" -ForegroundColor Green
    Write-Host " SUCCESS! Keystore generated: $keystoreFile" -ForegroundColor Green
    Write-Host " Key Alias: $alias" -ForegroundColor Green
    Write-Host " Store Password: PagellePass2026!" -ForegroundColor Green
    Write-Host "========================================================`n" -ForegroundColor Green

    Write-Host "Extracting SHA-256 Fingerprint for Digital Asset Links (.well-known/assetlinks.json):" -ForegroundColor Cyan
    $certInfo = & keytool -list -v -keystore $keystoreFile -alias $alias -storepass "PagellePass2026!"
    $sha256 = ($certInfo | Select-String "SHA256:").Line.Trim()
    Write-Host $sha256 -ForegroundColor Yellow
} else {
    Write-Host "`n[ERROR] keytool failed. Please ensure Java JDK is installed." -ForegroundColor Red
}
