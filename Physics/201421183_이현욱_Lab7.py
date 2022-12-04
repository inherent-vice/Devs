# Task 0 : Class tutorial(shapes)


# class Shape:
#     def __init__(self, shape, edges):
#         self.shape = shape
#         self.edges = edges

#     def info(self):
#         print("info function has been called")
#         print(f"{self.shape} has {self.edges} edges")


# circle = Shape("circle", 0)
# triangle = Shape("triangle", 3)
# square = Shape("square", 4)
# pentagon = Shape("pentagon", 5)

# print(f"{circle.shape} has {circle.edges} edges")
# print(f"{triangle.shape} has {triangle.edges} edges")
# print(f"{square.shape} has {square.edges} edges")
# print(f"{pentagon.shape} has {pentagon.edges} edges")

# circle.info()
# triangle.info()
# square.info()
# pentagon.info()


# Task 1 : Lecture class

# class Lecture:
#     def __init__(self, name, code, number):
#         self.name = name
#         self.code = code
#         self.number = number

#     def get_info(self):
#         print(f"The lecture name is {self.name}")
#         print(f"The lecture code is {self.code}")
#         print(f"And this is lecture {self.number}")

# Programming = Lecture("Physics programmig", "G002-1", 7)
# Programming.get_info()

# Physics = Lecture("General physics", "P001", 3)
# Physics.get_info()

# Mechanics = Lecture("Advanced mechanics", "AM003", 5)
# Mechanics.get_info()


# Task 2 : Make calculators using a class


class Calculator:
    def __init__(self):
        self.init = 0

    def add(self, number):
        self.init = self.init + number

    def substract(self, number):
        self.init = self.init - number

    def multiply(self, number):
        self.init = self.init * number

    def divide(self, number):
        if number != 0:
            self.init = self.init / number
        else:
            print("This is a wrong input")

    def print_value(self):
        print(f"The result is {self.init}")


c1 = Calculator()
c1.add(5)
c1.substract(7)
c1.multiply(10)
c1.divide(0)
c1.multiply(-1)
c1.print_value()
