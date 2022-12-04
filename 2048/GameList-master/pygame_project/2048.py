import logic 
import time
from pprint import pprint
from pynput import keyboard

if __name__ == '__main__': 
    mat = logic.start_game() 
    print("Commands are as follows : ") 
    print("'w' : Move Up") 
    print("'s' : Move Down") 
    print("'a' : Move Left") 
    print("'d' : Move Right") 
    print("'x' : exit")
    pprint(mat, indent=0, width=20)
    
while True:
    with keyboard.Events() as events: 
        event = events.get(9999)

        if event.key == keyboard.KeyCode.from_char('w'): 
            changed = logic.move_up(mat)
            mat, flag = logic.move_up(mat)

            status = logic.get_current_state(mat) 
            print(status)

            if(status == ''and changed): 
                logic.add_new_2(mat)

            elif (status !=''):
                break

        elif event.key == keyboard.KeyCode.from_char('s'):
            
            changed = logic.move_down(mat)            
            mat, flag = logic.move_down(mat) 
            status = logic.get_current_state(mat) 
            print(status) 
            if(status == ''and changed): 
                logic.add_new_2(mat)

            elif (status !=''):
                break

        elif event.key == keyboard.KeyCode.from_char('a'):

            changed = logic.move_left(mat)            
            mat, flag = logic.move_left(mat) 
            status = logic.get_current_state(mat) 
            print(status) 
            if(status == ''and changed): 
                logic.add_new_2(mat)

            elif (status !=''):
                break

        elif event.key == keyboard.KeyCode.from_char('d'):
            changed = logic.move_right(mat)            
            mat, flag = logic.move_right(mat) 
            status = logic.get_current_state(mat) 
            print(status) 
            if(status == ''and changed): 
                logic.add_new_2(mat)

            elif (status !=''):
                break

        elif event.key == keyboard.KeyCode.from_char('x'):
            exit()
            
        else:
            print("Invalid Key Pressed")

    pprint(mat, indent=0, width=20)
    time.sleep(1)
