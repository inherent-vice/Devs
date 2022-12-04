def string_sort(*args, case=''):
    if not args:
        print("There is no input")
        return

    words = list()
    for arg in args:
        for word in arg.split():
            if case is 'u':
                words.append(word.upper())
            elif case is 'l':
                words.append(word.lower())
            else:
                words.append(word)
    words.sort()
    print(words)

string_sort()
string_sort("my name is")
string_sort("cd ef", "abc hij")
string_sort("my name is", case='u')
string_sort("MY", "NAME", "IS", case='l')