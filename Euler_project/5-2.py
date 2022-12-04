# 1 ~ 10 사이의 어떤 수로도 나누어 떨어지는 가장 작은 수는 2520입니다.

# 그러면 1 ~ 20 사이의 어떤 수로도 나누어 떨어지는 가장 작은 수는 얼마입니까?

import math


def factorize(n: int) -> dict[int, int]:
    res = {}

    _n = math.isqrt(n)
    for d in range(2, _n + 1):
        if n % d != 0:
            continue

        res = factorize(n // d)
        res[d] = res.get(d, 0) + 1
        return res

    res[n] = 1
    return res


def solve(stt: int, end: int) -> int:
    fact = {}
    for n in range(stt, end + 1):
        f = factorize(n)
        for p, c in f.items():
            if p not in fact:
                fact[p] = 1

            fact[p] = max(c, fact[p])

    res = 1
    for p, c in fact.items():
        res *= p ** c

    return res


if __name__ == "__main__":
    print(solve(1, 20))
