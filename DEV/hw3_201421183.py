def Find_Prime(n):
    era = [True] * n
    m=int(n**0.5)
    for i in range(2, m+1):
        if era[i]:
            for j in range(i+i, n , i):
                era[j] = False
    
    return [i for i in range(2,n) if era[i]]

print(Find_Prime(1000))
