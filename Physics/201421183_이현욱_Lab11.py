import numpy as np
import matplotlib.pyplot as plt

# Task1: Two sine graphs

# x_v = np.linspace(0, 4 * np.pi, 100)
# y_v1 = np.sin(x_v)
# y_v2 = np.sin(x_v + np.pi * 2 / 3)

# plt.plot(x_v, y_v1, linestyle="-", color="blue")
# plt.show()

# plt.plot(x_v, y_v2, linestyle="--", color="red")
# plt.show()

# plt.plot(x_v, y_v1, linestyle="-", color="blue")
# plt.plot(x_v, y_v2, linestyle="--", color="red")
# plt.show()


# Task2: Find intersection

# x_v = np.linspace(-5, 5, 100)
# y_v1 = x_v ** 3 + 1
# y_v2 = 7 * x_v + 15
# point = np.abs(y_v1 - y_v2)
# plt.plot(x_v, y_v1, linestyle="-", color="blue")
# plt.plot(x_v, y_v2, linestyle="--", color="red")

# for x in range(100):
#     error = np.abs(y_v1[x] - y_v2[x])
#     if error < 1.1:
#         print(x_v[x])
#         break

# plt.show()

# Task3: 물리학1 예제 2.6 (제한 속도 엄수)

Vcar = 45.0
Car_pos = np.array([45])

Vpol = np.array([0.0])
apol = 3.0
Pol_pos = np.array([0])

t = np.array([0])
dt = 0.01
distance = [abs(Pol_pos[0] - Car_pos[0])]

while t[-1] < 50:
    Car_pos = np.append(Car_pos, Car_pos[-1] + Vcar * dt)
    Vpol = np.append(Vpol, Vpol[-1] + apol * dt)
    Pol_pos = np.append(Pol_pos, Pol_pos[-1] + Vpol[-1] * dt + 1 / 2 * (apol) * dt ** 2)
    distance = abs(Pol_pos - Car_pos)
    t = np.append(t, t[-1] + dt)


print(distance)
plt.plot(t, Car_pos, linestyle="-", color="blue")
plt.plot(t, Pol_pos, linestyle="--", color="red")
plt.xlabel("Time(s)")
plt.ylabel("Distance(m)")
plt.legend(["Car", "Police"])

answer_index = np.where(distance <= min(distance))
print("Answer is {} s".format(round(t[answer_index[0][-1]], 1)))

plt.show()
