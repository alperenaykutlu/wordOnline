using WordleOnline.Domain.Game.ValueObjects;

namespace WordleOnline.Domain.Game.Services;

/// <summary>
/// Puan hesaplama kuralları domain servisinde toplanır.
/// GameRoom aggregate'i bu servisi kullanmak yerine
/// kendisi hesaplar — servis dışarıdan sorgulama için tutulur.
///
/// Kurallar:
/// - Doğru harf & doğru konum : +10 puan
/// - Doğru harf & yanlış konum : +5 puan
/// - Harf yok : 0 puan
/// - Kaybedilen raunt : -20 puan
/// - Kalan süreye göre time bonus : 0-20 puan
/// - Ecurie artan süre bonusu : her kalan saniye için +2 puan (max 20)
/// </summary>
public static class ScoreCalculationService
{
    public const int CorrectPositionPoints  = 10;
    public const int WrongPositionPoints    = 5;
    public const int NotFoundPoints         = 0;
    public const int LossPenalty            = 20;
    public const int MaxTimeBonus           = 20;

    /// <summary>
    /// Kalan süreye orantılı bonus.
    /// Ecurie modunda kalan süre ne kadar fazlaysa bonus o kadar yüksek.
    /// </summary>
    public static int CalculateTimeBonus(TimeSpan remaining, TimeSpan total)
    {
        if (remaining <= TimeSpan.Zero || total <= TimeSpan.Zero) return 0;
        var ratio = remaining.TotalSeconds / total.TotalSeconds;
        return (int)Math.Round(ratio * MaxTimeBonus);
    }

    /// <summary>
    /// Oyuncunun toplam maç skorunu hesaplar.
    /// </summary>
    public static int CalculateMatchScore(
        IEnumerable<Score> roundScores,
        int wins,
        int losses)
    {
        var guessTotal  = roundScores.Sum(s => s.Value);
        var penaltyTotal = losses * LossPenalty;
        return Math.Max(0, guessTotal - penaltyTotal);
    }
}
