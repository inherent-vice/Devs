# # Homework 3 : Card Matching Game

# 1. Card 객체를 만들어 활용. (각 카드는 동물 4종류 (Dog, Cat, Duck, Bear) 중 1개와 숫자로 구성이 되어 있음)
# 2. 두 Card가 동일하다는 것은 동물의 종류와 숫자가 같아야 함.
# 3. 게임 시작 시 6쌍의 카드 (총 12장)을 무작위로 동물 종류 1가지를 선택해서 만든 후 카드 순서를 섞어 문제를 만듦.
# 4. Player로 부터 입력을 받기 전에 현재 카드 상태를 보여줌.
# 5. Player가 두 장의 카드를 선택하면 카드 정보를 보여준 후 카드가 동일한지 아닌지 판단.
# 6. 선택된 카드가 동일하다면 현재 카드 상태에서 선택된 카드를 0으로 바꿈.
# 7. 동일한 카드가 아닐경우 다시 입력을 받음.
# 8. Player가 모든 카드쌍을 찾아내면 몇번 시도를 했는지 보여주고 게임을 끝냄

import random

SUITS = ["Dog", "Cat", "Duck", "Bear"]


class Card:
    suit: str
    number: int

    def __init__(self, suit, number):
        self.suit = suit
        self.number = number

    def __str__(self):
        return f"Card #{self.number}: {self.suit}"


def init_cards():
    cards = []

    numbers = list(range(1, 12 + 1))
    random.shuffle(numbers)
    for _ in range(6):
        suit = random.choice(SUITS)

        first = numbers.pop()
        cards.append(Card(suit, first))

        second = numbers.pop()
        cards.append(Card(suit, second))

    cards = sorted(cards, key=lambda card: card.number)

    return cards


def print_deck(cards):
    print("Deck:")
    print("-----------------------------------")
    for card in cards:
        print(f"{card.number:02}", end=" ")
    print("\n-----------------------------------")


def start_game():
    cards = init_cards()

    while any([card.number > 0 for card in cards]):
        print_deck(cards)

        first = int(input("Choose one: "))
        print(cards[first - 1])
        while True:
            second = int(input("Choose two: "))
            if first != second:
                break
        print(cards[second - 1])

        first_suit = cards[first - 1].suit
        second_suit = cards[second - 1].suit

        if first_suit == second_suit:
            cards[first - 1].number = 0
            cards[second - 1].number = 0

    print("You won the game")


start_game()
