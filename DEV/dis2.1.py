scores = [61, 95, 70, 80, 95, 99, 99]
grade = [1 for _ in range(len(scores))]
for i, s in enumerate(scores):
    if s>=90 :
        grade[i] = 'A'
print(grade)
