# Script para probar el webhook de WhatsApp simulando una peticion de Twilio

$url = "http://localhost:5000/api/webhook/whatsapp"

# Simular datos de Twilio
$body = @{
    From = "whatsapp:+56912345678"
    Body = "Hola, tengo un problema con la patente AA1234"
    NumMedia = "0"
    MessageSid = "SM1234567890"
}

Write-Host "Probando webhook con mensaje simulado..." -ForegroundColor Cyan
Write-Host "De: +56912345678" -ForegroundColor Yellow
Write-Host "Mensaje: Hola, tengo un problema con la patente AA1234" -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri $url -Method POST -Body $body -ContentType "application/x-www-form-urlencoded" -UseBasicParsing
    
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Respuesta:" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "Respuesta de error:" -ForegroundColor Red
        Write-Host $responseBody
    }
}

Write-Host ""
Write-Host "Revisa la terminal del backend para ver los logs completos" -ForegroundColor Cyan
