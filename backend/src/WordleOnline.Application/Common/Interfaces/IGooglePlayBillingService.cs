namespace WordleOnline.Application.Common.Interfaces;

/// <summary>
/// Google Play Developer API ile satın alma doğrulama.
/// Server-side verification — client token'a güvenme.
/// </summary>
public interface IGooglePlayBillingService
{
    /// <summary>
    /// Google Play Purchase Token'ı sunucu tarafında doğrular.
    /// https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.products/get
    /// </summary>
    Task<bool> VerifyPurchaseAsync(
        string productId,
        string purchaseToken,
        CancellationToken ct = default);
}
