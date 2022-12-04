# 2**15 = 32768 의 각 자릿수를 더하면 3 + 2 + 7 + 6 + 8 = 26 입니다.
# 2**1000의 각 자릿수를 모두 더하면 얼마입니까?


def p2s(n):
    a = 2 ** n
    x = [int(b) for b in str(a)]
    return sum(x)


# list = []
# for i in range(1, 1000):
#     list.append(p2s(i))

# print(list)
