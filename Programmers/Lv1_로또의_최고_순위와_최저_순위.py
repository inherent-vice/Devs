# 1	6개 번호가 모두 일치
# 2	5개 번호가 일치
# 3	4개 번호가 일치
# 4	3개 번호가 일치
# 5	2개 번호가 일치
# 6(낙첨)	그 외

lottos = [38, 19, 20, 40, 15, 25]
win_nums = [38, 19, 20, 40, 15, 25]


def solution(lottos, win_nums):
    answer = [7, 7]
    for i in range(6):
        if win_nums[i] in lottos:
            answer[1] -= 1
            answer[0] -= 1
        if lottos[i] == 0:
            answer[0] -= 1
    if answer[1] == 7:
        answer[1] = 6
    if answer[0] == 7:
        answer[0] = 6
    return answer


print(solution(lottos, win_nums))
