# 1. Monte-Carlo Method
import numpy as np

S01 = 100  # AMD 기초자산
S02 = 100  # NETFLIX
r = 0.07  # 무위험이자율 = 할인률
sigma1 = 0.5264  # 암드 변동성
sigma2 = 0.3084  # 넷플 변동성
corr = 0.2381  # 상관관계
T = 3  # 만기 3년짜리 상품
nStep = T * 252  # 만기(일) 총 스텝수
dt = 1 / 252
N = 100  # 시뮬레이션 만번

Knockin = 45  # 낙인 조건 45%
face = 10000  # 액면가 만원
D = [85, 85, 85, 85, 80, 75]  # 조기상환조건 6,12,18,24,30,36 개월차


def MC_general(S, T, r, sigma, N):
    Cm = []  # 몬테카를로 시행으로 만들어지는 값을 저장하기위한 리스트
    Z = np.random.standard_normal(size=N)  # 랜덤변수 생성
    for i in range(N):  # N번 반복
        ST = S * np.exp(
            (r - 0.5 * sigma ** 2) * T + sigma * np.sqrt(T) * Z[i]
        )  # 만기시의 가격  # 디스카운트를 고려한 payoff
        Cm.append(ST)  #  Cm에 추가

    Cm = np.array(Cm)
    am = Cm.mean()  # Cm 리스트에 있는 값의 평균값을 구해준다.
    return Cm  # 몬테카를로 메소드로 계산된 옵션의 가치


Cm1 = MC_general(S01, dt, r, sigma1, nStep)
# Cm2 = Cm(S02, dt, r, sigma2, nStep)

# if i in range(1,126+1):
#     Cm1[i] > 85 and Cm2>85:
#     profit=pow(1.125,0.5)/pow(1+r*365,0.5)
# elif Cm1 > 0.85 and Cm2>0.85:
#     profit=pow(1.125,1)/pow(1+r*365,1)
# elif Cm1 > 0.85 and Cm2>0.85:
#     profit=pow(1.125,1.5)/pow(1+r*365,1.5)
# elif Cm1 > 0.85 and Cm2>0.85:
#     profit=pow(1.125,2)/pow(1+r*365,2)
# elif Cm1 > 0.80 and Cm2>0.80:
#     profit=pow(1.125,2)/pow(1+r*365,2)

print(Cm1)
# print(Cm2)
