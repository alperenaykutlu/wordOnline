using WordleOnline.Domain.Game.Enums;

namespace WordleOnline.Domain.Game.ValueObjects;

// ── TargetWord ────────────────────────────────────────────
/// <summary>
/// Oyunda tahmin edilecek kelime. İlk harfi otomatik açık gelir.
/// </summary>
public sealed class TargetWord : IEquatable<TargetWord>
{
    public string Value { get; }
    public int Length => Value.Length;
    public char FirstLetter => Value[0];          // Sistem tarafından otomatik açılan harf
    public int MaxAttempts => Length + 1;          // Kelime uzunluğu + 1 hak

    private static readonly System.Text.RegularExpressions.Regex ValidPattern =
        new(@"^[a-zA-ZğüşıöçĞÜŞİÖÇ]{3,10}$",
            System.Text.RegularExpressions.RegexOptions.Compiled);

    public TargetWord(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException("Kelime boş olamaz.");

        var upper = value.Trim().ToUpperInvariant();

        if (!ValidPattern.IsMatch(value.Trim()))
            throw new ArgumentException($"Geçersiz kelime formatı: '{value}'. 3-10 harf olmalı.");

        Value = upper;
    }

    public bool Equals(TargetWord? other) => other is not null && Value == other.Value;
    public override bool Equals(object? obj) => obj is TargetWord t && Equals(t);
    public override int GetHashCode() => Value.GetHashCode();
    public override string ToString() => Value;
}

// ── Score ─────────────────────────────────────────────────
public sealed class Score : IEquatable<Score>
{
    public int Value { get; }

    public static readonly Score Zero = new(0);

    public static Score ForGuess(LetterState[] states)
    {
        var points = states.Sum(s => s switch
        {
            LetterState.Correct       => 10,
            LetterState.WrongPosition => 5,
            _                         => 0
        });
        return new Score(points);
    }

    public Score(int value)
    {
        if (value < 0) throw new ArgumentException("Skor negatif olamaz.");
        Value = value;
    }

    public Score Add(Score other) => new(Value + other.Value);
    public Score Subtract(int amount) => new(Math.Max(0, Value - amount));

    public bool Equals(Score? other) => other is not null && Value == other.Value;
    public override bool Equals(object? obj) => obj is Score s && Equals(s);
    public override int GetHashCode() => Value.GetHashCode();
    public override string ToString() => Value.ToString();

    public static Score operator +(Score a, Score b) => a.Add(b);
}

// ── GuessResult ───────────────────────────────────────────
public sealed record GuessResult(
    LetterState[] LetterStates,
    Score         ScoreEarned,
    int           RemainingAttempts,
    bool          IsCorrect,
    bool          IsGameOver
);
