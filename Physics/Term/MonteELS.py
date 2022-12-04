import numpy as np
from multiprocessing import Pool
import time

S01 = 100  # AMD 기초자산
S02 = 100  # NETFLIX
r = 0.0125  # 무위험이자율 = 할인률
sigma1 = 0.5264  # 암드 변동성
sigma2 = 0.3084  # 넷플 변동성
corr = 0.2381  # 상관관계
T = 3  # 만기 3년짜리 상품
nStep = T * 252  # 만기(일) 총 스텝수
dt = 1 / 252
N = 1000  # 시뮬레이션 천번

# Knockin = 45  # 낙인 조건 45%
# face = 10000  # 액면가 만원
# D = [85, 85, 85, 85, 80, 75]  # 조기상환조건 6,12,18,24,30,36 개월차


def Cm(S, dt, r, sigma, nStep):
    Cm = [0] * (nStep + 1)  # 값을 저장하기위한 리스트 nStep + 1
    Z = np.random.standard_normal(size=nStep)  # 랜덤변수 생성
    for i in range(nStep):  # nStep 번 반복
        Cm[i] = S * np.exp((r - 0.5 * sigma ** 2) * dt + sigma * np.sqrt(dt) * Z[i])
        Cm[i + 1] = Cm[i] * np.exp(
            (r - 0.5 * sigma ** 2) * dt + sigma * np.sqrt(dt) * Z[i]
        )
    Cm = np.array(Cm)
    return Cm  # 몬테카를로 메소드로 계산된 3년간의 주가 흐름 리스트


def condition_7(cm1, cm2):  # 상품설명서 상의 손익구조 7번, 8번을 위한 조건 함수
    return all(cm > 45 for cm in cm1 + cm2)


def work(_):  # 워크 함수를 만들어 조건을 걸어 수익률 계산
    Cm1 = Cm(S01, T, r, sigma1, nStep)  # 암드와 넷플릭스 몬테카를로
    Cm2 = Cm(S02, T, r, sigma2, nStep)
    if Cm1[nStep // 6] > 85 and Cm2[nStep // 6] > 85:  # (1) 손익구조 조건과 수익률
        profit = 1.145 * np.exp(-r * 0.5)  # 보유기간으로 할인한 실질 수익률
    elif Cm1[2 * nStep // 6] > 85 and Cm2[2 * nStep // 6] > 85:  # (2)
        profit = 1.145 * np.exp(-r * 1)
    elif Cm1[3 * nStep // 6] > 85 and Cm2[3 * nStep // 6] > 85:  # (3)
        profit = 1.145 * np.exp(-r * 1.5)
    elif Cm1[4 * nStep // 6] > 85 and Cm2[4 * nStep // 6] > 85:  # (4)
        profit = 1.145 * np.exp(-r * 2)
    elif Cm1[5 * nStep // 6] > 80 and Cm2[5 * nStep // 6] > 80:  # (5)
        profit = 1.145 * np.exp(-r * 2.5)
    elif Cm1[6 * nStep // 6] > 75 and Cm2[6 * nStep // 6] > 75:  # (6)
        profit = 1.145 * np.exp(-r * 3)
    elif condition_7(Cm1, Cm2):  # (7) 컨디션 함수를 사용한 조건문
        profit = 1.145 * np.exp(-r * 3)
    elif not condition_7(Cm1, Cm2):  # (8) 둘중 최소값이 수익률이 된다
        profit = min(Cm1[6 * nStep // 6], Cm2[6 * nStep // 6]) / 100
        pass
    return profit


if __name__ == "__main__":  #
    with Pool(5) as p:  # 병렬 처리를 위한 Pool함수 사용
        start_time = time.time()  # 시간 측정을 위한 time 함수 사용
        result = p.map(work, [0] * N)  # 워크 함수를 1000번 수행해준다.
        pf = np.array(result)  # 리스트 정리
        mpf = np.mean(pf)  # 실제 나온 몬테카를로 시뮬레이션 리스트를 평균내어 공정가치를 구한다.
        print(mpf)
        print("--- %s seconds ---" % (time.time() - start_time))  # 걸린 시간


############################################
# 직렬 연산 코드

# profits = []
# start_time = time.time()
# for _ in range(N):
#     Cm1 = Cm(S01, T, r, sigma1, nStep)
#     Cm2 = Cm(S02, T, r, sigma2, nStep)
#     if Cm1[nStep // 6] > 85 and Cm2[nStep // 6] > 85:  # (1)
#         profit = 1.145 * np.exp(-r * 0.5)
#     elif Cm1[2 * nStep // 6] > 85 and Cm2[2 * nStep // 6] > 85:  # (2)
#         profit = 1.145 * np.exp(-r * 1)
#     elif Cm1[3 * nStep // 6] > 85 and Cm2[3 * nStep // 6] > 85:  # (3)
#         profit = 1.145 * np.exp(-r * 1.5)
#     elif Cm1[4 * nStep // 6] > 85 and Cm2[4 * nStep // 6] > 85:  # (4)
#         profit = 1.145 * np.exp(-r * 2)
#     elif Cm1[5 * nStep // 6] > 80 and Cm2[5 * nStep // 6] > 80:  # (5)
#         profit = 1.145 * np.exp(-r * 2.5)
#     elif Cm1[6 * nStep // 6] > 80 and Cm2[6 * nStep // 6] > 75:  # (6)
#         profit = 1.145 * np.exp(-r * 3)
#     elif condition_7(Cm1, Cm2):  # (7)
#         profit = 1.145 * np.exp(-r * 3)
#     elif not condition_7(Cm1, Cm2):  # (8)
#         profit = min(Cm1[6 * nStep // 6], Cm2[6 * nStep // 6]) / 100
#         pass
#     profits.append(profit)
# print("--- %s seconds ---" % (time.time() - start_time))
# pf = np.array(profits)
# mpf = np.mean(pf)
# print(mpf)
