# 1. Monte-Carlo Method

from os import listdir
from os.path import isfile, join
import importlib
import matplotlib.pyplot as plt
import numpy as np


def Call_payoff(ST):  # 콜옵션의 payoff
    return max([ST - K, 0])


S = 1  # S는 자산의 현재 가격
mu = 5  # 수익률
sigma = 0.2  # sigma는 자산의 변동성
K = 5  # strike price
r = 0.05  # r은 이자율
T = 5  # T는 만기까지의 기간
N = 10000000  # N은 sample path의 개수
dt = 0.01  # dt는 time-step의 크기

Gamma = Call_payoff  # Gamma는 payoff function (input은 만기시 주가를 입력)


def MC_general(S, Gamma, T, mu, r, sigma, N, dt):
    Cm = []  # 몬테카를로 시행으로 만들어지는 값을 저장하기위한 리스트
    Z = np.random.standard_normal(size=N)  # 랜덤변수 생성
    for i in range(N):  # N번 반복
        ST = S * np.exp(
            (r - 0.5 * sigma ** 2) * T + sigma * np.sqrt(T) * Z[i]
        )  # 만기시의 가격
        C = np.exp(-mu * dt) * Gamma(ST)  # 디스카운트를 고려한 payoff
        Cm.append(C)  #  Cm에 추가

    Cm = np.array(Cm)
    am = Cm.mean()  # Cm 리스트에 있는 값의 평균값을 구해준다.
    return am  # 몬테카를로 메소드로 계산된 옵션의 가치


print(MC_general(S, Gamma, T, mu, r, sigma, N, dt))
