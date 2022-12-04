from black import out
import torch
import torch.nn as nn
import torchvision.transforms as transforms
import torch.nn.functional as F
import time
import numpy as np
from torch.utils.data import DataLoader
from torchvision import datasets
from torchvision import transforms

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

import torch
import torch.nn as nn
import torch.nn.functional as F


class BasicBlock(nn.Module):
    def __init__(self, in_channel, out_channel):
        super(BasicBlock, self).__init__()

        self.conv1 = nn.Conv2d(
            in_channel, out_channel, kernel_size=5, stride=1, padding=2
        )
        self.conv2 = nn.Conv2d(
            out_channel, out_channel, kernel_size=5, stride=1, padding=2
        )
        self.bn1 = nn.BatchNorm2d(out_channel)
        self.bn2 = nn.BatchNorm2d(out_channel)

    def forward(self, x1):
        x1 = x1
        x2 = F.relu(self.bn1(self.conv1(x1)))
        x3 = F.relu(self.bn2(self.conv2(x2)))
        return x3 + x1


# class Residual_Block(nn.Module):
#     def __init__(self, in_dim, mid_dim, out_dim):
#         super(Residual_Block, self).__init__()
#         # Residual Block
#         self.residual_block = nn.Sequential(
#             nn.Conv2d(in_dim, mid_dim, kernel_size=3, padding=1),
#             nn.ReLU,
#             nn.Conv2d(mid_dim, out_dim, kernel_size=3, padding=1),
#         )
#         self.relu = nn.ReLU()

#     def forward(self, x):
#         out = self.residual_block(x)  # F(x)
#         out = out + x  # F(x) + x
#         out = self.relu(out)
#         return out


# class ResBlock(nn.Module):
#     """The Residual block of ResNet."""

#     def __init__(
#         self,
#         input_channels,
#         num_channels,
#     ):
#         super().__init__()
#         self.conv1 = nn.Conv2d(
#             input_channels, num_channels, kernel_size=5, padding=2, stride=1
#         )
#         self.conv2 = nn.Conv2d(
#             num_channels, num_channels, kernel_size=5, padding=2, stride=1
#         )

#         self.bn1 = nn.BatchNorm2d(num_channels)
#         self.bn2 = nn.BatchNorm2d(num_channels)

#     def forward(self, x1):
#         x1 = x1
#         x2 = F.relu(self.bn1(self.conv1(x1)))
#         x3 = F.relu(self.bn2(self.conv2(x2)))
#         return x3 + x1


class BasicBlock(nn.Module):
    def __init__(self, in_channel, out_channel):
        super(BasicBlock, self).__init__()

        self.conv1 = nn.Conv2d(
            in_channel, out_channel, kernel_size=5, stride=1, padding=2
        )
        self.conv2 = nn.Conv2d(
            out_channel, out_channel, kernel_size=5, stride=1, padding=2
        )
        self.bn1 = nn.BatchNorm2d(out_channel)
        self.bn2 = nn.BatchNorm2d(out_channel)

    def forward(self, x1):
        x1 = x1
        x2 = F.relu(self.bn1(self.conv1(x1)))
        x3 = F.relu(self.bn2(self.conv2(x2)))
        return x3 + x1
