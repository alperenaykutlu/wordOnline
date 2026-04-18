using WordleOnline.Domain.Common;
using WordleOnline.Domain.Game.Enums;
using WordleOnline.Domain.Game.ValueObjects;

namespace WordleOnline.Domain.Game.Entities;

/// <summary>
/// Bir oyuncunun tek bir tahmin denemesini temsil eder.
/// Immutable — oluşturulduktan sonra değiştirilemez.
/// </summary>
public sealed class WordGuess : Entity
{
    public Guid        PlayerId      { get; private set; }
    public string      GuessWord     { get; private set; } = string.Empty;
    public LetterState[] LetterStates { get; private set; } = [];
    public Score       ScoreEarned   { get; private set; } = Score.Zero;
    public int         AttemptNumber { get; private set; }
    public DateTime    GuessedAt     { get; private set; }

    private WordGuess() { }

    public static WordGuess Create(
        Guid playerId,
        string guessWord,
        LetterState[] letterStates,
        Score scoreEarned,
        int attemptNumber)
    {
        return new WordGuess
        {
            Id           = Guid.NewGuid(),
            PlayerId     = playerId,
            GuessWord    = guessWord.ToUpperInvariant(),
            LetterStates = letterStates,
            ScoreEarned  = scoreEarned,
            AttemptNumber= attemptNumber,
            GuessedAt    = DateTime.UtcNow
        };
    }

    public bool IsCorrect => LetterStates.All(s => s == LetterState.Correct);
}
