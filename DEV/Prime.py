prime = []
for n in range(2, 20):
    for x in range(2, n):
        if n % x == 0:
            print(n, "equals", x, "*", n // x)
            break
    else:
        # loop fell throgh without finding a factor
        print(n, "is a prime number")
        prime.append(n)

print(prime)
