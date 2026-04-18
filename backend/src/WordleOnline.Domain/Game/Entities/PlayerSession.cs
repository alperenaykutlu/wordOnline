using WordleOnline.Domain.Common;
using WordleOnline.Domain.Game.Entities;
using WordleOnline.Domain.Game.Enums;
using WordleOnline.Domain.Game.Exceptions;
using WordleOnline.Domain.Game.ValueObjects;

namespace WordleOnline.Domain.Game.Entities;

/// <summary>
/// Bir oyuncunun oyun odası içindeki durumunu yönetir.
/// Tahmin listesi, skor ve kalan hakları tutar.
/// </summary>
public sealed class PlayerSession : Entity
{
    public Guid       PlayerId        { get; private set; }
    public string     Username        { get; private set; } = string.Empty;
    public Score      TotalScore      { get; private set; } = Score.Zero;
    public int        RemainingAttempts{ get; private set; }
    public bool       IsWinner        { get; private set; }
    public bool       IsEliminated    { get; private set; }

    /// <summary>
    /// GiveWord modunda bu oyuncunun rakibine verdiği kelime.
    /// </summary>
    public TargetWord? AssignedWord   { get; private set; }

    private readonly List<WordGuess> _guesses = new();
    public IReadOnlyList<WordGuess> Guesses => _guesses.AsReadOnly();

    public int AttemptCount => _guesses.Count;

    private PlayerSession() { }

    public static PlayerSession Create(Guid playerId, string username, int maxAttempts)
    {
        Guard.AgainstNullOrEmpty(username, nameof(username));
        Guard.AgainstNegative(maxAttempts, nameof(maxAttempts));

        return new PlayerSession
        {
            Id                = Guid.NewGuid(),
            PlayerId          = playerId,
            Username          = username,
            TotalScore        = Score.Zero,
            RemainingAttempts = maxAttempts,
            IsWinner          = false,
            IsEliminated      = false
        };
    }

    public WordGuess RecordGuess(
        string guessWord,
        LetterState[] letterStates,
        Score scoreEarned)
    {
        if (RemainingAttempts <= 0)
            throw new NoAttemptsRemainingException(PlayerId);

        var guess = WordGuess.Create(
            PlayerId,
            guessWord,
            letterStates,
            scoreEarned,
            AttemptCount + 1
        );

        _guesses.Add(guess);
        RemainingAttempts--;
        TotalScore = TotalScore + scoreEarned;

        return guess;
    }

    public void MarkAsWinner()
    {
        IsWinner     = true;
        IsEliminated = false;
    }

    public void MarkAsEliminated()
    {
        IsEliminated = true;
        // Kaybeden oyuncu 20 puan kaybeder
        TotalScore = TotalScore.Subtract(20);
    }

    public void AssignWordToOpponent(TargetWord word)
    {
        if (AssignedWord is not null)
            throw new WordAlreadyAssignedException(PlayerId);

        AssignedWord = word;
    }

    public void ApplyTimeBonus(int bonusPoints)
    {
        if (bonusPoints > 0)
            TotalScore = TotalScore + new Score(bonusPoints);
    }
}
