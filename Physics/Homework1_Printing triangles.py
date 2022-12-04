# Homework1_Printing triangles


def Arrangement():  # 정렬함수 생성
    while True:  # while 반복문으로 반복
        mode = int(
            input(
                "  Choose Mode \n 1. Left arrangement \n 2. Middle arrangement \n 3. Right arrangement \n  :"
            )
        )
        # mode는 input으로 정수를 입력받고 선택지 출력
        if mode < 1 or mode > 3:  # 조건을 걸어 중지
            quit()

        n = int(input(" The number of lines : "))  # 원하는 줄의 수를 input으로 정수입력

        for x in range(1, n + 1):  # for 문을 활용하여 1번부터 n번까지 반복하여 줄을 쌓는다
            text = "*" * ((x * 2) - 1)  # 각 줄의 *의 개수는 2n-1 로 정의

            if mode == 1:  # 1번모드 = 왼쪽 정렬 ljust 함수 사용
                print(text.ljust((n * 2) - 1))

            elif mode == 2:  # 2번모드 = 중간 정렬 center 함수 사용
                print(text.center((n * 2) - 1))

            elif mode == 3:  # 3번모드 = 오른쪽 정렬 rjust 함수 사용
                print(text.rjust((n * 2) - 1))


Arrangement()  # 정렬함수 실행
