namespace WordleOnline.Domain.Identity.ValueObjects;

public sealed class GoogleId : IEquatable<GoogleId>
{
    public string Value { get; }

    public GoogleId(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException("Google ID boş olamaz.");

        Value = value.Trim();
    }

    public bool Equals(GoogleId? other) => other is not null && Value == other.Value;
    public override bool Equals(object? obj) => obj is GoogleId g && Equals(g);
    public override int GetHashCode() => Value.GetHashCode();
    public override string ToString() => Value;
}
