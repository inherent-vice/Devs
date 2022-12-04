# Task 0: Find the largest number of three numbers


# def find_max(a, b, c):
#     largest_n = a
#     if b > largest_n:
#         largest_n = b
#     if c > largest_n:
#         largest_n = c
#     return largest_n


# print(find_max(3, 2, 6))


# Task 1: Find an index of the maximum vaule in a list


# def find_max(num_list):
#     max_v = num_list[0]
#     ind = 0
#     for x in range(len(num_list)):
#         if num_list[x] > max_v:
#             max_v = num_list[x]
#             ind = x

#     return ind


# a = [7, 2, 3, 5, 10, 8, 4]
# ind = find_max(a)
# print(a[ind])


# Task 2: Sort a list in descending order


# def find_max(num_list):
#     max_v = num_list[0]
#     ind = 0
#     for x in range(len(num_list)):
#         if num_list[x] > max_v:
#             max_v = num_list[x]
#             ind = x

#     return ind


# def max_sorting(num_list):
#     sorted_list = []
#     for x in range(len(num_list)):
#         ind = find_max(num_list)
#         sorted_list.append(num_list[ind])
#         num_list.pop(ind)

#     return sorted_list


# a = [7, 2, 3, 5, 10, 8, 4]
# print(max_sorting(a))


# Task 3: Find the max score of each player

import random as r


class Record:
    def __init__(self, name, score):
        self.name = name
        self.score = score

    def show_record(self):
        print("{}'s score: {}".format(self.name, self.score))


def playing_game(name_lists):

    record_lists = []
    for x in range(0, 10):
        temp_r = Record(r.choice(name_lists), r.randint(50, 100))
        record_lists.append(temp_r)
    return record_lists


def show_every_results(record_lists):
    print("Total records")
    for x in range(0, 10):
        print(f"{record_lists[x].name}'s score: {record_lists[x].score}")
    print("------------------")


def find_max_score(record_lists, name_lists):
    max_score0 = []
    max_score1 = []
    max_score2 = []
    max_score3 = []
    max_score = []
    for x in range(0, 10):
        if record_lists[x].name == name_lists[0]:
            max_score0.append(record_lists[x].score)
        if record_lists[x].name == name_lists[1]:
            max_score1.append(record_lists[x].score)
        if record_lists[x].name == name_lists[2]:
            max_score2.append(record_lists[x].score)
        if record_lists[x].name == name_lists[3]:
            max_score3.append(record_lists[x].score)

    if max_score0 != []:
        max_score.append(max(max_score0))
    else:
        max_score.append(0)

    if max_score1 != []:
        max_score.append(max(max_score1))
    else:
        max_score.append(0)

    if max_score2 != []:
        max_score.append(max(max_score2))
    else:
        max_score.append(0)

    if max_score3 != []:
        max_score.append(max(max_score3))
    else:
        max_score.append(0)

    print("Max score of each player")
    for x in range(0, 4):
        print("{}'s max score : {}".format(name_lists[x], max_score[x]))


name_lists = ["James", "Paul", "Sam", "Judy"]
results = playing_game(name_lists)
show_every_results(results)
find_max_score(results, name_lists)
