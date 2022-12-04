"""Final Project_Group16_201621494_오다빈 / 참조 : 2016 Kenichiro Tanaka"""
import sys
from math import sqrt
from random import randint
import pygame
from pygame.locals import QUIT, KEYDOWN, K_LEFT, K_RIGHT, K_DOWN, K_SPACE

#7개의 블록 종류별로 회전하는 경우까지 모두 표현
BLOCK_DATA = (
    (
        (0,0,1, 1,1,1, 0,0,0),
        (0,1,0, 0,1,0, 0,1,1),
        (0,0,0, 1,1,1, 1,0,0),
        (1,1,0, 0,1,0, 0,1,0)
    ),
    (
        (2,0,0, 2,2,2, 0,0,0),
        (0,2,2, 0,2,0, 0,2,0),
        (0,0,0, 2,2,2, 0,0,2),
        (0,2,0, 0,2,0, 2,2,0)
    ),
    (
        (0,3,0, 3,3,3, 0,0,0),
        (0,3,0, 0,3,3, 0,3,0),
        (0,0,0, 3,3,3, 0,3,0),
        (0,3,0, 3,3,0, 0,3,0)
    ),
    (
        (4,4,0, 0,4,4, 0,0,0),
        (0,0,4, 0,4,4, 0,4,0),
        (0,0,0, 4,4,0, 0,4,4),
        (0,4,0, 4,4,0, 4,0,0)
    ),
    (
        (0,5,5, 5,5,0, 0,0,0),
        (0,5,0, 0,5,5, 0,0,5),
        (0,0,0, 0,5,5, 5,5,0),
        (5,0,0, 5,5,0, 0,5,0)
    ),
    (
        (6,6,6,6),
        (6,6,6,6),
        (6,6,6,6),
        (6,6,6,6)
    ),
    (
        (0,7,0,0, 0,7,0,0, 0,7,0,0, 0,7,0,0),
        (0,0,0,0, 7,7,7,7, 0,0,0,0, 0,0,0,0),
        (0,0,7,0, 0,0,7,0, 0,0,7,0, 0,0,7,0),
        (0,0,0,0, 0,0,0,0, 7,7,7,7, 0,0,0,0)
    )
)

class Block:
    def __init__(self, count):                  #블록 개체
        self.turn = randint(0, 3)                   #생성되는 블럭의 회전 상태 결정, randint함수 : 지정한 숫자 내에서 난수 생성
        self.type = BLOCK_DATA[randint(0, 6)]       #생성되는 블럭의 종류
        self.data = self.type[self.turn]            #생성되는 블럭 종류에 회전 상태가 포함된 내용이 들어감(1차원)
        self.size = int(sqrt(len(self.data)))       #self.data의 길이를 제곱근으로 계산(self.data의 길이가 9->3*3블록)
        self.xpos = randint(2, 8 - self.size)       #x축 (2~ 8-size) ->약간 왼쪽에서 생성
        self.ypos = 1 - self.size                   #y축 (1-size)
        self.fire = count + INTERVAL                #블럭이 낙하하기 시작하는 시간

    def update(self, count):                    #블록 상태 갱신 (소거한 단의 수를 반환)
        erased = 0                                  # x_offset, y_offset 은 BLOCK_DATA에서 위치를 계산하기 위해 사용
        if is_overlapped(self.xpos, self.ypos + 1, self.turn):
            for y_offset in range(BLOCK.size):                                                  #이중 포문으로 블록의 한칸한칸 모두 확인
                for x_offset in range(BLOCK.size):
                    if 0 <= self.xpos+x_offset < WIDTH and 0 <= self.ypos+y_offset < HEIGHT:
                        val = BLOCK.data[y_offset*BLOCK.size + x_offset]                        #인덱스 번호가 바뀌는 것
                        if val != 0:                                                            #아래 부딪힌 경우 그 모양을 복사하여 자리에 둔다
                            FIELD[self.ypos+y_offset]\
                                 [self.xpos+x_offset] = val

            erased = erase_line()                   #행이 모두 차면 지우는 함수
            go_next_block(count)                    #다음 블록으로 전환하는 함수
                                                    #여기까지 블록이 쌓이는 로직
        if self.fire < count:                       #낙하 시작한시간 self.fire이 count보다 작으면 낙하중이고
            self.fire = count + INTERVAL            #다음 낙하할 때가 안됐으면 self.fire에 count와 interval을 더해 숫자 갱신
            self.ypos += 1                          #한 칸 내려오는 것
        return erased                               #위에서의 erased 반환한다.

    def draw(self):                             #블록 그리기
        for index in range(len(self.data)):
            xpos = index % self.size
            ypos = index // self.size
            val = self.data[index]
            if 0 <= ypos + self.ypos < HEIGHT and 0 <= xpos + self.xpos < WIDTH and val != 0:
                x_pos = 25 + (xpos + self.xpos) * 25        #왼쪽벽테두리까지 거리25(한 칸당25) + 칸수*25
                y_pos = 25 + (ypos + self.ypos) * 25
                pygame.draw.rect(SURFACE, COLORS[val],      #draw 매서드는 (대상,색상,범위
                                 (x_pos, y_pos, 24, 24))    #24,24크기만 색상을 넣어 블록사이가 배경색으로 된 선이 보이게 함

