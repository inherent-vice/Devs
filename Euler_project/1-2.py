# 10보다 작은 자연수 중에서 3 또는 5의 배수는 3, 5, 6, 9 이고, 이것을 모두 더하면 23입니다.
# 1000보다 작은 자연수 중에서 3 또는 5의 배수를 모두 더하면 얼마일까요?


from datetime import datetime


def multiple(n: int, m: int) -> int:
    max_idx = (m - 1) // n
    sum_idx = max_idx * (max_idx + 1) // 2
    return n * sum_idx


def _multiple(n: int, m: int) -> int:
    result = []
    i = 1

    while n * i < m:
        result.append(n * i)
        i += 1

    sum_result = sum(result)
    return sum_result


print("m을 1,000,000으로 고정 n을 1부터 1,000,000까지 순차적으로 바꾸며 계산")

now = datetime.now()
for n in range(1, 1000000):
    _multiple(n, 1000000)

diff = datetime.now() - now
print(f"기존 소요시간 {diff}")

now = datetime.now()
for n in range(1, 1000000):
    multiple(n, 1000000)

diff = datetime.now() - now
print(f"신규 소요시간 {diff}")
