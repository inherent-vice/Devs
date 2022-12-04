def string_sort():
    print("there is no input")


def string_sort(*args,case=""):
    a=list()
    for arg in args:
        a.extend(arg.split())
        a.sort()
        if case == "u":
            arg.upper()
        elif case == "i":
            arg.lower()

    print(a)


string_sort("asdf bs","a s","sd bbf",case="u")
string_sort()

#아니 이걸 비전공생한테 시킨다고?
