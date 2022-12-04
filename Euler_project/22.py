# 여기 5천개 이상의 영문 이름들이 들어있는 46KB짜리 텍스트 파일 names.txt 이 있습니다 (우클릭해서 다운로드 받으세요).
# 이제 각 이름에 대해서 아래와 같은 방법으로 점수를 매기고자 합니다.

# 먼저 모든 이름을 알파벳 순으로 정렬합니다.
# 각 이름에 대해서, 그 이름을 이루는 알파벳에 해당하는 수(A=1, B=2, ..., Z=26)를 모두 더합니다.
# 여기에 이 이름의 순번을 곱합니다.
# 예를 들어 "COLIN"의 경우, 알파벳에 해당하는 수는 3, 15, 12, 9, 14이므로 합이 53, 그리고 정렬했을 때 938번째에 오므로 최종 점수는 938 × 53 = 49714가 됩니다.

# names.txt에 들어있는 모든 이름의 점수를 계산해서 더하면 얼마입니까?

with open("c:/Devs/Euler_project/22names.txt") as f:
    names = f.read().replace('"', "").split(",")

names.sort()
names_point = 0
A = ord("A")
for i in range(len(names)):
    point = 0
    for j in range(len(names[i])):
        point += ord(names[i][j]) - A + 1
    point *= i + 1
    names_point += point

print(names_point)
