# Task_1

# def sum(n1,n2):
#     return n1 + n2

# def sub(n1,n2):
#     return n1 - n2

# while True:
#     option = input("Option 1. Sum , 2. Subtraction , 3. Terminate   ")
#     if option == "3":
#         break
    
#     else:
#         input_n1 = int(input("First number : "))
#         input_n2 = int(input("Second number : "))
#         if option == "1":
#             print(sum(input_n1, input_n2))
#         elif option == "2":
#             print(sub(input_n1, input_n2))




# Task_2

# import random as r

# def sum(n1, n2):
#     return n1 + n2

# def sub(n1, n2):
#     return n1 - n2

# def multi(n1, n2):
#     return n1 * n2

# def check_answer(n1, n2):
#     if n1 == n2 :
#         print("Correct")
#     else:
#         print("Wrong")

# while True:
#     option = input("1.Playing game, 2.terminate  :")
#     if option == "2":
#         break

#     elif option == "1":
#         n1 = r.randint(1,10)
#         n2 = r.randint(1,10)
#         operator = r.randint(1,3)

#         if operator == 1:
#             print(n1, "+" ,n2, "?")
#             answer = int(input("answer ? :  "))
#             check_answer(sum(n1, n2), answer)

#         elif operator == 2:
#             print(n1, "-" ,n2, "?")
#             answer = int(input("answer ? :  "))
#             check_answer(sub(n1, n2), answer)

#         elif operator == 3:
#             print(n1, "*" ,n2, "?")
#             answer = int(input("answer ? :  "))
#             check_answer(multi(n1, n2), answer)



# Task_3

# import random as r

# def make_problem():
#     print("Problem is generated")
#     return r.randint(1,100)

# def check_results(input_n, problem):
#     if input_n < 1 or input_n > 100:
#         print("Please enter the number between 1 to 100 ")
    
#     else:
#         if input_n == problem:
#             print("This is the correct answer ! ")
#             return 0

#         elif input_n < problem:
#             print("The input is smaller tan the answer")

#         elif input_n > problem:
#             print("The input is larger than the problem")

# def playing_game():
#     problem = make_problem()
    
#     for x in range(10):

        # input_n = int(input("Enter the number between 1 to 100 ("+str(x+1) +"/10):  "))
        # if check_results(input_n, problem) == 0:
        #     break

# playing_game()