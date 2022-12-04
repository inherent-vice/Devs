# Task 1


# def power_calcul(input_num):
#     results = []        

#     if input_num < 1:
#         quit()

#     for x in range(1, input_num + 1):
#         results.append(x**2)

#     return results


# input_num = int(input("Enter number :  "))
# print(power_calcul(input_num))



# Task 2


# import random as r

# def make_question(input_num):
#     return r.sample(word_lists,input_num)

# word_lists = ["Dog","Puppy","Turtle","Rabbit","Parrot","Cat"
# ,"Kitten","Goldfish","Mouse","Tropicalfish","Hamster","Cow"
# ,"Rabbit","Ducks","Shrimp","Pig","Goat","Crab","Deer","Bee"
# ,"Sheep","Fish","Turkey","Dove","Chicken","Horse"]

# input_num = (int(input("Enter question number : ")))
# print(make_question(input_num))



# Task 3


import random as r

def make_question(input_num):
    return r.sample(playing_game(),input_num)

def playing_game():
    word_lists = ["Dog","Puppy","Turtle","Rabbit","Parrot","Cat"
,"Kitten","Goldfish","Mouse","Tropicalfish","Hamster","Cow"
,"Rabbit","Ducks","Shrimp","Pig","Goat","Crab","Deer","Bee"
,"Sheep","Fish","Turkey","Dove","Chicken","Horse"]
    return word_lists

while True:
    input_num = (int(input("Enter question number : ")))
    if not input_num in range(3 , 10+1):
        print("Please enter a number between 3-10")
    else:
        print("Let's play the game! ")
        problem_set = make_question(input_num)
        scores = 0
        for x in range(input_num):
            answer = input("" + problem_set[x] + ":")

            if answer == problem_set[x]:
                scores = scores + 1
                print("Correct!")

            else:
                print("Wrong")

        print("Your score is", scores , "/" , input_num)
        print("END")
        break

playing_game()