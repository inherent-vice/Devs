# 파일명은 “hw1_.py”
# 파일명 예시:hw1_201011111.py
# 4차원의 np.array를 input으로 가지고 4차원의 np.array를 output을 가지고 마지막 Sigmoid activation function을 가지는 network 코딩.
# 앞서 만들어진 network를 10번 이어붙인 Feedforward Network 코딩
# 4X4 네트워크 + 바이어스 4개 웨이트 바이어스 초기값 랜덤
# 앞서 만들어진 Feedforward Network를 함수로 정의
# 함수명은 FFN()이어야 한다.
# ex:   def FFN( input):
#             return output
# 여기서 output과 input은 4차원 nd.array
# Input의 예: input=np.random.random((4,1))

import numpy as np

input = np.random.random((4, 1))


def FFN(input):
    n = 10
    z = input
    for i in range(n):
        w = np.random.random((4, 4))
        b = np.random.random((4, 1))
        a = np.dot(w, z) + b
        z = 1 / (1 + np.exp(-a))
    return a


print(FFN(input))

# b = 0
# for y in range(1000):
#     w1 = np.random.random((4, 4))
#     b1 = np.random.random((4, 1))
#     a1 = np.dot(w1, input) + b1
#     z1 = sigmoid(a1)

#     w2 = np.random.random((4, 4))
#     b2 = np.random.random((4, 1))
#     a2 = np.dot(w2, z1) + b2
#     z2 = sigmoid(a2)

#     w3 = np.random.random((4, 4))
#     b3 = np.random.random((4, 1))
#     a3 = np.dot(w3, z2) + b3
#     z3 = sigmoid(a3)

#     w4 = np.random.random((4, 4))
#     b4 = np.random.random((4, 1))
#     a4 = np.dot(w4, z3) + b4
#     z4 = sigmoid(a4)

#     w5 = np.random.random((4, 4))
#     b5 = np.random.random((4, 1))
#     a5 = np.dot(w5, z4) + b5
#     z5 = sigmoid(a5)

#     w6 = np.random.random((4, 4))
#     b6 = np.random.random((4, 1))
#     a6 = np.dot(w6, z5) + b6
#     z6 = sigmoid(a6)

#     w7 = np.random.random((4, 4))
#     b7 = np.random.random((4, 1))
#     a7 = np.dot(w7, z6) + b7
#     z7 = sigmoid(a7)

#     w8 = np.random.random((4, 4))
#     b8 = np.random.random((4, 1))
#     a8 = np.dot(w8, z7) + b8
#     z8 = sigmoid(a8)

#     w9 = np.random.random((4, 4))
#     b9 = np.random.random((4, 1))
#     a9 = np.dot(w9, z8) + b9
#     z9 = sigmoid(a9)

#     w10 = np.random.random((4, 4))
#     b10 = np.random.random((4, 1))
#     a10 = np.dot(w10, z9) + b10
#     z10 = sigmoid(a10)
#     b += sum(a10)

# a = 0

# for x in range(1000):
#     a += sum(FFN(input))

# print(a / 1000, b / 1000)
