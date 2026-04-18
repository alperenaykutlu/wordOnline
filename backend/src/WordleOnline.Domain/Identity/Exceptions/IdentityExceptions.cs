namespace WordleOnline.Domain.Identity.Exceptions;

public class UsernameChangeLimitExceededException : Exception
{
    public UsernameChangeLimitExceededException(Guid userId, int limit)
        : base($"Kullanıcı {userId} maksimum kullanıcı adı değişim hakkını ({limit}) kullandı.") { }
}

public class UserNotFoundException : Exception
{
    public UserNotFoundException(Guid userId)
        : base($"Kullanıcı bulunamadı: {userId}") { }

    public UserNotFoundException(string googleId)
        : base($"Google ID ile kullanıcı bulunamadı: {googleId}") { }
}
