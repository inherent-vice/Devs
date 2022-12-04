# 10보다 작은 자연수 중에서 3 또는 5의 배수는 3, 5, 6, 9 이고, 이것을 모두 더하면 23입니다.
# 1000보다 작은 자연수 중에서 3 또는 5의 배수를 모두 더하면 얼마일까요?


def multiple(n, m):
    result = []
    i = 1

    while n * i < m:
        result.append(n * i)
        i = i + 1
    sum_result = sum(result)
    return sum_result


print(multiple(3, 1000) + multiple(5, 1000) - multiple(15, 1000))
