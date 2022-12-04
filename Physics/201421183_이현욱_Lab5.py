# Task 1:
# Make a function that shows a multiplication table (구구단)



# def m_table(num1, num2):
#     print("{:d}x{:d} = {:d}".format(num1, num2, num1 * num2))

# while True:
#     input_num = int(input("Input nuber : "))
#     if input_num == 0:
#         print('Terminate the code')
    
#     else:
#         for x in range(1, 9+1):
#             m_table(input_num, x)



# Task 2:
# Make a function that shows information about exam scores



# import random as r

# scores = {"math":r.randint(1,100),"Physics":r.randint(1,100),\
#     "Biology":r.randint(1,100),"Chemistry":r.randint(1,100)}

# total_score = 0

# for keys, values in scores.items():
#     print("{}'s score is {}".format(keys,values))
#     total_score = total_score + values

# print('Average scroe is {:0.2f}'.format(total_score / len(scores.keys())))