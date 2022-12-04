id_list = ["muzi", "frodo", "apeach", "neo"]
report = ["muzi frodo", "apeach frodo", "frodo neo", "muzi neo", "apeach muzi"]
k = 2


def solution(id_list, report, k):
    report_set = set(report)
    report = list(report_set)
    answer = [0] * len(id_list)

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
        if report[i].split()[1] in ban_list and report[i].split()[0] in id_list:
            answer[id_list.index(report[i].split()[0])] += 1

    return answer


print(solution(id_list, report, k))
