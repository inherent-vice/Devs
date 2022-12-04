# 2 Implied Volatility

import matplotlib.pyplot as plt
import numpy as np

S = 394.82  # 11월 2일 코스피 200 지수는 394.82로 마감
K = np.arange(377.5, 405, 2.5)  # 377.5 부터 402.5 까지
C_mkt = np.array([18, 15.65, 13.55, 11.3, 9.25, 7.44, 5.68, 4.16, 2.9, 1.92, 1.21])
P_mkt = np.array(
    [0.45, 0.62, 0.85, 1.17, 1.58, 2.17, 2.91, 3.86, 5.1, 6.61, 8.65]
)  # 실제 시장에서 관측된 옵션가격
tau = 9 / 365  # 잔존기간
r = 0.0112  # CD91일 이자율


def BSM_call_prc(S, K, tau, r, sigma):  # 블랙숄츠 콜옵션 가격
    import numpy as np
    import scipy.stats

    d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * tau) / (sigma * np.sqrt(tau))
    d2 = d1 - sigma * np.sqrt(tau)

    return S * scipy.stats.norm.cdf(d1, 0, 1) - K * np.exp(
        -r * tau
    ) * scipy.stats.norm.cdf(d2, 0, 1)


def BSM_put_prc(S, K, tau, r, sigma):  # 블랙숄츠 풋옵션 가격
    import numpy as np
    import scipy.stats

    d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * tau) / (sigma * np.sqrt(tau))
    d2 = d1 - sigma * np.sqrt(tau)

    return K * scipy.stats.norm.cdf(-d2, 0, 1) - S * np.exp(
        -r * tau
    ) * scipy.stats.norm.cdf(-d1, 0, 1)


def BSM_call_vega(S, K, tau, r, sigma):  # 베가
    import numpy as np
    import scipy.stats

    d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * tau) / (sigma * np.sqrt(tau))

    return S * np.sqrt(tau) * scipy.stats.norm.pdf(d1, 0, 1)


tol = 10 ** (-8)
kmax = 100
imp_vol = []

for i in range(len(K)):  # CD91 로 계산한 내재변동성
    sigma = np.sqrt(2 * abs((np.log(S / K[i]) + r * tau) / tau))
    sigmadiff = 1
    k = 1
    while sigmadiff >= tol and k < kmax:
        fval = BSM_call_prc(S, K[i], tau, r, sigma) - C_mkt[i]
        C_mkt - P_mkt
        fprime = BSM_call_vega(S, K[i], tau, r, sigma)
        increment = fval / fprime
        sigma -= increment

        sigmadiff = abs(increment)
        k += 1
    imp_vol.append(sigma)

plt.figure(figsize=(10, 8))
plt.plot(K, np.array(imp_vol), color="r", marker="o")
plt.xlabel("Strike price")
plt.ylabel("Implied volatility")
plt.title("Volatility smile for call options")

plt.show()

PCimp_vol = []  # 풋콜페리티로 계산된 이자
rr = [
    0.0247,
    0.0224,
    0.0403,
    0.0326,
    0.0366,
    0.0468,
    0.0465,
    0.0493,
    0.0490,
    0.0497,
    0.0241,
]

for i in range(len(K)):  # 풋폴 패리티로 계산된 이자에 따른 내재변동성
    sigma = np.sqrt(2 * abs((np.log(S / K[i]) + r * tau) / tau))
    sigmadiff = 1
    k = 1
    while sigmadiff >= tol and k < kmax:
        fval = BSM_call_prc(S, K[i], tau, rr[i], sigma) - C_mkt[i]
        fprime = BSM_call_vega(S, K[i], tau, rr[i], sigma)
        increment = fval / fprime
        sigma -= increment
        sigmadiff = abs(increment)
        k += 1
    PCimp_vol.append(sigma)

plt.figure(figsize=(10, 8))
plt.plot(K, np.array(PCimp_vol), color="r", marker="o")
plt.xlabel("Strike price")
plt.ylabel("Implied volatility")

plt.show()
