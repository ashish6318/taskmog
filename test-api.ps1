# PowerShell script to test Chapter API

# Test Create Chapter
$headers = @{
    'Content-Type' = 'application/json'
    'Authorization' = 'Bearer chapter-admin-secret-key-2024'
}

$body = @{
    subject = 'Physics'
    chapter = 'Test Chapter from PowerShell'
    class = 'Class 12'
    unit = 'Test Unit'
    status = 'Not Started'
} | ConvertTo-Json

Write-Host "Request Body: $body" -ForegroundColor Cyan
Write-Host "Headers: $($headers | ConvertTo-Json)" -ForegroundColor Cyan

Write-Host "Testing Chapter Creation..." -ForegroundColor Blue
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/chapters/single" -Method POST -Headers $headers -Body $body
    Write-Host "✅ Chapter created successfully!" -ForegroundColor Green
    Write-Host "Chapter ID: $($response.data._id)" -ForegroundColor Green
    Write-Host "Chapter: $($response.data.chapter)" -ForegroundColor Green
} catch {
    Write-Host "❌ Chapter creation failed!" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Yellow
        $reader.Close()
        $stream.Close()
    }
}

# Test Chapters List
Write-Host "`nTesting Chapters List..." -ForegroundColor Blue
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/chapters?limit=5"
    Write-Host "✅ Chapters retrieved successfully!" -ForegroundColor Green
    Write-Host "Total chapters returned: $($response.data.chapters.Count)" -ForegroundColor Green
    Write-Host "First chapter: $($response.data.chapters[0].chapter)" -ForegroundColor Green
} catch {
    Write-Host "❌ Chapters list failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test with Filters
Write-Host "`nTesting Chapters with Physics filter..." -ForegroundColor Blue
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/chapters?subject=Physics&limit=3"
    Write-Host "✅ Physics chapters retrieved successfully!" -ForegroundColor Green
    Write-Host "Physics chapters found: $($response.data.chapters.Count)" -ForegroundColor Green
} catch {
    Write-Host "❌ Physics filter test failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 Testing completed!" -ForegroundColor Yellow
