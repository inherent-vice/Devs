1  # # Homework 3 : Card Matching Game

# 1. Card 객체를 만들어 활용. (각 카드는 동물 4종류 (Dog, Cat, Duck, Bear) 중 1개와 숫자로 구성이 되어 있음)
# 2. 두 Card가 동일하다는 것은 동물의 종류와 숫자가 같아야 함.
# 3. 게임 시작 시 6쌍의 카드 (총 12장)을 무작위로 동물 종류 1가지를 선택해서 만든 후 카드 순서를 섞어 문제를 만듦.
# 4. Player로 부터 입력을 받기 전에 현재 카드 상태를 보여줌.
# 5. Player가 두 장의 카드를 선택하면 카드 정보를 보여준 후 카드가 동일한지 아닌지 판단.
# 6. 선택된 카드가 동일하다면 현재 카드 상태에서 선택된 카드를 0으로 바꿈.
# 7. 동일한 카드가 아닐경우 다시 입력을 받음.
# 8. Player가 모든 카드쌍을 찾아내면 몇번 시도를 했는지 보여주고 게임을 끝냄

import random as r

species = ["Dog", "Cat", "Duck", "Bear"]  # 동물의 종류
total = 12  # 총 카드수
deck = list(range(1, total + 1))  # 덱 초기값
A = []  # 페어쌍
B = []
C = []
D = []
E = []
F = []


class Card:  # 카드 클래스 객체는 종, 숫자, 쌍
    def __init__(self, species, number, pair):
        self.species = species
        self.number = number
        self.pair = pair


def show_deck(deck):  # 덱을 보여주는 함수
    start = 0
    end = len(deck)
    div = 4
    for i in range(start, end + div, div):  # 4개씩 끊어서 보여준다.
        out = deck[start : start + div]
        if out != []:
            print(out)
        start = start + div


def card_deck_making(species, total):  # 덱을 만드는 함수
    global A, B, C, D, E, F  # 글로벌에서 페어 리스트를 가져온다.
    tmp_deck = list(range(1, total + 1))  # 임시덱을 만들어 페어를 만든다.

    species_list = []
    for i in range(2):
        species_list.append(r.choice(species))
    species_list = species + species_list

    A = list(r.sample(tmp_deck, 2))  # 각 페어는 임시덱에서 두개씩 뽑아온다
    for i in A:
        tmp_deck.remove(i)  # 뽑은 숫자는 제거한다.

    B = list(r.sample(tmp_deck, 2))
    for i in B:
        tmp_deck.remove(i)

    C = list(r.sample(tmp_deck, 2))
    for i in C:
        tmp_deck.remove(i)

    D = list(r.sample(tmp_deck, 2))
    for i in D:
        tmp_deck.remove(i)

    E = list(r.sample(tmp_deck, 2))
    for i in E:
        tmp_deck.remove(i)

    F = list(r.sample(tmp_deck, 2))
    for i in F:
        tmp_deck.remove(i)

    return A, B, C, D, E, F


card_deck_making(species, total)

pair1 = Card("Dog", 1, A)  # 각 페어는 다음과 같이 정의할 수 있다.
pair2 = Card("Cat", 2, B)
pair3 = Card("Duck", 3, C)
pair4 = Card("Bear", 4, D)
pair5 = Card(str(r.choice(species)), 5, E)  # 총 6쌍이기 때문에 2동물은 랜덤하게 정해진다.
pair6 = Card(str(r.choice(species)), 6, F)


def game_start():  # 게임 시작 함수
    print("----------------------------")
    show_deck(deck)  # 현재 덱을 보여준다.
    print("----------------------------")
    first = int(input("Select first Card"))  # 값을 입력받는다.
    while True:
        second = int(input("Select second Card"))  # 두번째 값을 입력받을때 첫번째와 같지 않도록한다.
        if first != second:
            break
        print("Please select different card")

    if first in pair1.pair:  # 두 입력값의 클래스 정보를 가져온다.
        print(f"Card {first} is")
        print(f"Species : {pair1.species} / number : {pair1.number}")
    if second in pair1.pair:
        print(f"Card {second} is")
        print(f"Species : {pair1.species} / number : {pair1.number}")

    if first in pair2.pair:
        print(f"Card {first} is")
        print(f"Species : {pair2.species} / number : {pair2.number}")
    if second in pair2.pair:
        print(f"Card {second} is")
        print(f"Species : {pair2.species} / number : {pair2.number}")

    if first in pair3.pair:
        print(f"Card {first} is")
        print(f"Species : {pair3.species} / number : {pair3.number}")
    if second in pair3.pair:
        print(f"Card {second} is")
        print(f"Species : {pair3.species} / number : {pair3.number}")

    if first in pair4.pair:
        print(f"Card {first} is")
        print(f"Species : {pair4.species} / number : {pair4.number}")
    if second in pair4.pair:
        print(f"Card {second} is")
        print(f"Species : {pair4.species} / number : {pair4.number}")

    if first in pair5.pair:
        print(f"Card {first} is")
        print(f"Species : {pair5.species} / number : {pair5.number}")
    if second in pair5.pair:
        print(f"Card {second} is")
        print(f"Species : {pair5.species} / number : {pair5.number}")

    if first in pair6.pair:
        print(f"Card {first} is")
        print(f"Species : {pair6.species} / number : {pair6.number}")
    if second in pair6.pair:
        print(f"Card {second} is")
        print(f"Species : {pair6.species} / number : {pair6.number}")

    if (first in pair1.pair) and (
        second in pair1.pair
    ):  # 두 입력값이 페어에 있는지 확인하고 있다면 메세지를 출력한다.
        print("Same Card")
        pair1.pair[0] = 0  # 페어가 있다면 그 카드를 덱에서 제거한다.
        pair1.pair[1] = 0
        deck[first - 1] = 0
        deck[second - 1] = 0
    elif (first in pair2.pair) and (second in pair2.pair):
        print("Same Card")
        pair2.pair[0] = 0
        pair2.pair[1] = 0
        deck[first - 1] = 0
        deck[second - 1] = 0
    elif (first in pair3.pair) and (second in pair3.pair):
        print("Same Card")
        pair3.pair[0] = 0
        pair3.pair[1] = 0
        deck[first - 1] = 0
        deck[second - 1] = 0
    elif (first in pair4.pair) and (second in pair4.pair):
        print("Same Card")
        pair4.pair[0] = 0
        pair4.pair[1] = 0
        deck[first - 1] = 0
        deck[second - 1] = 0
    elif (first in pair5.pair) and (second in pair5.pair):
        print("Same Card")
        pair5.pair[0] = 0
        pair5.pair[1] = 0
        deck[first - 1] = 0
        deck[second - 1] = 0
    elif (first in pair6.pair) and (second in pair6.pair):
        print("Same Card")
        pair6.pair[0] = 0
        pair6.pair[1] = 0
        deck[first - 1] = 0
        deck[second - 1] = 0
    else:
        print("different")  # 다른 카드를 고른다면 다르다는 메세지를 출력한다.


trials = 0  # 시행횟수
while any([x > 0 for x in deck]):  # 남아있는 카드가 없을때까지 진행한다.
    trials += 1
    print(f"#{trials} trials")  # 시행횟수를 출력한다.
    game_start()
print("You won the game!")  # 남아있는 카드가 없다면 승리
