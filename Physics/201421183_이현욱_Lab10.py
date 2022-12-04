import numpy as np
import matplotlib.pyplot as plt
import matplotlib.image as img

# Check the installed package


# L1 = [1, 2]
# L2 = [3, 4]
# print(L1 + L2)

# A1 = np.array([1, 3, 4])
# print(A1)
# print(A1[0], ",", A1[1])
# print(A1 * 2)

# B1 = np.array([10, 20, 30])
# print(A1 + B1)

# A2 = np.array([[1, 2], [3, 4]])
# B2 = np.array([[1, 0], [3, 0]])
# print(A2[0][1], " ", A2[1][0])
# print(A2 + B2)
# print(A2 * B2)

# print(np.dot(A2, B2))


# Task 1: Test the numpy module

# test_A = np.array([[1, 2, 3], [4, 5, 6], [7, 8, 9]])
# print(test_A)

# test_B = np.array([[10, 20, 30], [40, 50, 60], [70, 80, 90]])
# print(test_B)

# test_C = np.array([[1, 2, 3], [4, 0, 0], [7, 0, 0]])
# print(test_C)


# Task2: Display and modify a black-white image


# im1 = img.imread("C:/Devs/Physics/camera(gray).tif")
# print(im1.shape)
# plt.figure(1)
# plt.imshow(im1, cmap="gray")
# plt.show()


# RGB image can be handled using matplotlib


# im1 = img.imread("C:/Devs/Physics/Ajou_logo.jpg")
# print(type(im1))
# print(im1.shape)
# plt.figure(1)
# plt.imshow(im1)
# plt.axis("off")

# im_R = im1[:, :, 0]
# plt.figure(2)
# plt.imshow(im_R, cmap="Reds")
# plt.axis("off")

# im_G = im1[:, :, 1]
# plt.figure(3)
# plt.imshow(im_R, cmap="Greens")
# plt.axis("off")

# im_B = im1[:, :, 2]
# print(im_B.shape)
# print(type(im_B))
# plt.figure(4)
# plt.imshow(im_R, cmap="Blues")
# plt.axis("off")

# plt.show()


# # Tutorial: Swap color channels in a RGB image


# im1 = img.imread("C:/Devs/Physics/Ajou_logo.jpg")
# conv_img = np.zeros((im1.shape[0], im1.shape[1], im1.shape[2]), "uint8")
# conv_img[:, :, 0] = im_R
# conv_img[:, :, 1] = im_B
# conv_img[:, :, 2] = im_G

# plt.figure(5)
# plt.imshow(conv_img)
# plt.axis("off")

# plt.show()


# Task3: Swap color channels in a RGB image


im1 = img.imread("C:/Devs/Physics/sample_image.jpg")

print(type(im1))
print(im1.shape)
plt.figure(1)
plt.imshow(im1)
plt.axis("off")

im_R = im1[:, :, 0]
plt.figure(2)
plt.imshow(im_R, cmap="Reds")
plt.axis("off")

im_G = im1[:, :, 1]
plt.figure(3)
plt.imshow(im_R, cmap="Greens")
plt.axis("off")

im_B = im1[:, :, 2]
print(im_B.shape)
print(type(im_B))
plt.figure(4)
plt.imshow(im_R, cmap="Blues")
plt.axis("off")

conv_img = np.zeros((im1.shape[0], im1.shape[1], im1.shape[2]), "uint8")
conv_img[:, :, 0] = im_R
conv_img[:, :, 1] = im_B
conv_img[:, :, 2] = im_G

plt.figure(5)
plt.imshow(conv_img)
plt.axis("off")

plt.show()
