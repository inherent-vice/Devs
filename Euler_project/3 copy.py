# 어떤 수를 소수의 곱으로만 나타내는 것을 소인수분해라 하고, 이 소수들을 그 수의 소인수라고 합니다.
# 예를 들면 13195의 소인수는 5, 7, 13, 29 입니다.

# 600851475143의 소인수 중에서 가장 큰 수를 구하세요.

# for n in range(2,10):
#     for x in range(2,n):
#         if n % x == 0:
#             print(n, 'equals', x, '*', n//x)
#             break
#     else:
#         # loop fell throgh without finding a factor
#         print(n, 'is a prime number')

# prime = []

# for n in range(2,10):
#     for x in range(2,n):
#         if n % x == 0:
#             print(n, 'equals', x, '*', n//x)
#             break
#     else:
#         # loop fell throgh without finding a factor
#         print(n, 'is a prime number')


# def prime_factor(n):

prime = []
for x in range(2, 28):
    if 28 % x == 0:
        prime.append(x)

print(prime)
