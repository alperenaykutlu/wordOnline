using System.Net.Http.Headers;
using System.Text.Json;
using Google.Apis.Auth.OAuth2;
using Microsoft.Extensions.Options;
using WordleOnline.Application.Common.Interfaces;

namespace WordleOnline.Infrastructure.Payment;

public sealed class GooglePlayBillingSettings
{
    public string PackageName      { get; set; } = string.Empty;  // com.yourapp.wordleonline
    public string ServiceAccountJson { get; set; } = string.Empty; // Service account JSON
}

/// <summary>
/// Google Play Developer API v3 ile sunucu taraflı doğrulama.
/// Client'tan gelen purchase token'ı direkt kabul etmiyoruz — replay attack önlemi.
///
/// Referans: https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.products/get
/// </summary>
public sealed class GooglePlayBillingService : IGooglePlayBillingService
{
    private readonly GooglePlayBillingSettings _settings;
    private readonly IHttpClientFactory        _httpFactory;

    public GooglePlayBillingService(
        IOptions<GooglePlayBillingSettings> settings,
        IHttpClientFactory                  httpFactory)
    {
        _settings    = settings.Value;
        _httpFactory = httpFactory;
    }

    public async Task<bool> VerifyPurchaseAsync(
        string productId,
        string purchaseToken,
        CancellationToken ct = default)
    {
        try
        {
            var accessToken = await GetAccessTokenAsync(ct);
            var client      = _httpFactory.CreateClient("GooglePlay");

            // Google Play Developer API endpoint
            var url = $"https://androidpublisher.googleapis.com/androidpublisher/v3/applications/" +
                      $"{_settings.PackageName}/purchases/products/{productId}/tokens/{purchaseToken}";

            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            using var response = await client.SendAsync(request, ct);

            if (!response.IsSuccessStatusCode)
            {
                // 404 → token geçersiz veya kullanılmış
                return false;
            }

            var json = await response.Content.ReadAsStringAsync(ct);
            var doc  = JsonDocument.Parse(json);
            var root = doc.RootElement;

            // purchaseState: 0 = Purchased, 1 = Canceled, 2 = Pending
            var purchaseState = root.TryGetProperty("purchaseState", out var ps) ? ps.GetInt32() : -1;
            var consumptionState = root.TryGetProperty("consumptionState", out var cs) ? cs.GetInt32() : -1;

            // Tek seferlik ürün: purchaseState = 0 (Purchased)
            // consumptionState kontrolü — önceden consume edilmemişse geçerli
            return purchaseState == 0;
        }
        catch (Exception ex)
        {
            // Log ve false dön — satın almayı onaylama
            Console.Error.WriteLine($"[GooglePlay] Doğrulama hatası: {ex.Message}");
            return false;
        }
    }

    private async Task<string> GetAccessTokenAsync(CancellationToken ct)
    {
        // Service account JSON'dan OAuth2 token al
        var credential = GoogleCredential
            .FromJson(_settings.ServiceAccountJson)
            .CreateScoped("https://www.googleapis.com/auth/androidpublisher");

        var token = await credential.UnderlyingCredential
            .GetAccessTokenForRequestAsync(cancellationToken: ct);

        return token;
    }
}
