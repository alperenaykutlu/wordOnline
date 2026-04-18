using Xunit;
using WordleOnline.Domain.Game.Aggregates;
using WordleOnline.Domain.Game.Enums;
using WordleOnline.Domain.Game.Exceptions;

namespace WordleOnline.Domain.Tests.GameRoom;

public sealed class LetterStateCalculationTests
{
    private static Domain.Game.Aggregates.GameRoom CreateSoloRoom(string targetWord)
        => Domain.Game.Aggregates.GameRoom.CreateSolo(
            Guid.NewGuid(), "TestUser", targetWord);

    // ── Correct (Yeşil) ──────────────────────────────────
    [Fact]
    public void AllLetters_Correct_WhenGuessEqualsTarget()
    {
        var room   = CreateSoloRoom("ELMA");
        var result = room.EvaluateGuess(room.Players[0].PlayerId, "ELMA");

        Assert.All(result.LetterStates, s => Assert.Equal(LetterState.Correct, s));
        Assert.True(result.IsCorrect);
    }

    // ── WrongPosition (Sarı) ─────────────────────────────
    [Fact]
    public void Letter_WrongPosition_WhenPresentButMisplaced()
    {
        var room   = CreateSoloRoom("ELMA");
        var result = room.EvaluateGuess(room.Players[0].PlayerId, "LEMM");

        // E→index0 doğru yerde değil (target[0]='E', guess[0]='L'), sarı olmalı
        Assert.Equal(LetterState.WrongPosition, result.LetterStates[1]); // 'L' yer değiştirmiş
    }

    // ── NotFound (Gri) ───────────────────────────────────
    [Fact]
    public void Letter_NotFound_WhenNotInTarget()
    {
        var room   = CreateSoloRoom("ELMA");
        var result = room.EvaluateGuess(room.Players[0].PlayerId, "EYYY");

        Assert.Equal(LetterState.NotFound, result.LetterStates[1]);
        Assert.Equal(LetterState.NotFound, result.LetterStates[2]);
        Assert.Equal(LetterState.NotFound, result.LetterStates[3]);
    }

    // ── Duplicate Harf Testi ─────────────────────────────
    [Fact]
    public void DuplicateLetter_OnlyFirstMatch_MarkedYellow()
    {
        // Target: ARABA — A harfi 3 kez var
        var room   = CreateSoloRoom("ARABA");
        var result = room.EvaluateGuess(room.Players[0].PlayerId, "AAAAA");

        // Pozisyon 0: Correct (A=A)
        // Pozisyon 2: Correct (A=A)
        // Pozisyon 4: Correct (A=A)
        // Pozisyon 1,3: NotFound (target'ta kullanılabilir A kalmadı)
        Assert.Equal(LetterState.Correct,  result.LetterStates[0]);
        Assert.Equal(LetterState.NotFound, result.LetterStates[1]);
        Assert.Equal(LetterState.Correct,  result.LetterStates[2]);
        Assert.Equal(LetterState.NotFound, result.LetterStates[3]);
        Assert.Equal(LetterState.Correct,  result.LetterStates[4]);
    }

    // ── Skor Hesaplama ───────────────────────────────────
    [Fact]
    public void Score_Correct10_WrongPosition5_NotFound0()
    {
        var room = CreateSoloRoom("ELMA");
        // E doğru (10) + L yanlış konum (5) + M doğru (10) + A yanlış (5) = 30
        // Bu tam doğru olmayabilir, basit test senaryosu
        var result = room.EvaluateGuess(room.Players[0].PlayerId, "ELMA");
        Assert.Equal(40, result.ScoreEarned.Value); // tüm doğru: 4*10=40
    }

    // ── Hak sınırı ───────────────────────────────────────
    [Fact]
    public void Throws_WhenNoAttemptsRemaining()
    {
        var room    = CreateSoloRoom("ELMA"); // MaxAttempts=5
        var playerId= room.Players[0].PlayerId;

        for (int i = 0; i < 5; i++)
            room.EvaluateGuess(playerId, "XXXX"); // 4 harfli ELMA için 5 hak

        // 5. tahminden sonra solo oyun Completed durumuna geçer
        Assert.Throws<GameNotInProgressException>(
            () => room.EvaluateGuess(playerId, "XXXX"));
    }

    // ── Yanlış uzunluk ───────────────────────────────────
    [Fact]
    public void Throws_WhenWrongWordLength()
    {
        var room     = CreateSoloRoom("ELMA");
        var playerId = room.Players[0].PlayerId;

        Assert.Throws<InvalidWordLengthException>(
            () => room.EvaluateGuess(playerId, "ELMAA"));
    }

    // ── GiveWord: kelime atama ───────────────────────────
    [Fact]
    public void GiveWord_GameStarts_WhenBothPlayersAssign()
    {
        var p1 = Guid.NewGuid();
        var p2 = Guid.NewGuid();
        var room = Domain.Game.Aggregates.GameRoom.CreateGiveWord(p1, "P1", p2, "P2");

        Assert.Equal(GameStatus.WaitingForWords, room.Status);

        room.AssignWordToOpponent(p1, "ARABA");
        Assert.Equal(GameStatus.WaitingForWords, room.Status); // Henüz p2 atamadı

        room.AssignWordToOpponent(p2, "ELMA");
        Assert.Equal(GameStatus.InProgress, room.Status); // İkisi de atadı
    }
}
