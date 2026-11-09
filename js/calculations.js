function getNumber(id) {
    const el = document.getElementById(id);
    const cleanString = el.value.toString().replace(/\./g, "").replace(",", ".");
    return parseFloat(cleanString);
}

function collectSimulationInputs() {
    return {
        kevAge: getNumber("kevAge"),
        katAge: getNumber("katAge"),
        kevRetire: getNumber("kevRetire"),
        katRetire: getNumber("katRetire"),
        kevLifespan: getNumber("kevLifespan"),
        katLifespan: getNumber("katLifespan"),
        kevPensionPayoutAge: getNumber("kevPensionPayoutAge"),
        katPensionPayoutAge: getNumber("katPensionPayoutAge"),
        kevAopPayoutAge: getNumber("kevAopPayoutAge"),
        katAopPayoutAge: getNumber("katAopPayoutAge"),
        targetGoGo: getNumber("targetIncomeGoGo") * 12,
        targetSlowGo: getNumber("targetIncomeSlowGo") * 12,
        targetNoGo: getNumber("targetIncomeNoGo") * 12,
        inflationRate: getNumber("inflationRate") / 100,
        grossReturn: getNumber("returnRate") / 100,
        includeHousing: document.getElementById("includeHousingToggle").checked,
        homeSaleAge: getNumber("homeSaleAge"),
        homeSalePayout: getNumber("homeSalePayout"),
        monthlyFreeSavings: getNumber("sharedFreeMoneyMonthly"),
        kevAopMonthly: getNumber("kevAgeSavingMonthly"),
        katAopMonthly: getNumber("katAgeSavingMonthly"),
        kevStatePensionAge: getNumber("kevStatePensionAge"),
        katStatePensionAge: getNumber("katStatePensionAge"),
        kevStatePension: getNumber("kevStatePension") * 12,
        katStatePension: getNumber("katStatePension") * 12,
        kevSalary: getNumber("kevSalary") * 12,
        katSalary: getNumber("katSalary") * 12,
        homePurchaseAge: getNumber("shAge"),
        homePurchasePrice: getNumber("shPrice"),
        homeDownPayment: getNumber("shDownPayment"),
        kevPensionPercent: getNumber("kevPensionPercent") / 100,
        katPensionPercent: getNumber("katPensionPercent") / 100,
        sharedFreeMoney: getNumber("sharedFreeMoney"),
        kevAsk: getNumber("kevAsk"),
        katAsk: getNumber("katAsk"),
        kevWorkPension: getNumber("kevWorkPension"),
        katWorkPension: getNumber("katWorkPension"),
        kevAgeSaving: getNumber("kevAgeSaving"),
        katAgeSaving: getNumber("katAgeSaving"),
        sharedHomeEquity: getNumber("sharedHomeEquity")
    };
}

const TAX = {
    PENSION_GRÆNSE: 1200000,
    PENSION_BUND: 0.38,
    PENSION_TOP: 0.53,
    MODREGNING_GRÆNSE: 190000,
    MODREGNING_SATS: 0.32
};

function calculatePensionTax(grossAmount) {
    if (grossAmount <= 0) return 0;
    if (grossAmount <= TAX.PENSION_GRÆNSE) {
        return grossAmount * TAX.PENSION_BUND;
    }
    return TAX.PENSION_GRÆNSE * TAX.PENSION_BUND + (grossAmount - TAX.PENSION_GRÆNSE) * TAX.PENSION_TOP;
}

function calculateModregning(basePublicNet, grossPension) {
    const potentialModreg = Math.max(0, grossPension - TAX.MODREGNING_GRÆNSE) * TAX.MODREGNING_SATS;
    return Math.min(potentialModreg, basePublicNet * 0.5);
}

function determineTargetNet(age, inputs, onePartnerAlive) {
    let target = 0;
    if (age <= 75) target = inputs.targetGoGo;
    else if (age <= 85) target = inputs.targetSlowGo;
    else target = inputs.targetNoGo;

    if (onePartnerAlive) target *= 0.7;
    return target;
}

