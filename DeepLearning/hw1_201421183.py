import numpy as np


def sigmoid(x):
    return 1 / (1 + np.exp(-x))


input = np.random.random((4, 1))


def FFN(input):
    n = 10
    z = input
    for i in range(n):
        w = np.random.random((4, 4))
        b = np.random.random((4, 1))
        a = np.dot(w, z) + b
        z = sigmoid(a)
    return z


print(FFN(input))
