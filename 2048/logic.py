# geeksforgeeks 2048 참고
import random 

def start_game(): # 게임 시작과 동시에 4x4 행렬 생성한다.

    mat = [] 
    for i in range(4): 
        mat.append([0] * 4) 

    add_new_2(mat) 
    return mat

def add_new_2(mat): # 새로운 2를 생성한다.

    r = random.randint(0, 3) 
    c = random.randint(0, 3) 


    while(mat[r][c] != 0): 
        r = random.randint(0, 3) 
        c = random.randint(0, 3) 

    mat[r][c] = 2 # 1행1열에서 4행4열까지 빈공간을 찾아 2를 넣는다.


def get_current_state(mat):  #현재 상태를 표시한다.

    for i in range(4): # 어느칸이라도 2048이 존재하면 승리한다.
        for j in range(4): 
            if(mat[i][j]== 2048): 
                return 'Won'
 
    for i in range(4): # 빈칸이 존재한다면 계속 진행한다.
        for j in range(4): 
            if(mat[i][j]== 0): 
                return ''

    for i in range(3): # 붙어있는 칸에 같은 숫자가 존재하면 합쳐질수 있으므로 계속진행.
        for j in range(3): 
            if(mat[i][j]== mat[i + 1][j] or mat[i][j]== mat[i][j + 1]): 
                return ''

    for j in range(3): 
        if(mat[3][j]== mat[3][j + 1]): 
            return ''

    for i in range(3): 
        if(mat[i][3]== mat[i + 1][3]): 
            return ''


    return 'Lost' # 어느것도 해당하지 않으면 패배
 
def compress(mat): # 한쪽 벽으로 몰아 넣는 함수

    changed = False

    new_mat = [] 

    for i in range(4): 
        new_mat.append([0] * 4) 
        

    for i in range(4): 
        pos = 0

        for j in range(4): 
            if(mat[i][j] != 0): 
                
                new_mat[i][pos] = mat[i][j] 
                
                if(j != pos): 
                    changed = True
                pos += 1

    return new_mat, changed 

def merge(mat): #합쳐질 수 있다면 서로 합친 상태를 표시하고 빈공간을 0으로 채워넣는다.
    
    changed = False
    
    for i in range(4): 
        for j in range(3): 

            if(mat[i][j] == mat[i][j + 1] and mat[i][j] != 0): 

                mat[i][j] = mat[i][j] * 2
                mat[i][j + 1] = 0

                changed = True

    return mat, changed 

def reverse(mat): # 행렬을 리버스 한다.
    new_mat =[] 
    for i in range(4): 
        new_mat.append([]) 
        for j in range(4): 
            new_mat[i].append(mat[i][3 - j]) 
    return new_mat 

def transpose(mat):# 행렬을 트랜스포즈 한다.
    new_mat = [] 
    for i in range(4): 
        new_mat.append([]) 
        for j in range(4): 
            new_mat[i].append(mat[j][i]) 
    return new_mat 

def move_left(grid): # 왼쪽으로 몰아넣어 합친다.

    new_grid, changed1 = compress(grid) 

    new_grid, changed2 = merge(new_grid) 
    
    changed = changed1 or changed2 

    new_grid, temp = compress(new_grid) 

    return new_grid, changed 

def move_right(grid): #리버스를 이용하여 오른쪽으로 가는 커맨드 구현.

    new_grid = reverse(grid) 

    new_grid, changed = move_left(new_grid) 

    new_grid = reverse(new_grid) 
    return new_grid, changed 

def move_up(grid): # 트랜스 포즈를 이용하여 위로가는 커맨드를 구현하였다.

    new_grid = transpose(grid) 

    new_grid, changed = move_left(new_grid) 

    new_grid = transpose(new_grid) 
    return new_grid, changed 
 
def move_down(grid): # 트랜스 포즈와 오른쪽 커맨드를 이용하여 아래 커맨드 구현.

    new_grid = transpose(grid) 

    new_grid, changed = move_right(new_grid) 

    new_grid = transpose(new_grid) 
    return new_grid, changed 