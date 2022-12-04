#2 Implied Volatility
# 다음은 11월 2일 옵션들의 종목별 종가이다. 
# 11월 2일 코스피 200 지수는 394.82로 마감했다. 또한 CD 91일물은 1.120이다. 
# 코스피200 지수 옵션은 매달 두번째 목요일이  만기이다.(11월 11일 만기)
# 1)이자율을 CD91일물을 이용하여서 Implied volatility 의 그래프를 그리시오
# 파일 포맷은 hw2_1_학번.png (예시:hw2_1_202133333.png)로 저장
# 실습 코드와 같이 x축은 K y축은 Implied Volatility로 설정하세요
# 2)이자율을 종목별로 Put-Call parity를 이용하여서 Implied volatility그래프를 그리시오
# 파일 포맷은 hw2_2_학번.png로 저장
# 3) 코드 제출 (파일명은 hw2_3_학번.** 으로 저장포맷은 상관없음) 

# 1)이자율을 CD91일물을 이용하여서 Implied volatility 의 그래프를 그리시오
# 파일 포맷은 hw2_1_학번.png (예시:hw2_1_202133333.png)로 저장
# 실습 코드와 같이 x축은 K y축은 Implied Volatility로 설정하세요
# 콜옵션에 대해서만 그래프를 그리시면 됩니다
# 2)이자율을 각 종목별로 Put-Call parit를 이용하여서 Implied volatility그래프를 그리시오
# 파일 포맷은 hw2_2_학번.png로 저장
# 3) 코드 제출 (파일명은 hw2_3_학번.** 으로 저장포맷은 상관없음) 


def MC_general(S, Gamma, T, mu, r, sigma, N, dt):
