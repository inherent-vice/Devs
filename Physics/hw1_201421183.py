import numpy as np  # numpy 와 scipy를 불러온다.
import scipy.stats
import matplotlib.pyplot as plt

S0 = 1  # 주어진 값
mu = 0.05
sigma = 0.2
K = 1.2
r = 0.05
T = 5
N = 100
Pi = 2


def discrete_asset_path(
    S0, mu, sigma, T, N
):  # 자산 가격 path S0,mu,sigma,T,N 4가지 매개변수로 이루어져 있다.

    dt = T / N  # dt 를 정의해준다.
    Spath = np.zeros(shape=N + 1)  # Spath array의 기본 틀을 잡는다.
    Spath[0] = S0  # 정의된 S0 = 1 이다

    for i in range(1, N + 1):  # 반복문을 통하여 discrete 한 asset path를 설정한다
        z = np.random.standard_normal()  # 랜덤 정규분포 z를 설정한다.
        Spath[i] = Spath[i - 1] * np.exp(
            (mu - 0.5 * sigma ** 2) * dt + sigma * np.sqrt(dt) * z
        )  # 정의에 따라 discrete 한 asset path는 이와 같다.

    return Spath


def BSM_prc_path(
    Spath, K, T, mu, r, sigma
):  # 콜옵션 가격함수를 정의한다 Spath, K, T, mu, r, sigma 매개변수로 이루어져 있다.

    N = Spath.size - 1  # N 크기 재정의
    dt = T / N
    Cpath = np.zeros(shape=N + 1)  # Cpath array의 기본 틀을 잡는다.

    def BSM_call_prc(S, K, tau, r, sigma):  # 내부함수로 콜옵션을 정의한다.

        d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * tau) / (sigma * np.sqrt(tau))
        d2 = d1 - sigma * np.sqrt(tau)

        return S * scipy.stats.norm.cdf(d1, 0, 1) - K * np.exp(
            -r * tau
        ) * scipy.stats.norm.cdf(d2, 0, 1)

    Cpath[0] = BSM_call_prc(S0, K, T, r, sigma)  # Cpath[0] 값을 설정한다.

    for i in range(1, N + 1):  # 반복문을 통하여 콜옵션의 가격들을 설정한다

        Cpath[i] = BSM_call_prc(Spath[i], K, T - i * dt, r, sigma)

    return Cpath


def del_path(
    Spath, K, T, mu, r, sigma, Pi
):  # 델타헷징을 할 경우의 포트폴리오를 설정한다 매개변수는 Spath, K, T, mu, r, sigma, Pi 이다.
    def BSM_call_delta(S, K, tau, r, sigma):  # 내부함수로 델타를 정의한다.
        d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * tau) / (sigma * np.sqrt(tau))
        return scipy.stats.norm.cdf(d1, 0, 1)

    N = Spath.size - 1
    dt = T / N

    port = np.zeros(shape=N + 1)  # 포트폴리오 자산 현금의 틀을 잡는다.
    asset = np.zeros(shape=N + 1)
    cash = np.zeros(shape=N + 1)

    port[0] = Pi  # 초기 포트폴리오 자산은 Pi 로 정의된다.
    asset[0] = BSM_call_delta(S0, K, T, r, sigma)  # 자산은 델타 비중으로 들고간다.
    cash[0] = Pi - asset[0] * Spath[0]  # 현금은 그 이외 남는 비중을 가져간다.

    for i in range(1, N + 1):  # 반복문을 통하여 포트폴리오의 가격들을 설정한다

        asset[i] = BSM_call_delta(Spath[i], K, T - i * dt, r, sigma)
        cash[i] = (1 + r * dt) * cash[i - 1] + (asset[i - 1] - asset[i]) * Spath[i]
        port[i] = asset[i - 1] * Spath[i] + (1 + r * dt) * cash[i - 1]

    return port
