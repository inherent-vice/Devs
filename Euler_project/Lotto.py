import random


def lotto(n):
    lotto_list = []
    for i in range(n):
        a = random.sample(range(1, 45 + 1), 6)
        lotto_list = lotto_list + a

    cnt_list = []
    for i in range(1, 45 + 1):
        cnt_list.append(lotto_list.count(i))
    return max(cnt_list) - min(cnt_list)


def maxmin_lotto(n):
    s = 0
    for i in range(n):
        if lotto(1008) >= 52:
            s += 1
    return s / n


print(maxmin_lotto(1000))
