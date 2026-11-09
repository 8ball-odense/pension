class Account {
    constructor(name, balance, taxRate, type) {
        this.name = name;
        this.balance = balance;
        this.taxRate = taxRate;
        this.type = type;
    }

    addAnnualReturn(grossReturnRate) {
        if (this.balance <= 0 || grossReturnRate <= 0) return 0;

        switch (this.type) {
            case "free": {
                const grossReturn = this.balance * grossReturnRate;
                const threshold = TAX_RATES.FREE_RETURN_THRESHOLD;
                const lowRate = TAX_RATES.FREE_MONEY;
                const highRate = TAX_RATES.FREE_MONEY_HIGH;
                let tax = 0;

                if (grossReturn <= threshold) {
                    tax = grossReturn * lowRate;
                } else {
                    tax = threshold * lowRate + (grossReturn - threshold) * highRate;
                }

                this.balance += grossReturn - tax;
                return tax;
            }
            case "home":
                this.balance *= (1 + TAX_RATES.PROPERTY_GROWTH);
                return 0;
            default: {
                const grossReturn = this.balance * grossReturnRate;
                const tax = grossReturn * this.taxRate;
                this.balance += grossReturn - tax;
                return tax;
            }
        }
    }

    deposit(amount) {
        if (amount <= 0) return;
        this.balance += amount;
    }

    withdraw(amount) {
        const actualWithdrawn = Math.min(this.balance, amount);
        this.balance -= actualWithdrawn;
        return actualWithdrawn;
    }
}