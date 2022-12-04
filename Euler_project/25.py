# 피보나치 수열은 아래와 같은 점화식으로 정의됩니다.

# Fn = Fn-1 + Fn-2  (단, F1 = 1, F2 = 1).
# 이에 따라 수열을 12번째 항까지 차례대로 계산하면 다음과 같습니다.

# F1 = 1
# F2 = 1
# F3 = 2
# F4 = 3
# F5 = 5
# F6 = 8
# F7 = 13
# F8 = 21
# F9 = 34
# F10 = 55
# F11 = 89
# F12 = 144
# 수열의 값은 F12에서 처음으로 3자리가 됩니다.

# 피보나치 수열에서 값이 처음으로 1000자리가 되는 것은 몇번째 항입니까?


def fibo(n):
    result = []
    a, b = 1, 2
    for i in range(n):
        result.append(a)
        a, b = b, a + b
    # print(result)
    for i in result:
        if len(str(i)) == 1000:
            print(result.index(i) + 2)

    return result


fibo(5000)
