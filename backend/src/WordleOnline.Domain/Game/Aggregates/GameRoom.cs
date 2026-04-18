using WordleOnline.Domain.Common;
using WordleOnline.Domain.Game.Entities;
using WordleOnline.Domain.Game.Enums;
using WordleOnline.Domain.Game.Events;
using WordleOnline.Domain.Game.Exceptions;
using WordleOnline.Domain.Game.ValueObjects;

namespace WordleOnline.Domain.Game.Aggregates;

/// <summary>
/// Oyun odasının tüm mantığını yöneten Aggregate Root.
///
/// Solo:     Tek oyuncu, kelime uzunluğu+1 hak, 60 saniye.
/// SameWord: 2 oyuncu, aynı kelimeyi bulmaya çalışır, 5 raunt.
/// GiveWord: 2 oyuncu birbirine kelime verir, rakibin ekranını izleyebilir, 5 raunt.
/// </summary>
public sealed class GameRoom : AggregateRoot
{
    // ── Sabitler ─────────────────────────────────────────
    public const int EcurieRoundCount = 5;
    public const int LossPenaltyPoints = 20;
    public const int MaxTimeBonusPoints = 20;

    // ── State ─────────────────────────────────────────────
    public GameMode   Mode          { get; private set; }
    public GameStatus Status        { get; private set; }
    public int        CurrentRound  { get; private set; }
    public TimeSpan   TimeLimit     { get; private set; }
    public DateTime?  RoundStartedAt{ get; private set; }

    // Solo + SameWord: sistem belirler. GiveWord: atama sonrası belirlenir.
    private TargetWord? _targetWord;
    public string? RevealedFirstLetter =>
        _targetWord is not null ? _targetWord.FirstLetter.ToString() : null;

    private readonly List<PlayerSession> _players = new();
    public IReadOnlyList<PlayerSession> Players => _players.AsReadOnly();

    private GameRoom() { }

    // ── Factory Methods ───────────────────────────────────

    public static GameRoom CreateSolo(Guid playerId, string username, string targetWord)
    {
        var word = new TargetWord(targetWord);
        var room = new GameRoom
        {
            Id           = Guid.NewGuid(),
            Mode         = GameMode.Solo,
            Status       = GameStatus.InProgress,
            CurrentRound = 1,
            TimeLimit    = TimeSpan.FromSeconds(60),
            _targetWord  = word,
            RoundStartedAt = DateTime.UtcNow
        };

        room._players.Add(PlayerSession.Create(playerId, username, word.MaxAttempts));
        room.AddDomainEvent(new GameRoomCreatedEvent(room.Id, GameMode.Solo));
        room.AddDomainEvent(new GameStartedEvent(room.Id, 1));
        return room;
    }

    public static GameRoom CreateSameWord(
        Guid player1Id, string username1,
        Guid player2Id, string username2,
        string targetWord)
    {
        var word = new TargetWord(targetWord);
        var room = new GameRoom
        {
            Id           = Guid.NewGuid(),
            Mode         = GameMode.SameWord,
            Status       = GameStatus.InProgress,
            CurrentRound = 1,
            TimeLimit    = TimeSpan.FromSeconds(90),
            _targetWord  = word,
            RoundStartedAt = DateTime.UtcNow
        };

        room._players.Add(PlayerSession.Create(player1Id, username1, word.MaxAttempts));
        room._players.Add(PlayerSession.Create(player2Id, username2, word.MaxAttempts));
        room.AddDomainEvent(new GameRoomCreatedEvent(room.Id, GameMode.SameWord));
        room.AddDomainEvent(new GameStartedEvent(room.Id, 1));
        return room;
    }

