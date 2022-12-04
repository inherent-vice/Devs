# 1 ~ 10 사이의 어떤 수로도 나누어 떨어지는 가장 작은 수는 2520입니다.

# 그러면 1 ~ 20 사이의 어떤 수로도 나누어 떨어지는 가장 작은 수는 얼마입니까?

prime = []
a = 1

for n in range(2, 20):
    for x in range(2, n):
        if n % x == 0:
            break
    else:
        prime.append(n)

for i in prime:
    a = i * a

x = a

while True:
    x += a
    b = [x % i for i in range(1, 21)]
    if b == [0] * 20:
        break

print(x)
