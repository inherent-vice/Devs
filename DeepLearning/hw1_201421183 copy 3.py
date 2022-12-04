import numpy as np


def sigmoid(x):
    return 1 / (1 + np.exp(-x))


class FFLayer:
    def __init__(self, m, n):
        self.weight = np.random.random((m, n))
        self.bias = np.random.random((m, 1))

    def forward(self, x):
        return np.matmul(self.weight, x) + self.bias

    def backpropagation(upstream_gradient):
        self.weight_grad = np.matmul


layers = []
for i in range(10):
    layers.append(FFLayer(4, 4))

x = np.random.random((4, 1))


def function(x):
    for layer in layers:
        x = layer.forward(x)
        x = sigmoid(x)
        return x


function(x)
