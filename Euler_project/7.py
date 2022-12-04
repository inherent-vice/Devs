# 소수를 크기 순으로 나열하면 2, 3, 5, 7, 11, 13, ... 과 같이 됩니다.

# 이 때 10,001번째의 소수를 구하세요.

prime = []
n = 2
i = 0
for n in range(900, 2000 + 1):
    for x in range(2, n):
        if n % x == 0:
            break
    else:
        prime.append(n)

print(prime)

a = (10 ** 996) % 997
print(a)
