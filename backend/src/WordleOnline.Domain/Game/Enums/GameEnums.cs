namespace WordleOnline.Domain.Game.Enums;

public enum GameMode
{
    Solo      = 0,
    SameWord  = 1,   // Eküri: her iki oyuncu aynı kelimeyi bulur
    GiveWord  = 2    // Eküri: oyuncular birbirine kelime verir, karşılıklı izleme açık
}

public enum GameStatus
{
    WaitingForPlayers = 0,
    WaitingForWords   = 1,   // GiveWord modunda kelime atama aşaması
    InProgress        = 2,
    Completed         = 3,
    Abandoned         = 4
}

public enum LetterState
{
    Pending       = 0,
    Correct       = 1,   // Yeşil  — doğru harf, doğru konum   (+10 puan)
    WrongPosition = 2,   // Sarı   — doğru harf, yanlış konum  (+5 puan)
    NotFound      = 3    // Gri    — harf yok                   (+0 puan)
}

public enum RoundResult
{
    Win  = 0,
    Loss = 1,
    Draw = 2
}
