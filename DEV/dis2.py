scores = [61, 95, 70, 99, 95, 99]
grade = [1 for _ in range(len(scores))]
i = 0
for s in scores:
    if s >= 95:
        grade[i] = 'A'
    i = i + 1
print(grade)