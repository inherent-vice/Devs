# import os

# path = os.getcwd()
# print(path)
# os.chdir('C:/Devs/Physics')
# path = os.getcwd()
# print(path)

# Task 1: Make a code to print lab info as a text file.


# def write_func(info_list, path):
#     f = open('Task1.txt' , 'w')
#     f.write('My name is {}. \n'.format(info_list[0]))
#     f.write('My student number is {}. \n'.format(info_list[1]))
#     f.write('This lecture is {}. \n'.format(info_list[2]))
#     f.close()

# name = 'Hyeonuk'
# student_num = '201421183'
# lecture_name = 'Physics_programming'
# file_path = 'Task1.txt'

# info_list = [name, student_num, lecture_name]

# write_func(info_list, file_path)



# Task 2: Make a code for grading

# import os
# os.chdir('C:/Devs/Physics')

# def grading(score_lists):
#     score_lists = [int (i) for i in score_lists]
#     average = sum(score_lists)/len(score_lists)
    
#     if average > 80:
#         return 'A'
#     elif average > 60:
#         return 'B'
#     elif average > 40:
#         return 'C'
#     elif average <= 40:
#         return 'D'

# f = open('score_info.txt', 'r')

# for line in f:
#     seg_list = line.strip()
#     seg_list = seg_list.split(',')
#     name = seg_list[0]
#     score_list = seg_list[1:6]
#     print('The grade of {} is {}'.format(name, grading(score_list)))