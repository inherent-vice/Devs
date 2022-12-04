id_list = ["muzi", "frodo", "apeach", "neo"]
report = ["muzi frodo", "apeach frodo", "frodo neo", "muzi neo", "apeach muzi"]
k = 2


def solution(id_list, report, k):
    report_set = set(report)
    report = list(report_set)

    answer = []
    for i in range(len(id_list)):
        answer += [0]

    report_list = []
    for i in range(len(report)):
        report_list += report[i].split()

    report_name = []
    for i in range(len(report)):
        report_name.append(report_list[2 * i + 1])

    ban_list = []
    for i in range(len(id_list)):
        if report_name.count(id_list[i]) >= k:
            ban_list.append(id_list[i])

    for i in range(len(report)):
        if report[i].split()[1] in ban_list:
            for ii in range(len(id_list)):
                if id_list[ii] == report[i].split()[0]:
                    answer[ii] += 1
    return answer


print(solution(id_list, report, k))