    public static GameRoom CreateGiveWord(
        Guid player1Id, string username1,
        Guid player2Id, string username2)
    {
        var room = new GameRoom
        {
            Id           = Guid.NewGuid(),
            Mode         = GameMode.GiveWord,
            Status       = GameStatus.WaitingForWords,  // önce kelime ataması
            CurrentRound = 1,
            TimeLimit    = TimeSpan.FromSeconds(90),
        };

        // MaxAttempts kelime atandıktan sonra ayarlanacak, geçici 7
        room._players.Add(PlayerSession.Create(player1Id, username1, 7));
        room._players.Add(PlayerSession.Create(player2Id, username2, 7));
        room.AddDomainEvent(new GameRoomCreatedEvent(room.Id, GameMode.GiveWord));
        return room;
    }

    // ── Word Assignment (GiveWord modu) ───────────────────

    /// <summary>
    /// GiveWord: her oyuncu rakibine bir kelime atar.
    /// Her iki oyuncu da atama yapınca oyun başlar.
    /// </summary>
    public void AssignWordToOpponent(Guid assignerPlayerId, string wordValue)
    {
        if (Mode != GameMode.GiveWord)
            throw new InvalidOperationException("Bu mod için kelime ataması gerekli değil.");

        if (Status != GameStatus.WaitingForWords)
            throw new InvalidOperationException("Kelime atama aşaması aktif değil.");

        var assigner = GetSession(assignerPlayerId);
        var target   = GetOpponentSession(assignerPlayerId);
        var word     = new TargetWord(wordValue);

        assigner.AssignWordToOpponent(word);
        AddDomainEvent(new WordAssignedEvent(Id, assignerPlayerId, target.PlayerId));

        // Her iki oyuncu da kelime atadıysa oyunu başlat
        if (_players.All(p => p.AssignedWord is not null))
        {
            Status         = GameStatus.InProgress;
            RoundStartedAt = DateTime.UtcNow;
            AddDomainEvent(new GameStartedEvent(Id, CurrentRound));
        }
    }

    // ── Guess Evaluation ─────────────────────────────────

    /// <summary>
    /// Oyuncunun tahminini değerlendirir.
    /// GiveWord modunda rakibin atadığı kelime hedef alınır.
    /// Bu event SignalR üzerinden rakibe anlık iletilir.
    /// </summary>
    public GuessResult EvaluateGuess(Guid playerId, string guessWord)
    {
        if (Status != GameStatus.InProgress)
            throw new GameNotInProgressException(Id);

        var session    = GetSession(playerId);
        var targetWord = GetTargetWordFor(playerId);

        if (guessWord.Length != targetWord.Length)
            throw new InvalidWordLengthException(targetWord.Length, guessWord.Length);

        var letterStates = CalculateLetterStates(guessWord.ToUpperInvariant(), targetWord.Value);
        var score        = Score.ForGuess(letterStates);
        var guess        = session.RecordGuess(guessWord, letterStates, score);

        bool isCorrect  = guess.IsCorrect;
        bool isGameOver = isCorrect || session.RemainingAttempts == 0;

        if (isCorrect)
        {
            var timeBonus = CalculateTimeBonus();
            session.ApplyTimeBonus(timeBonus);
            session.MarkAsWinner();
            AddDomainEvent(new PlayerWonRoundEvent(Id, playerId, CurrentRound,
                session.TotalScore.Value));
        }
        else if (session.RemainingAttempts == 0)
        {
            session.MarkAsEliminated();
            AddDomainEvent(new PlayerLostRoundEvent(Id, playerId, CurrentRound));
        }

        // Her tahmin sonrası domain event — GiveWord modunda rakip anlık görür
        AddDomainEvent(new PlayerGuessedEvent(
            Id, playerId, guessWord, letterStates,
            score.Value, session.RemainingAttempts, isCorrect, CurrentRound));

        if (isGameOver && Mode != GameMode.Solo)
            TryAdvanceOrComplete();

        if (isGameOver && Mode == GameMode.Solo)
            Status = GameStatus.Completed;

        return new GuessResult(letterStates, score, session.RemainingAttempts, isCorrect, isGameOver);
    }

    // ── Round / Game Completion ───────────────────────────

