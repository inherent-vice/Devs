# CashFlow 클라스 만들기.이 클래스는 다음과 같은 요소들을 가지고 있어야한다.

# 1.- CashFlow 인스턴스를 선언할때 name 변수가 설정이 되고 값은 "Ajou"로 설정되어야한다.
#  또한 assets 변수가 설정이 되고 초기값은 숫자 10000

# 2. set_name 메서드를 만들어서 string을 input으로 받아서 클래스의 name 변수에 저장한다.

# 3. set_assets 메서드를 만들어서 숫자를 input으로 받아서 클래스의 assets 변수에 저장한다.

# 4. income 메서드를 만들어서 수입을 input으로 받아서 assets에 더한다.

# 5. expense 메서드를 만들어서 지출을 input으로 받아서 입력값이 현재 assets 보다 많은 경우 "Can't afford" 메시지를 출력하고 
#  현재 assets 보다 적은 경우 asset에서 지출을 뺀다.

# 6. print_cashflow 메서드를 만들어서 수입과 지출을 입력받은 순서대로 출력한다.  
#  단 수입은 그냥 숫자로 출력하고, 지출은 -를 붙여서 출력한다.


class CashFlow:

    def __init__(self, name = 'Ajou', assets = 10000):
        
        self.name = name
        self.assets = assets
        
    def set_name(self):

        self.name = str(input())

    def set_assets(self):

        self.assets = int(input())


    def income(self, income):

        self.assets = self.assets + int(income)

    def expense(self, expense):

        self.assets = self.assets - int(expense)

    # def print_cashflow(self):

# if self.assets < 0:
#     return str('can not afford')

ajoucf=CashFlow()

print(ajoucf.assets)
ajoucf.set_assets(20000)
ajoucf.set_name("ajoucf")
print(ajoucf.name)
print(ajoucf.assets)
ajoucf.expense(20001)
print(ajoucf.assets)
ajoucf.income(3000)
print(ajoucf.assets)
ajoucf.expense(20001)
print(ajoucf.assets)
ajoucf.income(200)
print(ajoucf.assets)
ajoucf.expense(1500)
print(ajoucf.assets)

# ajoucf.print_cashflow()

# 10000

# ajoucf

# 20000

# Can't afford

# 20000

# 23000

# 2999

# 3199

# 1699

# 3000 -20001 200 -1500 