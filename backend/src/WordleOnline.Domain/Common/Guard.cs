namespace WordleOnline.Domain.Common;

public static class Guard
{
    public static void AgainstNullOrEmpty(string value, string paramName)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException($"'{paramName}' boş olamaz.", paramName);
    }

    public static void AgainstNegative(int value, string paramName)
    {
        if (value < 0)
            throw new ArgumentException($"'{paramName}' negatif olamaz.", paramName);
    }

    public static void AgainstNull<T>(T value, string paramName) where T : class
    {
        if (value is null)
            throw new ArgumentNullException(paramName);
    }

    public static void AgainstOutOfRange(int value, int min, int max, string paramName)
    {
        if (value < min || value > max)
            throw new ArgumentOutOfRangeException(paramName, $"'{paramName}' {min}-{max} arasında olmalıdır.");
    }
}
