# 다음은 달력에 관한 몇 가지 일반적인 정보입니다 (필요한 경우 좀 더 연구를 해 보셔도 좋습니다).

# 1900년 1월 1일은 월요일이다.
# 4월, 6월, 9월, 11월은 30일까지 있고, 1월, 3월, 5월, 7월, 8월, 10월, 12월은 31일까지 있다.
# 2월은 28일이지만, 윤년에는 29일까지 있다.
# 윤년은 연도를 4로 나누어 떨어지는 해를 말한다. 하지만 400으로 나누어 떨어지지 않는 매 100년째는 윤년이 아니며, 400으로 나누어 떨어지면 윤년이다
# 20세기 (1901년 1월 1일 ~ 2000년 12월 31일) 에서, 매월 1일이 일요일인 경우는 총 몇 번입니까?

a = list(range(1, 31 + 1))
b = list(range(1, 30 + 1))
c = list(range(1, 28 + 1))
d = list(range(1, 29 + 1))

date = []
for i in range(1901, 2000 + 1):
    if i % 4 == 0:
        date += a + d + a + b + a + b + a + a + b + a + b + a
    else:
        date += a + c + a + b + a + b + a + a + b + a + b + a

first = []
for i in range(len(date)):
    if date[i] == 1:
        first.append(i + 2)

result = 0
for i in range(len(first)):
    if first[i] % 7 == 0:
        result += 1

print(result)
