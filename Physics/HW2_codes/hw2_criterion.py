from os import listdir
from os.path import isfile, join
import importlib
import matplotlib.pyplot as plt
import numpy as np


def Call_payoff(ST):
    return max([ST - K, 0])


def Put_payoff(ST):
    return max([K - ST, 0])


S = 1
mu = 5
sigma = 0.2
K = 5
r = 0.05
T = 5
N = 10000000
dt = 0.01

Gamma = Call_payoff

onlyfiles = [f for f in listdir("HW2_codes") if isfile(join("HW2_codes", f))]
onlyfiles
for filename in onlyfiles:
    print(filename)
    filename = filename[:-3]
    print(filename)
    module = importlib.import_module("HW2_codes." + filename)
    value = module.MC_general(S, Gamma, T, mu, r, sigma, N, dt)
    print(value)
    break


def BSM_call_prc(S, K, tau, r, sigma):
    import numpy as np
    import scipy.stats

    d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * tau) / (sigma * np.sqrt(tau))
    d2 = d1 - sigma * np.sqrt(tau)

    return S * scipy.stats.norm.cdf(d1, 0, 1) - K * np.exp(
        -r * tau
    ) * scipy.stats.norm.cdf(d2, 0, 1)


BSM_call_prc(S, K, T, r, sigma)


def MC_general(S, Gamma, T, mu, r, sigma, N, dt):
    Cm = []
    Z = np.random.standard_normal(size=N)
    for i in range(N):
        ST = S * np.exp((mu - 0.5 * sigma ** 2) * dt + sigma * np.sqrt(dt) * Z[i])
        C = np.exp(-r * T) * Gamma(ST)
        Cm.append(C)
    Cm = np.array(Cm)
    am = Cm.mean()
    return am


MC_general(S, Gamma, T, mu, r, sigma, N, dt)
print(MC_general(S, Gamma, T, mu, r, sigma, N, dt))
