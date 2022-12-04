# 소수를 크기 순으로 나열하면 2, 3, 5, 7, 11, 13, ... 과 같이 됩니다.

# 이 때 10,001번째의 소수를 구하세요.

prime = []
n = 3
i = 0
while i <= 10001:
    n += 2
    for x in range(3, n):
        if n % x == 0:
            break
    else:
        prime.append(n)
        i += 1

print(prime)
