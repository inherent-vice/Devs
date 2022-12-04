while True or False:
    x = int(input("Write mutiple number :" )) 
    if x in range(1,10):
        for n in range(1, 10):
            print(x, "X", n, "=", x * n)
    else:
        print("Error: Please write number in 1~9")
    continue
