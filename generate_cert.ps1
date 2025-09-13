# PowerShell script to generate proper self-signed certificate for uvicorn
Write-Host "Creating self-signed SSL certificate for Price Scanner..." -ForegroundColor Green

# Get your local IP address
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254*"}).IPAddress | Select-Object -First 1
Write-Host "Detected local IP: $localIP" -ForegroundColor Yellow

# Create certificate with multiple DNS names
$cert = New-SelfSignedCertificate `
    -DnsName "localhost", "127.0.0.1", $localIP `
    -CertStoreLocation "cert:\CurrentUser\My" `
    -KeyUsage KeyEncipherment,DigitalSignature `
    -KeyAlgorithm RSA `
    -KeyLength 2048 `
    -KeyExportPolicy Exportable `
    -NotAfter (Get-Date).AddYears(1)

Write-Host "Certificate created with thumbprint: $($cert.Thumbprint)" -ForegroundColor Green

# Export certificate to temporary PFX file with password
$pfxPassword = ConvertTo-SecureString -String "temppass123" -Force -AsPlainText
$pfxPath = "temp_cert.pfx"
Export-PfxCertificate -Cert "cert:\CurrentUser\My\$($cert.Thumbprint)" -FilePath $pfxPath -Password $pfxPassword | Out-Null

Write-Host "Converting to PEM format..." -ForegroundColor Green

# Convert PFX to PEM using OpenSSL commands via PowerShell
$opensslCmd = @"
# Extract certificate from PFX
openssl pkcs12 -in temp_cert.pfx -clcerts -nokeys -out cert.pem -password pass:temppass123 -passin pass:temppass123

# Extract private key from PFX
openssl pkcs12 -in temp_cert.pfx -nocerts -out key_encrypted.pem -password pass:temppass123 -passin pass:temppass123 -passout pass:temppass123

# Remove password from private key
openssl rsa -in key_encrypted.pem -out key.pem -passin pass:temppass123
"@

# Check if OpenSSL is available
try {
    $null = Get-Command openssl -ErrorAction Stop
    Write-Host "Using OpenSSL to convert certificates..." -ForegroundColor Green
    
    # Execute OpenSSL commands
    cmd /c "openssl pkcs12 -in temp_cert.pfx -clcerts -nokeys -out cert.pem -password pass:temppass123 -passin pass:temppass123 2>nul"
    cmd /c "openssl pkcs12 -in temp_cert.pfx -nocerts -out key_encrypted.pem -password pass:temppass123 -passin pass:temppass123 -passout pass:temppass123 2>nul"
    cmd /c "openssl rsa -in key_encrypted.pem -out key.pem -passin pass:temppass123 2>nul"
    
    # Clean up temporary files
    Remove-Item -Path "key_encrypted.pem" -ErrorAction SilentlyContinue
    
} catch {
    Write-Host "OpenSSL not found. Creating PEM files manually..." -ForegroundColor Yellow
    
    # Manual PEM creation (fallback method)
    $certBase64 = [System.Convert]::ToBase64String($cert.RawData, [System.Base64FormattingOptions]::InsertLineBreaks)
    $certPem = "-----BEGIN CERTIFICATE-----`r`n$certBase64`r`n-----END CERTIFICATE-----`r`n"
    [System.IO.File]::WriteAllText("cert.pem", $certPem, [System.Text.Encoding]::UTF8)
    
    # Export private key manually
    $rsa = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($cert)
    if ($rsa -eq $null) {
        Write-Error "Failed to extract private key"
        exit 1
    }
    
    $keyBytes = $rsa.ExportRSAPrivateKey()
    $keyBase64 = [System.Convert]::ToBase64String($keyBytes, [System.Base64FormattingOptions]::InsertLineBreaks)
    $keyPem = "-----BEGIN RSA PRIVATE KEY-----`r`n$keyBase64`r`n-----END RSA PRIVATE KEY-----`r`n"
    [System.IO.File]::WriteAllText("key.pem", $keyPem, [System.Text.Encoding]::UTF8)
}

# Clean up temporary files
Remove-Item -Path $pfxPath -ErrorAction SilentlyContinue
Remove-Item -Path "cert:\CurrentUser\My\$($cert.Thumbprint)" -ErrorAction SilentlyContinue

# Verify files were created
if ((Test-Path "cert.pem") -and (Test-Path "key.pem")) {
    Write-Host "SSL certificate files created successfully!" -ForegroundColor Green
    Write-Host "Files created:" -ForegroundColor White
    Write-Host "  - cert.pem (certificate)" -ForegroundColor White
    Write-Host "  - key.pem (private key)" -ForegroundColor White
    
    # Show file sizes to verify they contain data
    $certSize = (Get-Item "cert.pem").Length
    $keySize = (Get-Item "key.pem").Length
    Write-Host "  - cert.pem size: $certSize bytes" -ForegroundColor Gray
    Write-Host "  - key.pem size: $keySize bytes" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "You can now start the HTTPS server!" -ForegroundColor Green
} else {
    Write-Error "Failed to create certificate files"
    exit 1
}