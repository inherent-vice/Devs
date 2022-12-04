# 앞에서부터 읽을 때나 뒤에서부터 읽을 때나 모양이 같은 수를 대칭수(palindrome)라고 부릅니다.

# 두 자리 수를 곱해 만들 수 있는 대칭수 중 가장 큰 수는 9009 (= 91 × 99) 입니다.

# 세 자리 수를 곱해 만들 수 있는 가장 큰 대칭수는 얼마입니까?

num_list = []
for i in range(100, 1000):
    for x in range(100, 1000):
        num = x * i
        if num == int(str(num)[::-1]):
            num_list.append(num)

print(max(num_list))
