import re

new_id = "z^^.-_^"


def solution(new_id):
    new_id = new_id.lower()
    new_id = re.sub(r"[^a-zA-Z0-9-_.]", "", new_id)
    print(new_id)

    while ".." in new_id:
        new_id = new_id.replace("..", ".")
    new_id = new_id.strip(".")

    if new_id == "":
        new_id = "a"

    if len(new_id) >= 16:
        new_id = new_id[:15]

    new_id = new_id.strip(".")

    if len(new_id) <= 2:
        while len(new_id) < 3:
            new_id += new_id[-1]

    return new_id


print(solution(new_id))
