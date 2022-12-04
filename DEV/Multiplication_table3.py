print("*Welcome*")
print("*This program is designed for Multiple table*")
E = ""
x = 3131321
while E != "n" and E != "quit":
    E = input("Enter? y/n : ")
    if E == "y":
        print("You choose yes")
        while x > 0:
            x = int(input("단을 입력하세요(음수 입력 시 종료) :" ))
            if x in range(1,10):
                for n in range(1, 10):
                    print(x, "X", n, "=", x * n)
            else:
                print("Error: Please write number in 1~9")

