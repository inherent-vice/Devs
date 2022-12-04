# 10 이하의 소수를 모두 더하면 2 + 3 + 5 + 7 = 17 이 됩니다.

# 이백만(2,000,000) 이하 소수의 합은 얼마입니까?


def prime_list(n):
    sieve = [True] * n
    m = int(n ** 0.5)
    for i in range(2, m + 1):
        if sieve[i] == True:
            for j in range(2 * i, n, i):
                sieve[j] = False

    return [i for i in range(2, n) if sieve[i] == True]


print(sum(prime_list(2000000)))