def erase_line():                               #꽉찬 행 지우기
    erased = 0
    ypos = 20                                       #ypos를 20으로 초기화, HEIGHT-2 (0부터시작해서1+ 벽한칸1)
    while ypos >= 0:                                #가장 아랫줄부터 행이 꽉찼는지 검사(ypos가 0될때까지 if문 수행)
        if all(FIELD[ypos]):                        #all함수 : 인수 배열요소가 모두 True면 True반환
            erased += 1                             #if문 성립하면 삭제한 행의 카운터 erased를 +1(지운 줄의 수)
            del FIELD[ypos]                         #ypos번째 행 삭제
            FIELD.insert(0, [8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8])   #삭제한 만큼 insert메서드를 이용하여 맨 위의 행에 추가(8은 좌우 벽)
        else:                                       #all함수 false일 경우
            ypos -= 1
    return erased

def is_game_over():                             #gameover여부확인
    filled = 0
    for cell in FIELD[0]:                       #FIELD의 가장 윗줄인 0번째 행을 순환하며 확인
        if cell != 0:
            filled += 1
    return filled > 2                           #양쪽벽이 1씩 차지해서 2 이상일 경우 TRUE

def go_next_block(count):                       #낙하 중인 블럭을 다음 블럭으로 전환하는 함수
    global BLOCK, NEXT_BLOCK                    #전역변수를 가져와서 값을 수정하기 때문에 global사용
    BLOCK = NEXT_BLOCK if NEXT_BLOCK != None else Block(count)  #class로 정의한 블럭개체 생성
    NEXT_BLOCK = Block(count)                   #새 블럭 대입해 놓는 것

def is_overlapped(xpos, ypos, turn):            #블럭이 다른 블록과 충돌하는지 여부 확인
    data = BLOCK.type[turn]                     #data에 블럭의 type과 turn을 반영한 1차원 리스트 저장
    for y_offset in range(BLOCK.size):          #순환변수가 블럭의 사이즈 대로 한칸한칸 순환하도록 이중포문
        for x_offset in range(BLOCK.size):
            if 0 <= xpos+x_offset < WIDTH and 0 <= ypos+y_offset < HEIGHT:
                                    #데이터가 유효한 범위내에 있고 순환할 때
                if data[y_offset*BLOCK.size + x_offset] != 0 and FIELD[ypos+y_offset][xpos+x_offset] != 0:
                                    #순환하는 자리의 값이 0이 아니고(블럭이 있고) and 필드의 그 자리에 0이 아니면    =   (충돌했다면)
                    return True     #충돌했다면 -> True반환
    return False

# 전역 변수 선언
pygame.init()
pygame.key.set_repeat(30, 30)
SURFACE = pygame.display.set_mode([600, 600])                   #화면에 그리기
FPSCLOCK = pygame.time.Clock()                                  #프레임레이트 조절
WIDTH = 12                                                      #FIELD의 폭
HEIGHT = 22                                                     #FIELD의 높이
INTERVAL = 40                                                   #블럭이 낙하하는 프레임 간격
FIELD = [[0 for _ in range(WIDTH)] for _ in range(HEIGHT)]      #필드
COLORS = ((0, 0, 0), (255, 165, 0), (0, 0, 255), (0, 255, 128), (0, 255, 0), (128, 0, 255), (255, 128, 0), (255, 0, 0), (128, 128, 128))
BLOCK = None
NEXT_BLOCK = None
running = True