function createAccounts(inputs) {
    return {
        free: new Account("Frie midler", inputs.sharedFreeMoney, TAX_RATES.FREE_MONEY, "free"),
        kevAsk: new Account("Kevs ASK", inputs.kevAsk, TAX_RATES.ASK, "ask"),
        katAsk: new Account("Kats ASK", inputs.katAsk, TAX_RATES.ASK, "ask"),
        kevWork: new Account("Kevs arbejdsgiverpension", inputs.kevWorkPension, TAX_RATES.PAL, "pension"),
        kevAop: new Account("Kevs AOP", inputs.kevAgeSaving, TAX_RATES.PAL, "pension"),
        katWork: new Account("Kats arbejdsgiverpension", inputs.katWorkPension, TAX_RATES.PAL, "pension"),
        katAop: new Account("Kats AOP", inputs.katAgeSaving, TAX_RATES.PAL, "pension"),
        home: new Account("Friværdi", inputs.sharedHomeEquity, 0, "home")
    };
}

function findBestGrossPensionDraw(targetRemaining, basePublicNet) {
    let low = 0;
    let high = targetRemaining * 5;
    let bestGross = 0;
    let bestTax = 0;
    let bestModreg = 0;

    for (let i = 0; i < 30; i++) {
        const midGross = (low + high) / 2;
        const tax = calculatePensionTax(midGross);
        const modreg = calculateModregning(basePublicNet, midGross);
        const actualNet = midGross - tax - modreg;

        if (actualNet < targetRemaining) {
            low = midGross;
        } else {
            bestGross = midGross;
            bestTax = tax;
            bestModreg = modreg;
            high = midGross;
        }
    }

    return { bestGross, bestTax, bestModreg };
}

