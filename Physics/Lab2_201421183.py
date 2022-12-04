# Task_1

# while True:
#     input_num = int(input("Int number : "))
#     if input_num > 0:
#         if input_num / 2 == 0:
#             print("Input number ", input_num, "is Even")
#         else:
#             print("Input number ", input_num, "is Odd")
            
#     else:
#         print("Terminate the code")
#         break



# Task_2

# name = input("Your name : ")
# date = input('Date : ')
# lecture_num = input("Lecture number : ")

# sentence1 = "The name is " + name
# sentence2 = "The date is " + date
# sentence3 = "This is lecture " + lecture_num

# print(sentence1)
# print(sentence2)
# print(sentence3)



# Task_3

while True:
    end_number = int(input("Int end number : "))
    if end_number <= 0:
        print("Terminate the code")
        break
    
    else:
        F0 , F1 = 0 , 1
        
        for x in range(end_number):

            if x == 0:
                print(F0)
            
            elif x == 1:
                print(F1)

            else:
                F0 , F1 = F1 , F0 + F1
                print(F1)