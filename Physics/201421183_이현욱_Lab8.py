# Task 1: Make a code to handle lab info using inheritance


# class Lecture:
#     def __init__(self, name, number):
#         self.name = name
#         self.number = number

#     def info(self):
#         print("This Lecture is {} and the code is {}".format(self.name, self.number))


# class Programming(Lecture):
#     def __init__(self, name, number, type, tool):
#         Lecture.__init__(self, name, number)
#         self.type = type
#         self.tool = tool

#     def lecture_info(self):
#         print("This lecture is a {} class. And it uses {}".format(self.type, self.tool))


# lecture1 = Programming("Physics Programming", "Code1234", "experiment", "Python")
# lecture1.info()
# lecture1.lecture_info()


# Task 2: Professor and student classes


# class Person:
#     def __init__(self, name, age, gender):
#         self.name = name
#         self.age = age
#         self.gender = gender

#     def info(self):
#         print("Name: {}, age: {}, gender: {}".format(self.name, self.age, self.gender))


# class Professor(Person):
#     def __init__(self, name, age, gender, office):
#         Person.__init__(self, name, age, gender)
#         self.office = office

#     def office_info(self):
#         print("{}'s office is {}".format(self.name, self.office))


# class Student(Person):
#     def __init__(self, name, age, gender, major):
#         Person.__init__(self, name, age, gender)
#         self.major = major

#     def major_info(self):
#         print("{}'s major is {}".format(self.name, self.major))


# p1 = Professor("Sam", 43, "m", 411)
# p1.info()
# p1.office_info()

# s1 = Student("John", 20, "m", "Physics")
# s1.info()
# s1.major_info()


# Task 3: Override info function form the previous task


class Person:
    def __init__(self, name, age, gender):
        self.name = name
        self.age = age
        self.gender = gender

    def info(self):
        print("Name: {}, age: {}, gender: {}".format(self.name, self.age, self.gender))


class Professor(Person):
    def __init__(self, name, age, gender, office):
        Person.__init__(self, name, age, gender)
        self.office = office

    def info(self):
        super().info()
        print("{}'s office is {}".format(self.name, self.office))


class Student(Person):
    def __init__(self, name, age, gender, major):
        Person.__init__(self, name, age, gender)
        self.major = major

    def info(self):
        super().info()
        print("{}'s major is {}".format(self.name, self.major))


p1 = Professor("Sam", 43, "m", 411)
p1.info()

s1 = Student("John", 20, "m", "Physics")
s1.info()
