# 어떤 대상을 순서에 따라 배열한 것을 순열이라고 합니다. 예를 들어 3124는 숫자 1, 2, 3, 4로 만들 수 있는 순열 중 하나입니다.

# 이렇게 만들 수 있는 모든 순열을 숫자나 문자 순으로 늘어놓은 것을 사전식(lexicographic) 순서라고 합니다.
# 0, 1, 2로 만들 수 있는 사전식 순열은 다음과 같습니다.

# 012   021   102   120   201   210

# 0, 1, 2, 3, 4, 5, 6, 7, 8, 9로 만들 수 있는 사전식 순열에서 1,000,000번째는 무엇입니까?

import itertools as it

for index, n in enumerate(it.permutations(range(9 + 1)), start=1):
    if index == 1000000:
        print(n)
        break


def fac(n):
    x = 1
    for i in range(1, n + 1):
        x *= i
    return x


a = [n for n in range(9 + 1)]
b = ""
n = 1000000
for i in range(9, 0 - 1, -1):
    j = 0
    while j * fac(i) < n:
        j += 1
    b += str(a[j - 1])
    del a[j - 1]
    n -= (j - 1) * fac(i)

print(b)


# def permutations(iterable, r=None):
#     # permutations('ABCD', 2) --> AB AC AD BA BC BD CA CB CD DA DB DC
#     # permutations(range(3)) --> 012 021 102 120 201 210
#     pool = tuple(iterable)
#     n = len(pool)
#     r = n if r is None else r
#     if r > n:
#         return
#     indices = list(range(n))
#     cycles = list(range(n, n - r, -1))
#     yield tuple(pool[i] for i in indices[:r])
#     while n:
#         for i in reversed(range(r)):
#             cycles[i] -= 1
#             if cycles[i] == 0:
#                 indices[i:] = indices[i + 1 :] + indices[i : i + 1]
#                 cycles[i] = n - i
#             else:
#                 j = cycles[i]
#                 indices[i], indices[-j] = indices[-j], indices[i]
#                 yield tuple(pool[i] for i in indices[:r])
#                 break
#         else:
#             return
