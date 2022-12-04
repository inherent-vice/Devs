# Homework 4 : Computational problem solving  (two questions)

import numpy as np
import matplotlib.pyplot as plt

# Q1.

e = 12
r = 0.05
R = []
P = []

for i in range(100):
    R = np.append(R, 0.01 * i)
    P = np.append(P, (e ** 2 * R[i]) / (R[i] + r) ** 2)

answer = round(max(P))
answer_index = np.argmax(P)

print(f"Pmax is {answer} and Resistance is {R[answer_index]}")

plt.plot(R, P, linestyle="-", color="red")
plt.xlabel("Resistance (ohm)")
plt.ylabel("Power")
plt.legend(["Power P at the load resistor"])
plt.show()

# Q2.

v_tau = 5
g = 980
tau = v_tau / g
v90 = 0.9
v63 = 0.63
t90 = -np.log(1 - v90) * tau
t63 = -np.log(1 - v63) * tau
t = []
v_T = []
v_T90 = []
v_T63 = []

for i in range(35):
    t = np.append(t, 0.001 * i)
    v_T = np.append(v_T, v_tau * (1 - np.exp(-t[i] / tau)))
    v_T90 = np.append(v_T90, v_tau * (1 - np.exp(-t90 / tau)))
    v_T63 = np.append(v_T63, v_tau * (1 - np.exp(-t63 / tau)))

print(f"time constant is {tau} and 90% Vt is {t90} s")

plt.plot(t, v_T, linestyle="--", color="blue")
plt.plot(t, v_T90, linestyle="-", color="red")
plt.plot(t, v_T63, linestyle="-", color="green")

plt.xlabel("Time (s)")
plt.ylabel("Velocity (cm/s)")
plt.legend(["Velocity", "90% velocity", "63% velocity"])

plt.show()