    private void TryAdvanceOrComplete()
    {
        bool allDone = _players.All(p => p.IsWinner || p.IsEliminated);
        if (!allDone) return;

        if (CurrentRound < EcurieRoundCount)
        {
            CurrentRound++;
            ResetForNextRound();
            AddDomainEvent(new GameStartedEvent(Id, CurrentRound));
        }
        else
        {
            CompleteGame();
        }
    }

    private void ResetForNextRound()
    {
        Status         = Mode == GameMode.GiveWord
            ? GameStatus.WaitingForWords
            : GameStatus.InProgress;

        RoundStartedAt = DateTime.UtcNow;

        // PlayerSession'ları yeni raunt için sıfırla (yeni kelime uzunluğu henüz bilinmiyor)
        // Gerçek uygulamada her raunt için yeni session veya reset metodu tercih edilebilir.
    }

    private void CompleteGame()
    {
        Status = GameStatus.Completed;
        var winnerId = _players
            .OrderByDescending(p => p.TotalScore.Value)
            .First().PlayerId;

        var finalScores = _players.ToDictionary(
            p => p.PlayerId,
            p => p.TotalScore.Value);

        AddDomainEvent(new GameCompletedEvent(Id, winnerId, finalScores));
    }

    // ── Letter State Algorithm ────────────────────────────

    /// <summary>
    /// İki geçişli algoritma:
    /// Pass 1 — Doğru konum (Correct/Yeşil)
    /// Pass 2 — Yanlış konum (WrongPosition/Sarı) veya bulunamadı (NotFound/Gri)
    /// Duplicate harf desteği dahil.
    /// </summary>
    private static LetterState[] CalculateLetterStates(string guess, string target)
    {
        var states      = new LetterState[guess.Length];
        var usedIndices = new bool[target.Length];

        // Pass 1: Correct position — Yeşil
        for (int i = 0; i < guess.Length; i++)
        {
            if (guess[i] == target[i])
            {
                states[i]      = LetterState.Correct;
                usedIndices[i] = true;
            }
        }

        // Pass 2: Wrong position / Not found
        for (int i = 0; i < guess.Length; i++)
        {
            if (states[i] == LetterState.Correct) continue;

            bool found = false;
            for (int j = 0; j < target.Length; j++)
            {
                if (!usedIndices[j] && guess[i] == target[j])
                {
                    states[i]      = LetterState.WrongPosition;
                    usedIndices[j] = true;
                    found          = true;
                    break;
                }
            }
            if (!found) states[i] = LetterState.NotFound;
        }

        return states;
    }

    // ── Time Bonus ────────────────────────────────────────

    private int CalculateTimeBonus()
    {
        if (RoundStartedAt is null) return 0;
        var elapsed   = DateTime.UtcNow - RoundStartedAt.Value;
        var remaining = TimeLimit - elapsed;
        if (remaining <= TimeSpan.Zero) return 0;

        var ratio = remaining.TotalSeconds / TimeLimit.TotalSeconds;
        return (int)(ratio * MaxTimeBonusPoints);
    }

    // ── Helpers ───────────────────────────────────────────

    private PlayerSession GetSession(Guid playerId)
        => _players.FirstOrDefault(p => p.PlayerId == playerId)
           ?? throw new PlayerNotInRoomException(playerId, Id);

    private PlayerSession GetOpponentSession(Guid playerId)
        => _players.FirstOrDefault(p => p.PlayerId != playerId)
           ?? throw new PlayerNotInRoomException(playerId, Id);

    /// <summary>
    /// GiveWord modunda hedef kelime, rakibin atadığı kelimedir.
    /// </summary>
    private TargetWord GetTargetWordFor(Guid playerId)
    {
        if (Mode == GameMode.GiveWord)
        {
            var opponent = GetOpponentSession(playerId);
            return opponent.AssignedWord
                   ?? throw new InvalidOperationException("Rakip henüz kelime atamamış.");
        }

        return _targetWord
               ?? throw new InvalidOperationException("Hedef kelime belirlenmemiş.");
    }
}
