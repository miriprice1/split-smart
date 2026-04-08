"""
Smart debt settlement algorithm.
Minimizes the number of transactions needed to settle all debts in a group.

Algorithm:
1. Calculate net balance per person (paid - fair_share)
2. Creditors have positive balance, debtors have negative balance
3. Greedily match largest creditor with largest debtor
4. This produces the minimum number of transactions
"""

from typing import List, Dict, Tuple


def calculate_settlements(payments: Dict[str, float]) -> List[Dict]:
    """
    Given a dict of {name: amount_paid}, calculate minimum transactions to settle.

    Returns list of {from: str, to: str, amount: float}
    """
    total = sum(payments.values())
    n = len(payments)
    if n == 0:
        return []

    fair_share = total / n

    # Net balance: positive = owed money, negative = owes money
    balances = {name: round(paid - fair_share, 2) for name, paid in payments.items()}

    # Separate into creditors and debtors
    creditors = sorted(
        [(name, bal) for name, bal in balances.items() if bal > 0.01],
        key=lambda x: x[1], reverse=True
    )
    debtors = sorted(
        [(name, -bal) for name, bal in balances.items() if bal < -0.01],
        key=lambda x: x[1], reverse=True
    )

    transactions = []
    creditors = list(creditors)
    debtors = list(debtors)

    i, j = 0, 0
    while i < len(creditors) and j < len(debtors):
        cred_name, cred_amount = creditors[i]
        debt_name, debt_amount = debtors[j]

        transfer = round(min(cred_amount, debt_amount), 2)

        transactions.append({
            "from": debt_name,
            "to": cred_name,
            "amount": transfer
        })

        creditors[i] = (cred_name, round(cred_amount - transfer, 2))
        debtors[j] = (debt_name, round(debt_amount - transfer, 2))

        if creditors[i][1] < 0.01:
            i += 1
        if debtors[j][1] < 0.01:
            j += 1

    return transactions


if __name__ == "__main__":
    # Test with the example from the spec
    payments = {
        "מירי": 400,
        "דנה": 200,
        "יוסי": 0,
        "נועה": 0,
    }
    result = calculate_settlements(payments)
    print("Settlements:")
    for t in result:
        print(f"  {t['from']} → {t['to']}: {t['amount']}₪")
    print(f"Total transactions: {len(result)}")
