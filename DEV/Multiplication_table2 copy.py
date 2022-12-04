print("*Welcome*")
print("*This program is designed for Multiple table*")
while True:
    E = input("Enter? y/n : ")
    if E == "y":
        print("You choose yes")
        while True:
            x = int(input("Write mutiple number :" )) 
            if x in range(1,10):
                for n in range(1, 10):
                    print(x, "X", n, "=", x * n)
            else:
                print("Error: Please write number in 1~9")

            while True:
                x = input("continue? y/n : ")
                if x == "y":
                    break
                elif x == "n":
                    quit()
                else:
                    continue
    elif E == "n":
        quit()
    elif E == "quit":
        quit()
    else:
        continue

