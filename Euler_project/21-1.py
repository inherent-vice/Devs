# n의 약수들 중에서 자신을 제외한 것의 합을 d(n)으로 정의했을 때,
# 서로 다른 두 정수 a, b에 대하여 d(a) = b 이고 d(b) = a 이면
# a, b는 친화쌍이라 하고 a와 b를 각각 친화수(우애수)라고 합니다.

# 예를 들어 220의 약수는 자신을 제외하면 1, 2, 4, 5, 10, 11, 20, 22, 44, 55, 110 이므로 그 합은 d(220) = 284 입니다.
# 또 284의 약수는 자신을 제외하면 1, 2, 4, 71, 142 이므로 d(284) = 220 입니다.
# 따라서 220과 284는 친화쌍이 됩니다.

# 10000 이하의 친화수들을 모두 찾아서 그 합을 구하세요.

import math


def sum_div(n):
    div_list = []
    for i in range(1, math.isqrt(n) + 1):
        if n % i == 0:
            div_list.append(i)
            if (i ** 2) != n:
                div_list.append(n // i)
    div_list.remove(n)
    return sum(div_list)


def amicable(n):
    ami_list = []
    for i in range(2, n + 1):
        a = sum_div(i)
        if a != i and sum_div(a) == i:
            ami_list.append(a)
            ami_list.append(i)
    return ami_list


print(sum(amicable(10000)) / 2)
