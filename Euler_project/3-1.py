y = 600851475143
x = 2

while x <= y:
    if y % x == 0:
        print(x)
        y = y / x
    else:
        x += 1
