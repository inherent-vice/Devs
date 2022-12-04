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

# from sklearn import datasets

#
# Generate a dataset and plot it
#
# np.random.seed(0)
# X, y = datasets.make_moons(200, noise=0.20)
#
# Neural network architecture
# No of nodes in input layer = 4
# No of nodes in output layer = 3
# No of nodes in the hidden layer = 6
#
input_dim = 4  # input layer dimensionality
output_dim = 4  # output layer dimensionality
hidden_dim = 4  # hidden layer dimensionality
#
# Weights and bias element for layer 1
# These weights are applied for calculating
# weighted sum arriving at neurons in 1st hidden layer
#
W1 = np.random.randn(input_dim, hidden_dim)
b1 = np.zeros((1, hidden_dim))
#
# Weights and bias element for layer 2
# These weights are applied for calculating
# weighted sum arriving at neurons in 2nd hidden layer
#
W2 = np.random.randn(hidden_dim, hidden_dim)
b2 = np.zeros((1, hidden_dim))
#
# Weights and bias element for layer 2
# These weights are applied for calculating
# weighted sum arriving at in the final / output layer
#
W3 = np.random.randn(hidden_dim, output_dim)
b3 = np.zeros((1, output_dim))

#
# Forward propagation of input signals
# to 6 neurons in first hidden layer
# activation is calculated based tanh function
# #
# # z1 = X.dot(W1) + b1
# a1 = np.tanh(z1)
# #
# # Forward propagation of activation signals from first hidden layer
# # to 6 neurons in second hidden layer
# # activation is calculated based tanh function
# #
# z2 = a1.dot(W2) + b2
# a2 = np.tanh(z2)
# #
# # Forward propagation of activation signals from second hidden layer
# # to 3 neurons in output layer
# #
# z3 = a2.dot(W3) + b3
# #
# # Probability is calculated as an output
# # of softmax function
# #
# probs = np.exp(z3) / np.sum(np.exp(z3), axis=1, keepdims=True)

print(W1)
print(b1)





# def FFNSET(n):
#     for i in range(n):
#         w = np.random.random((4, 4))
#         b = np.random.random((4, 1))
#         a = np.dot(w, input) + b
#         z = sigmoid(a)

# def sigmoid(x):
#     return 1 / (1 + np.exp(-x))

# input = np.random.random((4, 1))

# w1 = np.random.random((4, 4))
# b1 = np.random.random((4, 1))
# a1 = np.dot(w1, input) + b1
# z1 = sigmoid(a1)

# print(z1)


# input_dim = 4
# output_dim = 4
# hidden_dim = 4

# class FFNN():
#     def __init__(self, input_dim, hidden_dim, output_dim):
#         super(FFNN, self).__init__()
#         self.fc1 = np.random.random(input_dim, hidden_dim)

#         self.fc2 = nn.Linear(hidden_dim, output_dim)

#     def forward(self, x):
#         out = self.fc1(x)
#         out = self.sigmoid(out)
#         out = self.fc2(out)
#         return out