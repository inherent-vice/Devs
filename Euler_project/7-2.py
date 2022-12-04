# 소수를 크기 순으로 나열하면 2, 3, 5, 7, 11, 13, ... 과 같이 됩니다.

# 이 때 10,001번째의 소수를 구하세요.

import math


def is_prime(n: int) -> bool:
    if n < 2:
        return False

    _n = math.isqrt(n)
    for d in range(2, _n + 1):
        if n % d == 0:
            return False

    return True


def prime(idx: int, _primes=[2, 3]) -> int:
    idx -= 1
    if idx < len(_primes):
        return _primes[idx]

    p = _primes[-1]
    p_idx = len(_primes) - 1
    while p_idx != idx:
        p += 2
        p_idx += 1
        while not is_prime(p):
            p += 2

        _primes.append(p)

    _primes.append(p)
    return _primes[idx]


if __name__ == "__main__":
    print(prime(10001))
