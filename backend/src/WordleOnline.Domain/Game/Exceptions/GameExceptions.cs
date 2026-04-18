namespace WordleOnline.Domain.Game.Exceptions;

public class GameNotInProgressException : Exception
{
    public GameNotInProgressException(Guid roomId)
        : base($"Oyun odası aktif değil: {roomId}") { }
}

public class InvalidWordLengthException : Exception
{
    public InvalidWordLengthException(int expected, int actual)
        : base($"Tahmin kelimesi {expected} harf olmalı, {actual} girildi.") { }
}

public class NoAttemptsRemainingException : Exception
{
    public NoAttemptsRemainingException(Guid playerId)
        : base($"Oyuncunun ({playerId}) tahmin hakkı kalmadı.") { }
}

public class PlayerNotInRoomException : Exception
{
    public PlayerNotInRoomException(Guid playerId, Guid roomId)
        : base($"Oyuncu {playerId}, oda {roomId} içinde değil.") { }
}

public class WordAlreadyAssignedException : Exception
{
    public WordAlreadyAssignedException(Guid playerId)
        : base($"Oyuncu {playerId} zaten kelime atamış.") { }
}

public class RoundNotActiveException : Exception
{
    public RoundNotActiveException(int round)
        : base($"Raunt {round} aktif değil.") { }
}
