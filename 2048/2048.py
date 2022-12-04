# geeksforgeeks 2048 참고
import logic # 로직을 불러온다
import time # 시간 모듈
from pprint import pprint # 행렬을 시각화 하기위한 모듈
from pynput import keyboard # 키입력을 실시간으로 받는 모듈

if __name__ == '__main__': 
    mat = logic.start_game() 
    print("Commands are as follows : ") 
    print("'w' : Move Up") 
    print("'s' : Move Down") 
    print("'a' : Move Left") 
    print("'d' : Move Right") 
    print("'x' : exit")
    pprint(mat, indent=0, width=20) # 1차원 행렬을 2차원으로 표시한다.
    
while True: #pynput을 통한 키입력
    with keyboard.Events() as events: 
        event = events.get(9999) # 입력을 오래 기다린다.

        if event.key == keyboard.KeyCode.from_char('w'): # w 커맨드를 입력하면 로직이 작동한다.
            changed = logic.move_up(mat)
            mat, flag = logic.move_up(mat)

            status = logic.get_current_state(mat) 
            print(status) #로직 작동후 현재상태를 출력한다.

            if(status == ''and changed): 
                logic.add_new_2(mat) # 빈공간을 계속 진행으로 정의하였다.

            elif (status !=''):
                break

        elif event.key == keyboard.KeyCode.from_char('s'): # s 커맨드를 입력하면 로직이 작동한다.
            
            changed = logic.move_down(mat)            
            mat, flag = logic.move_down(mat) 
            status = logic.get_current_state(mat) 
            print(status) 
            if(status == ''and changed): 
                logic.add_new_2(mat)

            elif (status !=''):
                break

        elif event.key == keyboard.KeyCode.from_char('a'): # a 커맨드를 입력하면 로직이 작동한다.

            changed = logic.move_left(mat)            
            mat, flag = logic.move_left(mat) 
            status = logic.get_current_state(mat) 
            print(status) 
            if(status == ''and changed): 
                logic.add_new_2(mat)

            elif (status !=''):
                break

        elif event.key == keyboard.KeyCode.from_char('d'): # d 커맨드를 입력하면 로직이 작동한다.
            changed = logic.move_right(mat)            
            mat, flag = logic.move_right(mat) 
            status = logic.get_current_state(mat) 
            print(status) 
            if(status == ''and changed): 
                logic.add_new_2(mat)

            elif (status !=''):
                break

        elif event.key == keyboard.KeyCode.from_char('x'):
            exit() #종료 커맨드
            
        else:
            print("Invalid Key Pressed") # 이외의 키를 입력했을때 표시

    pprint(mat, indent=0, width=20)# 최종결과 출력
    time.sleep(1) #중복 키입력 방지를 위한 지연
