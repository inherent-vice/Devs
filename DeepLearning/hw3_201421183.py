import numpy as np


def target_function(x):
    return np.array(
        [
            [np.exp(x[0][0] + x[1][0])],
            [np.sin(x[3][0] * x[1][0])],
            [np.cos(x[2][0] + x[1][0])],
            [np.sin(x[0][0] + x[1][0] + x[2][0] * x[3][0])],
        ]
    )


class FFLayer:
    def __init__(self, m, n):
        self.weight = 2 * np.random.random((m, n)) - 1
        self.bias = 2 * np.random.random((m, 1)) - 1
        self.forward_input = None
        self.forward_output = None
        self.weight_grad = None  # upstream gradient
        self.bias_grad = None  # downstream gradient
        self.weight_grad_accumulated = np.zeros(self.weight.shape)  # upstream gradient
        self.bias_grad_accumulated = np.zeros(self.bias.shape)  # downstream gradient

    def forward(self, x):
        self.forward_input = x
        self.forward_output = np.matmul(self.weight, x) + self.bias
        return self.forward_output

    def grad_desc(self, lr, num_samples):
        self.weight += lr * self.weight_grad_accumulated / num_samples
        self.bias += lr * self.bias_grad_accumulated / num_samples

    def acc_grad_init(self):
        self.weight_grad_accumulated = np.zeros(self.weight.shape)  # upstream gradient
        self.bias_grad_accumulated = np.zeros(self.bias.shape)  # downstream gradient

    def backward(self, upstream_grad):  # upstream gradient
        self.bias_grad = upstream_grad
        self.weight_grad = np.matmul(upstream_grad, x.transpose())
        self.weight_grad_accumulated += self.weight_grad
        self.bias_grad_accumulated += self.bias_grad
        return np.matmul(self.weight.transpose(), upstream_grad)  # downstream gradient


class SigmoidLayer:
    def __init__(self):
        self.forward_input = None
        self.forward_output = None

    def forward(self, x):
        self.forward_input = x
        self.forward_output = sigmoid(x)
        return self.forward_output

    def backward(self, upstream_grad):  # upstream gradient\
        local_grad = self.forward_output * (1 - self.forward_output)
        return upstream_grad * local_grad

    def grad_desc(self, lr, num_samples):
        pass

    def acc_grad_init(self):
        pass


def sigmoid(x):
    return 1 / (1 + np.exp(-x))


# Building Layers

layers = []
for i in range(10):
    layers.append(FFLayer(4, 4))
    layers.append(SigmoidLayer())

x = 2 * np.random.random((4, 1)) - 1

target_function(x)

layer_input = x
for layer in layers:
    layer_input = layer.forward(layer_input)

Loss = ((layer_input - target_function(x)) ** 2).sum()


train_data_x = []
train_data_y = []
for i in range(10000):
    x = np.random.random((4, 1))
    train_data_x.append(x)
    train_data_y.append(target_function(x))


def train(layers, train_data_x, train_data_y, lr=0.1):
    Loss = 0
    for x, y in zip(train_data_x, train_data_y):
        for layer in layers:
            x = layer.forward(x)
        init_upstream_grad = -2 * (x - y)
        Loss += ((x - y) ** 2).sum()
        upstream_grad = init_upstream_grad
        for layer in reversed(layers):
            upstream_grad = layer.backward(upstream_grad)
    for layer in layers:  # gradient Descent
        layer.grad_desc(lr, len(train_data_x))
        layer.acc_grad_init()
    print("Loss", Loss)


for i in range(100):
    train(layers, train_data_x, train_data_y, lr=1)

# init_upstream_grad=np.ones((4,1))
x = np.random.random((4, 1))
for layer in layers:
    x = layer.forward(x)
init_upstream_grad = 2 * (x - target_function(x))
# print(init_upstream_grad)
upstream_grad = init_upstream_grad
for layer in reversed(layers):
    upstream_grad = layer.backward(upstream_grad)

for layer in layers[::2]:
    print(layer.weight_grad_accumulated)


def ReLu(x):
    return np.maximum(x, np.zeros(x.shape))


class ReLuLayer:
    def __init__(self):
        self.forward_input = None
        self.forward_output = None

    def forward(self, x):
        self.forward_input = x
        self.forward_output = ReLu(x)
        return self.forward_output

    def backward(self, upstream_grad):  # upstream gradient\
        local_grad = self.forward_input > 0
        return upstream_grad * local_grad

    def grad_desc(self, lr, num_samples):
        pass

    def acc_grad_init(self):
        pass
