// Application/Common/Interfaces/ICacheServiceExtensions.cs
// Distributed Lock için ek metotlar

namespace WordleOnline.Application.Common.Interfaces;

/// <summary>
/// Race condition önlemi için distributed lock metotları.
/// ICacheService'e ayrı interface olarak eklenir — ISP prensibine uygun.
/// </summary>
public interface IDistributedLockService
{
    /// <summary>
    /// Redis SET NX EX ile atomik lock alma.
    /// Returns true if lock acquired.
    /// </summary>
    Task<bool> TryAcquireLockAsync(string key, TimeSpan expiry, CancellationToken ct = default);
    Task ReleaseLockAsync(string key, CancellationToken ct = default);
}
