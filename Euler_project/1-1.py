# 10보다 작은 자연수 중에서 3 또는 5의 배수는 3, 5, 6, 9 이고, 이것을 모두 더하면 23입니다.
# 1000보다 작은 자연수 중에서 3 또는 5의 배수를 모두 더하면 얼마일까요?


def multiple(n: int, m: int) -> int:
    max_idx = (m - 1) // n
    sum_idx = max_idx * (max_idx + 1) // 2
    return n * sum_idx


print(multiple(3, 1000) + multiple(5, 1000) - multiple(15, 1000))
