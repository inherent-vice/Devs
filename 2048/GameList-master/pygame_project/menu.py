import pygame
from pygame import surface
from pygame import mouse
from pygame.constants import QUIT
import pygame.freetype
from pygame.sprite import Sprite
from pygame.rect import Rect
from enum import Enum
import subprocess
import os


BLUE = (106,159,181)
WHITE = (255,255,255)

def create_surface_with_text(text,font_size, text_rgb, bg_rgb):
    font = pygame.freetype.SysFont("Courier", font_size,bold=True)
    surface, _ = font.render(text= text, fgcolor=text_rgb, bgcolor = bg_rgb)
    return surface.convert_alpha()


class UIElement(Sprite):
    def __init__(self, center_position, text, font_size, bg_rgb, text_rgb,action=None):
        
        super().__init__()

        self.mouse_over = False

        defalut_image = create_surface_with_text(text,font_size,text_rgb,bg_rgb)

        highlighted_image = create_surface_with_text(text, font_size * 1.2, text_rgb,bg_rgb)
        

        self.images = [defalut_image,highlighted_image]

        self.rects = [
            defalut_image.get_rect(center = center_position),
            highlighted_image.get_rect(center = center_position)
        ]
        self.action = action
    @property
    def image(self):
        return self.images[1] if self.mouse_over else self.images[0]


    @property
    def rect(self):
        return self.rects[1] if self.mouse_over else self.rects[0]


    def update(self,mouse_pos, mouse_up):
        if self.rect.collidepoint(mouse_pos):
            self.mouse_over = True
            if mouse_up:
                return self.action
        else:
            self.mouse_over = False

    def draw(self, surface):
        surface.blit(self.image,self.rect)


class GameState(Enum):
    QUIT = -1
    TITLE = 0
    Pang = 1
    Tetris = 2
    Square = 3    


def main():
    pygame.init()

    screen = pygame.display.set_mode((800,800))

    game_state = GameState.TITLE

    while True:
        if game_state == GameState.TITLE:
            game_state = title_screen(screen)

        if game_state == GameState.Pang:
            game_state = GameState.TITLE
            subprocess.call(['python', './pygame_project/pang.py'])

        if game_state == GameState.Tetris:
            game_state = GameState.TITLE
            subprocess.call(['python', './pygame_project/tetris.py'])

        if game_state == GameState.Square:
            game_state = GameState.TITLE
            subprocess.call(['python', './pygame_project/2048.py'])

        if game_state == GameState.QUIT:
            pygame.quit()
            return



def title_screen(screen):

    pang_btn = UIElement(
        center_position= (400, 300),
        font_size= 30,
        bg_rgb= BLUE,
        text_rgb= WHITE,
        text = 'Pang',
        action=GameState.Pang
        )


    
    tetris_btn = UIElement(
        center_position= (400, 400),
        font_size= 30,
        bg_rgb= BLUE,
        text_rgb= WHITE,
        text = 'Tetris',
        action=GameState.Tetris
        )


    square_btn = UIElement(
        center_position= (400, 500),
        font_size= 30,
        bg_rgb= BLUE,
        text_rgb= WHITE,
        text = '2048',
        action=GameState.Square
        )

    quit_btn = UIElement(
        center_position= (400, 600),
        font_size= 30,
        bg_rgb= BLUE,
        text_rgb= WHITE,
        text = 'Quit',
        action=GameState.QUIT
        )
    
    

    buttons = [pang_btn, tetris_btn,square_btn, quit_btn]

    while True:
        mouse_up = False
        for event in pygame.event.get():
            if event.type == pygame.MOUSEBUTTONUP and (event.button ==1 or event.button ==2):
                mouse_up = True

        screen.fill(BLUE)

        for button in buttons:
            ui_action = button.update(pygame.mouse.get_pos(),mouse_up)
            if ui_action is not None:
                return ui_action
            button.draw(screen)
        pygame.display.flip()
    
main()