def main():                                                 #메인 함수
    global INTERVAL                                         #전역변수 끌고오기 때문에 global
    count = 0                                               #count, score, game_over 초기화
    score = 0
    game_over = False
    smallfont = pygame.font.SysFont(None, 40)               #점수나타낼 폰트(작게)
    largefont = pygame.font.SysFont(None, 72)               #게임오버 나타낼 폰트(크게)
    message_over = largefont.render("GAME OVER!!",          #메시지 나타낼 위치 초기화
                                    True, (0, 255, 225))
    message_rect = message_over.get_rect()
    message_rect.center = (300, 300)

    go_next_block(INTERVAL)

    for ypos in range(HEIGHT):
        for xpos in range(WIDTH):
            FIELD[ypos][xpos] = 8 if xpos == 0 or \
                                     xpos == WIDTH - 1 else 0
    for index in range(WIDTH):
        FIELD[HEIGHT - 1][index] = 8

    while True:
        key = None
        for event in pygame.event.get():                    #이벤트를 하나씩 불러오기
            if event.type == QUIT:                          #이벤트 종료가 감지되면
                pygame.quit()                               #pygame의 초기화를 해제하고
                sys.exit()                                  #게임을 종료시킴
            elif event.type == KEYDOWN:                     #만약 키가 눌렸다면
                key = event.key                             #그 값을 key에 저장

        game_over = is_game_over()                          #is_game_over()를 실행시킨다
        if not game_over:                                   #게임오버 아닌 경우 실행
            count += 5                                      #0이었던 count에 +5
            if count % 1000 == 0:                           #count가 1000의 배수가 될때마다
                INTERVAL = max(1, INTERVAL - 2)             #INTERVAL을 2씩 줄인다(블럭 낙하속도 증가)
            erased = BLOCK.update(count)                    #블럭 class의 update메서드 실행, 매 프레임마다 블럭의 상태가 갱신,
                                                            #erased에는 삭제한 행의 개수가 반환됨
            if erased > 0:                                  #삭제된 칸이 있다면
                score += (2 ** erased) * 100                #점수를 높인다(한꺼번에 많이 지우면 점수획득량 많음)

            # 키 이벤트 처리
            next_x, next_y, next_t = BLOCK.xpos, BLOCK.ypos, BLOCK.turn
            if key == K_SPACE:
                next_t = (next_t + 1) % 4                   #next_t에 1더해서 4로나눈 나머지 (회전시키기)
            elif key == K_RIGHT:                            #오른쪽으로 1칸 이동
                next_x += 1
            elif key == K_LEFT:                             #왼쪽으로 1칸 이동
                next_x -= 1
            elif key == K_DOWN:                             #아래쪽으로 1칸 이동
                next_y += 1

            if not is_overlapped(next_x, next_y, next_t):   #next_x,y,t가 충돌하는지 is_overlapped로 검사 후 충돌 아닌 경우에만 갱신
                BLOCK.xpos = next_x
                BLOCK.ypos = next_y
                BLOCK.turn = next_t
                BLOCK.data = BLOCK.type[BLOCK.turn]

        # 배경, 낙하 중인 블럭 그리기
        SURFACE.fill((0, 0, 0))                             #전체 배경 칠하기
        for ypos in range(HEIGHT):                          #이중포문으로 필드 그리기
            for xpos in range(WIDTH):
                val = FIELD[ypos][xpos]
                pygame.draw.rect(SURFACE, COLORS[val],
                                 (xpos * 25 + 25, ypos * 25 + 25, 24, 24))
        BLOCK.draw()                                        #블럭 그리기

        # 다음 블럭 그리기
        for ypos in range(NEXT_BLOCK.size):                 #NEXT_BLOCK의 사이즈만큼만 순환하면서 그림을 그린다
            for xpos in range(NEXT_BLOCK.size):
                val = NEXT_BLOCK.data[xpos + ypos * NEXT_BLOCK.size]
                pygame.draw.rect(SURFACE, COLORS[val],
                                 (xpos * 25 + 460, ypos * 25 + 100, 24, 24))    #왼쪽에서 460, 위에서 100의 위치에 다음 블럭을 표시

        # 점수 나타내기
        score_str = str(score).zfill(6)
        score_image = smallfont.render(score_str,
                                       True, (0, 255, 0))
        SURFACE.blit(score_image, (480, 30))                #왼쪽위에 점수 표시

        if game_over:                                       #게임오버시 메시지 표시
            SURFACE.blit(message_over, message_rect)

        

            
            

        pygame.display.update()                             #위에 그린 모든 것을 화면에 반영
        FPSCLOCK.tick(15)                                   #프레임레이트 설정
        
if __name__ == '__main__':
    main()
