# Homework2_ATM_Management_System

money = 1000000  # 현금 기본값 설정
transaction_record = {}  # 거래 기록 기본값 설정
i = 0  # 이름 중복 방지를 위한 장치


def Run_ATM():  # Run_ATM 함수 설정
    while True:  # Whlie 반복문을 통한 메인 메뉴 설정
        mode = int(
            input(
                "  Select option \n 1. ATM initialization \n 2. withdraw \n 3. Check transaction record \n 4. Exit \n :"
            )
        )
        # 선택지를 보여주고 선택 옵션 추가

        if mode == 1:  # mode 1 = ATM_initialization 함수 불러오기
            ATM_initialization()

        elif mode == 2:  # mode 2 = withdraw 함수 불러오기
            withdraw()

        elif mode == 3:  # mode 3 = check_transaction_record 함수 불러오기
            check_transaction_record()

        elif mode == 4:  # mode 4 = Exit 함수 불러오기
            quit()

        else:  # 다른 입력값이 들어오는 경우
            print("You select the wrong option")


def ATM_initialization():  # ATM_initialization 함수
    global money  # money를 글로벌에서 가져온다
    money = 1000000  # 백만으로 초기화
    transaction_record.clear()  # 모든 딕셔너리 값 제거
    print("ATM successfully initialized !")


def withdraw():  # withdraw 함수
    global money  # 글로벌에서 money를 가져온다
    global i  # 글로벌의 i 값을 가져와 이름 중복을 방지한다.
    print(f"Current balance :, {money} WON")  # f-string 을 사용한 money 출력
    name = str(input("Please enter your name :"))  # 이름 입력 str
    withdraw = int(input("How much money do you want to withdraw? :"))  # 인출값 입력 int

    if money - withdraw >= 0:  # 출력후 잔고가 0 이상인 경우에만 인출이 가능하다
        money = money - withdraw  # 출력후 잔고는 인출값을 빼준 값이다

        if name not in transaction_record:  # 이름 중복이 아닌경우 그대로 딕셔너리에 입력된다.
            transaction_record[name] = withdraw

        elif name in transaction_record:  # 이름 중복인 경우 숫자를 기입해 중복을 방지한다.
            transaction_record[name + str(i)] = withdraw
            i = i + 1

    else:
        print("Not enough money")  # 인출하고자 하는 값이 잔고보다 큰경우 잔고부족 출력


def check_transaction_record():  # check_transaction_record 함수
    print(f"Current Balance: {money} WON")  # 현재 잔고 출력
    print("transaction_record :")

    for idx, (key, val) in enumerate(transaction_record.items()):
        # 딕셔너리의 키와 값을 튜플로 묶고 enmuerate를 사용하여 인덱스까지 표시한다
        print(f"Transaction {idx+1} = Name: {key}, Withdraw: {val}")


Run_ATM()  # ATM 실행
