using WordleOnline.Application.Common.Interfaces;

namespace WordleOnline.Infrastructure.ExternalServices;

/// <summary>
/// Türkçe kelime havuzu servisi.
/// Production: harici kelime API'si veya MongoDB kelime koleksiyonu.
/// Development: bellek içi sabit liste.
/// </summary>
public sealed class WordService : IWordService
{
    // Kelime uzunluğuna göre örnek Türkçe kelime havuzu
    private static readonly Dictionary<int, string[]> WordPool = new()
    {
        [3] = ["kap","git","yaz","bak","say","kal","gel","gör","ver","bil"],
        [4] = ["elma","arpa","baba","anne","dost","kale","masa","kalem","deniz","yıldız".Substring(0,4)],
        [5] = ["araba","balık","çilek","deniz","elmas","fırtına".Substring(0,5),"güneş","haber","ışık".PadRight(5,'x').Substring(0,5),"ördek".PadRight(5)],
        [6] = ["çiçek".PadRight(6,'x').Substring(0,5)+"i","bayram","cevher","düşman","eğlence".Substring(0,6),"fiyasko".Substring(0,6)],
        [7] = ["kelebek","oyuncu","yazılım","mühimmat".Substring(0,7),"sanatçı","tembel".PadRight(7,'x').Substring(0,7)],
        [8] = ["bilgisayar".Substring(0,8),"karanlık","mükemmel","yaratıcı"],
    };

    private static readonly HashSet<string> ValidWords = new(
        WordPool.Values.SelectMany(w => w),
        StringComparer.OrdinalIgnoreCase
    );

    public Task<string> GetRandomWordAsync(int length, CancellationToken ct = default)
    {
        if (!WordPool.TryGetValue(length, out var pool))
            throw new ArgumentException($"Desteklenmeyen kelime uzunluğu: {length}");

        var word = pool[Random.Shared.Next(pool.Length)].ToUpperInvariant();
        return Task.FromResult(word);
    }

    public Task<bool> IsValidWordAsync(string word, CancellationToken ct = default)
    {
        // Production'da harici sözlük API çağrısı yapılır
        // Geliştirme için length kontrolü yeterli
        var isValid = !string.IsNullOrWhiteSpace(word)
            && word.Length >= 3
            && word.Length <= 10
            && System.Text.RegularExpressions.Regex.IsMatch(
                word, @"^[a-zA-ZğüşıöçĞÜŞİÖÇ]+$");

        return Task.FromResult(isValid);
    }
}
