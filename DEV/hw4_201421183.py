class CashFlow:

    def __init__(self, name = 'Ajou', assets = 10000):
        
        self.CF = list()
        self.name = name
        self.assets = assets
        
    def set_name(self, set_name):

        self.name = str(set_name)

    def set_assets(self, set_assets):

        self.assets = set_assets

    def income(self, income):

        self.assets = self.assets + income
        self.CF.append(income)

    def expense(self, expense):

        if self.assets < expense:
            print('''can't afford''')
        else:
            self.assets = self.assets - expense
            self.CF.append(-expense)


    def print_cashflow(self):

        print(' '.join(str(n) for n in self.CF))


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
ajoucf.print_cashflow()