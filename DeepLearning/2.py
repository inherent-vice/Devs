# 파일명은 “hw2_학번.py”
# 파일명 예시:hw2_201011111.py
# 모듈안에서는 Custom PyTorch nn.module 작성
# Torch의 nn.Module 클래스에서 상속받아야 한다.
# Class 이름은 ResBlock
# e.g. class ResBlock(nn.Module):식으로 코드가 짜있어야 한다.
# Input이 image x 고 크기가 (N, C, H, W) 로 주어졌다.
# N은 batchsize=16, C는 in_channel=64, H,W는 image의 크기=(32,32)
# x2 = ReLU(BN(conv1(x1)))
# x3 = ReLU(BN(conv2(x2)))
# 최종 return 하는 값은 x3+x1값이 되어야 한다.
# Conv1와 conv2 filter개수는 64
# Conv1과 conv2 의 filter 크기는 5x5. stride=1 padding=2이다.

import torch
import torch.nn as nn
import torchvision.transforms as transforms
import torch.nn.functional as F
import time
import numpy as np
from torch.utils.data import DataLoader
from torchvision import datasets
from torchvision import transforms


class ResBlock(nn.Module):
    """Helper Class"""

    def __init__(self, channels):

        super(ResBlock, self).__init__()

        self.block = torch.nn.Sequential(
            torch.nn.Conv2d(
                in_channels=channels[0],
                out_channels=channels[1],
                kernel_size=(3, 3),
                stride=(2, 2),
                padding=1,
            ),
            torch.nn.BatchNorm2d(channels[1]),
            torch.nn.ReLU(inplace=True),
            torch.nn.Conv2d(
                in_channels=channels[1],
                out_channels=channels[2],
                kernel_size=(1, 1),
                stride=(1, 1),
                padding=0,
            ),
            torch.nn.BatchNorm2d(channels[2]),
        )

        self.shortcut = torch.nn.Sequential(
            torch.nn.Conv2d(
                in_channels=channels[0],
                out_channels=channels[2],
                kernel_size=(1, 1),
                stride=(2, 2),
                padding=0,
            ),
            torch.nn.BatchNorm2d(channels[2]),
        )

    def forward(self, x):
        shortcut = x

        block = self.block(x)
        shortcut = self.shortcut(x)
        x = torch.nn.functional.relu(block + shortcut)

        return x


# Module 직접 작성해보기.

# ppt의 내용을 만족하는 코드를 작성하세요

# (초기 input의 in_channels의 경우 64로 수정하였습니다.
# 각각의 값에 x1, x2 값을 입력하였습니다)

# 파일명은 “hw2_학번.py”
# 파일명 예시:hw2_201011111.py
# 모듈안에서는 Custom PyTorch nn.module 작성
# Torch의 nn.Module 클래스에서 상속받아야 한다.
# Class 이름은 ResBlock
# e.g. class ResBlock(nn.Module):식으로 코드가 짜있어야 한다.
# Input이 image x 고 크기가 (N, C, H, W) 로 주어졌다.
# N은 batchsize=16, C는 in_channel=64, H,W는 image의 크기=(32,32)
# x2 = ReLU(BN(conv1(x1)))
# x3 = ReLU(BN(conv2(x2)))
# 최종 return 하는 값은 x3+x1값이 되어야 한다.
# Conv1와 conv2 filter개수는 64
# Conv1과 conv2 의 filter 크기는 5x5. stride=1 padding=2이다.


class block(nn.Module):
    def __init__(
        self, in_channels, intermediate_channels, identity_downsample=None, stride=1
    ):
        super(block, self).__init__()
        self.expansion = 4
        self.conv1 = nn.Conv2d(
            in_channels,
            intermediate_channels,
            kernel_size=1,
            stride=1,
            padding=0,
            bias=False,
        )
        self.bn1 = nn.BatchNorm2d(intermediate_channels)
        self.conv2 = nn.Conv2d(
            intermediate_channels,
            intermediate_channels,
            kernel_size=3,
            stride=stride,
            padding=1,
            bias=False,
        )
        self.bn2 = nn.BatchNorm2d(intermediate_channels)
        self.conv3 = nn.Conv2d(
            intermediate_channels,
            intermediate_channels * self.expansion,
            kernel_size=1,
            stride=1,
            padding=0,
            bias=False,
        )
        self.bn3 = nn.BatchNorm2d(intermediate_channels * self.expansion)
        self.relu = nn.ReLU()
        self.identity_downsample = identity_downsample
        self.stride = stride

    def forward(self, x):
        identity = x.clone()

        x = self.conv1(x)
        x = self.bn1(x)
        x = self.relu(x)
        x = self.conv2(x)
        x = self.bn2(x)
        x = self.relu(x)
        x = self.conv3(x)
        x = self.bn3(x)

        if self.identity_downsample is not None:
            identity = self.identity_downsample(identity)

        x += identity
        x = self.relu(x)
        return


class Net(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv1 = nn.Conv2d(3, 6, 5)
        self.pool = nn.MaxPool2d(2, 2)
        self.conv2 = nn.Conv2d(6, 16, 5)
        self.fc1 = nn.Linear(16 * 5 * 5, 120)
        self.fc2 = nn.Linear(120, 84)
        self.fc3 = nn.Linear(84, 100)

    def forward(self, x):
        x = self.pool(F.relu(self.conv1(x)))
        x = self.pool(F.relu(self.conv2(x)))
        x = x.view(-1, 16 * 5 * 5)
        x = F.relu(self.fc1(x))
        x = F.relu(self.fc2(x))
        x = self.fc3(x)
        return x
