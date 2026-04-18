using System.Text.RegularExpressions;

namespace WordleOnline.Domain.Identity.ValueObjects;

public sealed class Username : IEquatable<Username>
{
    public string Value { get; }

    private static readonly Regex ValidPattern =
        new(@"^[a-zA-Z0-9_\u00C0-\u024F]{3,20}$", RegexOptions.Compiled);

    public Username(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException("Kullanıcı adı boş olamaz.");

        var trimmed = value.Trim();

        if (!ValidPattern.IsMatch(trimmed))
            throw new ArgumentException(
                "Kullanıcı adı 3-20 karakter, sadece harf/rakam/alt çizgi içerebilir.");

        Value = trimmed;
    }

    public bool Equals(Username? other) => other is not null && Value == other.Value;
    public override bool Equals(object? obj) => obj is Username u && Equals(u);
    public override int GetHashCode() => Value.GetHashCode();
    public override string ToString() => Value;
}
