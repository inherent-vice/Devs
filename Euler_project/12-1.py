# 1부터 n까지의 자연수를 차례로 더하여 구해진 값을 삼각수라고 합니다.
# 예를 들어 7번째 삼각수는 1 + 2 + 3 + 4 + 5 + 6 + 7 = 28이 됩니다.
# 이런 식으로 삼각수를 구해 나가면 다음과 같습니다.

# 1, 3, 6, 10, 15, 21, 28, 36, 45, 55, ...
# 이 삼각수들의 약수를 구해 봅시다.

#  1: 1
#  3: 1, 3
#  6: 1, 2, 3, 6
# 10: 1, 2, 5, 10
# 15: 1, 3, 5, 15
# 21: 1, 3, 7, 21
# 28: 1, 2, 4, 7, 14, 28
# 위에서 보듯이, 5개 이상의 약수를 갖는 첫번째 삼각수는 28입니다.

# 그러면 500개 이상의 약수를 갖는 가장 작은 삼각수는 얼마입니까?

# from math import isqrt


# tri_num = 0
# a = []
# i = 1
# while len(a) < 1000:
#     tri_num = (i * (i + 1)) / 2
#     i += 1
#     a = []
#     for n in range(1, isqrt(tri_num)):
#         if tri_num % n == 0:
#             a.append(n)
#         if len(a) == 500:
#             print(tri_num)
#             print(a)
#             break

import math

# d = 2
# i = 7
# tri_num = (i * (i + 1)) / 2

# while d <= math.isqrt(tri_num):
#     tri_num = (i * (i + 1)) / 2
#     if tri_num % d != 0:
#         d += 1
#     else:
#         print(d)
#         tri_num //= d
#     i += 1

# # if tri_num > 1:
# #     print(tri_num)

# x = 2
# i = 7
# a = 1
# fac_list = []

# while len(fac_list) <= 10:
#     a = 1
#     tri_num = (i * (i + 1)) / 2
#     fac_list = []
#     a_list = []
#     while x <= tri_num:
#         if tri_num % x == 0:
#             fac_list.append(x)
#             tri_num = tri_num / x
#         else:
#             x += 1

#     # set_fac_list = set(fac_list)
#     # cnt_fac_list = list(set_fac_list)

#     # for prime in cnt_fac_list:
#     #     a_list.append(fac_list.count(prime) + 1)
#     #     for i in a_list:
#     #         a *= i
#     #         if a == 500:
#     #             print(tri_num)
#     i += 1
# print(fac_list)

# # fac_list = []
# # x = 2
# # i = 7
# # y = (i * (i + 1)) / 2
# # while x <= y:
# #     if y % x == 0:
# #         fac_list.append(x)
# #         y = y / x
# #     else:
# #         x += 1

# # print(fac_list)