function runFullSimulation(extraMonthlySavings, useRealValues) {
    const inputs = collectSimulationInputs();
    const timeline = [];
    const accounts = createAccounts(inputs);
    const homeSaleAge = inputs.includeHousing ? inputs.homeSaleAge : Infinity;
    const homeSalePayout = inputs.includeHousing ? inputs.homeSalePayout : 0;
    const homePurchaseAge = inputs.includeHousing ? inputs.homePurchaseAge : Infinity;
    const homePurchasePrice = inputs.includeHousing ? inputs.homePurchasePrice : 0;
    const homeDownPayment = inputs.includeHousing ? inputs.homeDownPayment : 0;
    let homeSaleTriggered = false;
    let homePurchaseTriggered = false;

    const maxSimYears = Math.max(inputs.kevLifespan - inputs.kevAge, inputs.katLifespan - inputs.katAge);
    let isDepleted = false;
    let depletionAge = null;

    for (let yearIndex = 0; yearIndex <= maxSimYears; yearIndex++) {
        const currentKevAge = inputs.kevAge + yearIndex;
        const currentKatAge = inputs.katAge + yearIndex;
        const kevAlive = currentKevAge <= inputs.kevLifespan;
        const katAlive = currentKatAge <= inputs.katLifespan;
        if (!kevAlive && !katAlive) break;

        const kevWorking = kevAlive && currentKevAge < inputs.kevRetire;
        const katWorking = katAlive && currentKatAge < inputs.katRetire;
        const isBothRetired = (!kevAlive || !kevWorking) && (!katAlive || !katWorking);
        const onePartnerAlive = kevAlive !== katAlive;
        const maxAgeLiving = Math.max(kevAlive ? currentKevAge : 0, katAlive ? currentKatAge : 0);


        if (inputs.includeHousing && !homePurchaseTriggered && maxAgeLiving >= homePurchaseAge && homePurchaseAge > 0) {
            const paid = accounts.free.withdraw(homeDownPayment);
            if (paid > 0 && homePurchasePrice > 0) {
                accounts.home.deposit(homePurchasePrice);
            }
            homePurchaseTriggered = true;
        }

        if (inputs.includeHousing && !homeSaleTriggered && maxAgeLiving >= homeSaleAge && homeSaleAge > 0) {
            const payout = accounts.home.withdraw(homeSalePayout);
            accounts.free.deposit(payout);
            homeSaleTriggered = true;
        }

        let currentTargetNet = determineTargetNet(maxAgeLiving, inputs, onePartnerAlive);
        const inflationFactor = Math.pow(1 + inputs.inflationRate, yearIndex);
        currentTargetNet *= inflationFactor;

        if (kevWorking) {
            accounts.kevWork.deposit(inputs.kevSalary * inputs.kevPensionPercent);
            accounts.kevAop.deposit(inputs.kevAopMonthly * 12);
        }
        if (katWorking) {
            accounts.katWork.deposit(inputs.katSalary * inputs.katPensionPercent);
            accounts.katAop.deposit(inputs.katAopMonthly * 12);
        }

        if (!isBothRetired) {
            accounts.free.deposit((inputs.monthlyFreeSavings + extraMonthlySavings) * 12);
        }

        let taxPaidThisYear = 0;
        const effectiveGrowthRate = Math.max(inputs.grossReturn, 0);

        if (effectiveGrowthRate > 0) {
            taxPaidThisYear += accounts.free.addAnnualReturn(effectiveGrowthRate);
            taxPaidThisYear += accounts.kevAsk.addAnnualReturn(effectiveGrowthRate);
            taxPaidThisYear += accounts.katAsk.addAnnualReturn(effectiveGrowthRate);
            taxPaidThisYear += accounts.kevWork.addAnnualReturn(effectiveGrowthRate);
            taxPaidThisYear += accounts.kevAop.addAnnualReturn(effectiveGrowthRate);
            taxPaidThisYear += accounts.katWork.addAnnualReturn(effectiveGrowthRate);
            taxPaidThisYear += accounts.katAop.addAnnualReturn(effectiveGrowthRate);
            if (inputs.includeHousing) {
                accounts.home.addAnnualReturn(Math.min(inputs.grossReturn, 0.03));
            }
        }

        let basePublicNet = 0;
        if (kevAlive && currentKevAge >= inputs.kevStatePensionAge) basePublicNet += inputs.kevStatePension;
        if (katAlive && currentKatAge >= inputs.katStatePensionAge) basePublicNet += inputs.katStatePension;

        const grossRequiredToHitTarget = isBothRetired ? Math.max(0, currentTargetNet - basePublicNet) : 0;

        let withdrawnAsk = 0;
        let withdrawnFree = 0;
        let withdrawnAop = 0;
        let withdrawnWork = 0;
        let withdrawnHome = 0;
        let modregningFolkepension = 0;

        if (isBothRetired) {
            let targetRemaining = Math.max(0, currentTargetNet - basePublicNet);
            const remainingLifeYears = Math.max(1, Math.min(inputs.kevLifespan, inputs.katLifespan) - maxAgeLiving + 1);
            const totalAvailableRetirementAssets = accounts.free.balance + accounts.kevAsk.balance + accounts.katAsk.balance + accounts.kevAop.balance + accounts.katAop.balance + accounts.kevWork.balance + accounts.katWork.balance + (inputs.includeHousing ? accounts.home.balance : 0);
            const safeAnnualDraw = Math.min(totalAvailableRetirementAssets / Math.max(remainingLifeYears, 5), targetRemaining * 1.25);
            targetRemaining = Math.max(targetRemaining, safeAnnualDraw * 0.75);

            const totalAskBalance = accounts.kevAsk.balance + accounts.katAsk.balance;
            const askWithdrawal = Math.min(targetRemaining, totalAskBalance);
            if (askWithdrawal > 0) {
                const kevAskDraw = accounts.kevAsk.withdraw(Math.min(askWithdrawal, accounts.kevAsk.balance));
                let remainingAsk = askWithdrawal - kevAskDraw;
                const katAskDraw = accounts.katAsk.withdraw(Math.min(remainingAsk, accounts.katAsk.balance));
                withdrawnAsk = kevAskDraw + katAskDraw;
                targetRemaining -= withdrawnAsk;
            }

            withdrawnFree = accounts.free.withdraw(Math.min(targetRemaining, accounts.free.balance));
            targetRemaining -= withdrawnFree;

            let totalAvailablePensionBalance = 0;
            if (currentKevAge >= inputs.kevAopPayoutAge) totalAvailablePensionBalance += accounts.kevAop.balance;
            if (currentKevAge >= inputs.kevPensionPayoutAge) totalAvailablePensionBalance += accounts.kevWork.balance;
            if (currentKatAge >= inputs.katAopPayoutAge) totalAvailablePensionBalance += accounts.katAop.balance;
            if (currentKatAge >= inputs.katPensionPayoutAge) totalAvailablePensionBalance += accounts.katWork.balance;

            if (targetRemaining > 0 && totalAvailablePensionBalance > 0) {
                const result = findBestGrossPensionDraw(Math.min(targetRemaining, totalAvailablePensionBalance * 0.9), basePublicNet);
                const totalUsablePension = Math.min(result.bestGross, totalAvailablePensionBalance);
                const pensionTax = calculatePensionTax(totalUsablePension);
                const pensionModreg = calculateModregning(basePublicNet, totalUsablePension);
                taxPaidThisYear += pensionTax;
                modregningFolkepension = pensionModreg;

                let remainingDraw = totalUsablePension;
                const kevAopDraw = currentKevAge >= inputs.kevAopPayoutAge ? accounts.kevAop.withdraw(Math.min(remainingDraw, accounts.kevAop.balance)) : 0;
                remainingDraw -= kevAopDraw;
                const katAopDraw = currentKatAge >= inputs.katAopPayoutAge ? accounts.katAop.withdraw(Math.min(remainingDraw, accounts.katAop.balance)) : 0;
                remainingDraw -= katAopDraw;
                withdrawnAop = kevAopDraw + katAopDraw;

                const kevWorkDraw = currentKevAge >= inputs.kevPensionPayoutAge ? accounts.kevWork.withdraw(Math.min(remainingDraw, accounts.kevWork.balance)) : 0;
                remainingDraw -= kevWorkDraw;
                const katWorkDraw = currentKatAge >= inputs.katPensionPayoutAge ? accounts.katWork.withdraw(Math.min(remainingDraw, accounts.katWork.balance)) : 0;
                remainingDraw -= katWorkDraw;
                withdrawnWork = kevWorkDraw + katWorkDraw;

                const pensionNet = Math.max(0, totalUsablePension - pensionTax - pensionModreg);
                targetRemaining = Math.max(0, targetRemaining - pensionNet);
            }

            if (inputs.includeHousing && targetRemaining > 0) {
                withdrawnHome = accounts.home.withdraw(Math.min(targetRemaining, accounts.home.balance));
                targetRemaining -= withdrawnHome;
            }

            if (targetRemaining > 10 && !isDepleted) {
                isDepleted = true;
                depletionAge = maxAgeLiving;
            }
        }

        const totalAop = accounts.kevAop.balance + accounts.katAop.balance;
        const totalWork = accounts.kevWork.balance + accounts.katWork.balance;
        const totalAskBalance = accounts.kevAsk.balance + accounts.katAsk.balance;
        const totalWealth = accounts.free.balance + totalAskBalance + totalWork + totalAop + accounts.home.balance;
        const totalPublicNet = Math.max(0, basePublicNet - modregningFolkepension);
        const deflator = useRealValues ? Math.pow(1 + inputs.inflationRate, yearIndex) : 1;

        timeline.push({
            age: maxAgeLiving,
            kevAge: currentKevAge,
            katAge: currentKatAge,
            isRetired: isBothRetired,
            totalWealth: totalWealth / deflator,
            grossRequired: grossRequiredToHitTarget / deflator,
            publicNet: totalPublicNet / deflator,
            withdrawnAsk: withdrawnAsk / deflator,
            withdrawnFree: withdrawnFree / deflator,
            withdrawnAop: withdrawnAop / deflator,
            withdrawnWork: withdrawnWork / deflator,
            withdrawnHome: withdrawnHome / deflator,
            taxPaid: taxPaidThisYear / deflator,
            freeBalance: accounts.free.balance / deflator,
            askBalance: totalAskBalance / deflator,
            aopBalance: totalAop / deflator,
            workBalance: totalWork / deflator,
            homeBalance: accounts.home.balance / deflator
        });
    }

    return { timeline, depletionAge };
}

function calculateRequiredExtraSavings() {
    let low = 0;
    let high = 1;
    let best = -1;

    const testZero = runFullSimulation(0, false);
    if (!testZero.depletionAge) return 0;

    while (Number.isFinite(high) && runFullSimulation(high, false).depletionAge) {
        high *= 2;
    }

    if (!Number.isFinite(high)) return -1;

    for (let i = 0; i < 25; i++) {
        const mid = (low + high) / 2;
        const res = runFullSimulation(mid, false);

        if (!res.depletionAge) {
            best = mid;
            high = mid;
        } else {
            low = mid;
        }
    }

    return best === -1 ? -1 : Math.ceil(best / 100) * 100;
}