import torch.nn as nn
import torch.nn.functional as F


class ResBlock(nn.Module):
    def __init__(self, in_channel, out_channel):
        super(ResBlock, self).__init__()

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
