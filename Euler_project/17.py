# 1부터 5까지의 수를 영어로 쓰면 one, two, three, four, five 이고,
# 각 단어의 길이를 더하면 3 + 3 + 5 + 4 + 4 = 19 이므로 사용된 글자는 모두 19개입니다.

# 1부터 1,000까지 영어로 썼을 때는 모두 몇 개의 글자를 사용해야 할까요?

# 참고: 빈 칸이나 하이픈('-')은 셈에서 제외하며, 단어 사이의 and 는 셈에 넣습니다.
#   예를 들어 342를 영어로 쓰면 three hundred and forty-two 가 되어서 23 글자,
#   115 = one hundred and fifteen 의 경우에는 20 글자가 됩니다.

one = len("one")
two = len("two")
three = len("three")
four = len("four")
five = len("five")
six = len("six")
seven = len("seven")
eight = len("eight")
nine = len("nine")
ten = len("ten")
eleven = len("eleven")
twelve = len("twelve")
thirteen = len("thirteen")
fourteen = len("fourteen")
fifteen = len("fifteen")
sixteen = len("sixteen")
seventeen = len("seventeen")
eighteen = len("eighteen")
nineteen = len("nineteen")
twenty = len("twenty")
thirty = len("thirty")
forty = len("forty")
fifty = len("fifty")
sixty = len("sixty")
seventy = len("seventy")
eighty = len("eighty")
ninety = len("ninety")
hundred = len("hundred")
thousand = len("thousand")

onedigit = one + two + three + four + five + six + seven + eight + nine  # 9개

teens = (
    ten
    + eleven
    + twelve
    + thirteen
    + fourteen
    + fifteen
    + sixteen
    + seventeen
    + eighteen
    + nineteen
)  # 10개

twodigit = (
    teens  # 10개
    + (twenty + thirty + forty + fifty + sixty + seventy + eighty + ninety)  # 8개
    + 9 * (twenty + thirty + forty + fifty + sixty + seventy + eighty + ninety)  # 72개
    + 8 * (onedigit)
)  # 90개

threedigit = (
    (onedigit + 9 * hundred)  # 9개
    + (9 * (onedigit + 9 * hundred) + (9 * 9 * 3) + 9 * onedigit)  # 81개
    + (90 * (onedigit + 9 * hundred) + (90 * 9 * 3) + 9 * twodigit)  # 810개
)

fourdigit = one + thousand

print(onedigit + twodigit + threedigit + fourdigit)
