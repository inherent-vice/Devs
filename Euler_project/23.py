# 자신을 제외한 약수(진약수)를 모두 더하면 자기 자신이 되는 수를 완전수라고 합니다.
# 예를 들어 28은 1 + 2 + 4 + 7 + 14 = 28 이므로 완전수입니다.
# 또, 진약수의 합이 자신보다 작으면 부족수, 자신보다 클 때는 과잉수라고 합니다.

# 12는 1 + 2 + 3 + 4 + 6 = 16 > 12 로서 과잉수 중에서는 가장 작습니다.
# 따라서 과잉수 두 개의 합으로 나타낼 수 있는 수 중 가장 작은 수는 24 (= 12 + 12) 입니다.

# 해석학적인 방법을 사용하면, 28123을 넘는 모든 정수는 두 과잉수의 합으로 표현 가능함을 보일 수가 있습니다.
# 두 과잉수의 합으로 나타낼 수 없는 가장 큰 수는 실제로는 이 한계값보다 작지만, 해석학적인 방법으로는 더 이상 이 한계값을 낮출 수 없다고 합니다.

# 그렇다면, 과잉수 두 개의 합으로 나타낼 수 없는 모든 양의 정수의 합은 얼마입니까?

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


over = []
for i in range(2, 28123 + 1):
    if sum_div(i) > i:
        over.append(i)

over_sum = []
for i in range(len(over)):
    for j in range(len(over)):
        over_sum.append(over[i] + over[j])

over_sum = set(over_sum)
over_sum = list(over_sum)

int_sum = 0
for i in range(1, 28123 + 1):
    int_sum += i

print(int_sum - sum(over_sum[: over_sum.index(28123) + 1]))
