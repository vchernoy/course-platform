```calc
starting_deposit = 10000
input principal = starting_deposit in 0..1000000
input rate = 8 in 0..100
input years = 10 in 1..50
final = principal * (1 + rate / 100) ^ years
```

::edit[Deposit (starts at {{starting_deposit | fixed:2}})]{input=principal}

::slider[Annual rate (%) ]{input=rate step=0.5}

::edit[Years]{input=years step=1}

Future value: **:value[final]{format=fixed:2}**.

$$P_n = {{principal | fixed}} (1 + {{rate}}/100)^{{years}} = {{final | fixed:2}}$$
