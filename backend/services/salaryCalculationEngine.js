class SalaryCalculationEngine {
    /**
     * Main Entry Point
     */
    static calculateSalary({ annualCTC = 0, earnings = [], deductions = [], benefits = [] }) {
        const ctc = this._safeNum(annualCTC);
        if (ctc <= 0) return this._emptyResult(ctc);

        const monthlyCTC = this._round(ctc / 12);

        // Find Basic component to get its configured percentage
        const basicComp = (earnings || []).find(e => this._isBasic(e));
        let basicPercentage = 40; // Default fallback

        if (basicComp) {
            const val = parseFloat(basicComp.percentage || basicComp.value || 0);
            if (val > 0) basicPercentage = val;
            console.log(`🔍 [ENGINE] Basic % from component: ${basicPercentage}%`);
        }

        // --- STEP 1: CALCULATE BASIC ---
        const basicAnnual = this._round(ctc * (basicPercentage / 100));
        const basicMonthly = this._round(basicAnnual / 12);

        const ctx = {
            annualCTC: ctc,
            monthlyCTC,
            basicAnnual,
            basicMonthly
        };

        const result = {
            annualCTC: ctc,
            earnings: [],
            deductions: [],
            benefits: [],
            totals: {
                grossMonthly: 0,
                grossYearly: 0,
                deductionMonthly: 0,
                deductionYearly: 0,
                netMonthly: 0,
                netYearly: 0,
                ctcYearly: ctc
            }
        };

        // Initialize BASIC (Preserving original object if possible)
        const basicOriginal = (earnings || []).find(e => this._isBasic(e)) || { name: 'Basic Salary' };
        result.earnings.push({
            ...basicOriginal,
            code: 'BASIC',
            name: basicOriginal.name || 'Basic Salary',
            calculationType: basicOriginal.calculationType || 'PERCENTAGE_OF_CTC',
            value: basicPercentage,
            basedOn: 'CTC',
            monthly: basicMonthly,
            yearly: basicAnnual
        });

        // --- STEP 2: CALCULATE OTHERS (EXCEPT SPECIAL ALLOWANCE) ---
        let totalCalculatedAnnual = basicAnnual;
        let totalBenefitsAnnual = 0;

        // Process non-special earnings
        const filteredEarnings = (earnings || []).filter(e => !this._isBasic(e) && !this._isSpecial(e));
        filteredEarnings.forEach(e => {
            const calc = this._processComponent(e, ctx);
            result.earnings.push(calc);
            totalCalculatedAnnual += calc.yearly;
        });

        // Process benefits
        (benefits || []).forEach(b => {
            const calc = this._processComponent(b, ctx);
            result.benefits.push(calc);
            totalBenefitsAnnual += calc.yearly;
        });

        // Process deductions
        let totalDeductionsAnnual = 0;
        (deductions || []).forEach(d => {
            const calc = this._processComponent(d, ctx);
            result.deductions.push(calc);
            totalDeductionsAnnual += calc.yearly;
        });

        // --- STEP 3: AUTO-ADJUST SPECIAL ALLOWANCE ---
        const saAnnual = this._round(ctc - (totalCalculatedAnnual + totalBenefitsAnnual));
        const saMonthly = this._round(saAnnual / 12);

        const saOriginal = (earnings || []).find(e => this._isSpecial(e)) || { name: 'Special Allowance' };
        result.earnings.push({
            ...saOriginal,
            code: 'SPECIAL_ALLOWANCE',
            name: saOriginal.name || 'Special Allowance',
            calculationType: 'FIXED',
            value: saMonthly,
            basedOn: 'NA',
            monthly: saMonthly,
            yearly: saAnnual
        });

        // Update Totals
        const totalEarningsAnnual = totalCalculatedAnnual + saAnnual;
        result.totals = {
            grossMonthly: this._round(totalEarningsAnnual / 12),
            grossYearly: totalEarningsAnnual,
            deductionMonthly: this._round(totalDeductionsAnnual / 12),
            deductionYearly: totalDeductionsAnnual,
            netMonthly: this._round((totalEarningsAnnual - totalDeductionsAnnual) / 12),
            netYearly: totalEarningsAnnual - totalDeductionsAnnual,
            ctcYearly: ctc
        };

        return result;
    }

    /**
     * Logic for individual components
     */
    static _processComponent(comp, ctx) {
        const code = this._deriveCode(comp);
        const calcType = (comp.calculationType || comp.amountType || 'FIXED').toUpperCase();
        const basedOn = (comp.basedOn || comp.calculationBase || 'NA').toUpperCase();
        const value = parseFloat(comp.value || comp.amount || comp.percentage || comp.amountValue || 0);

        let monthly = 0;

        if (calcType.includes('PERCENTAGE_OF_CTC') || (calcType.includes('PERCENT') && (calcType.includes('CTC') || basedOn === 'CTC'))) {
            monthly = this._round((ctx.monthlyCTC * value) / 100);
        } else if (calcType.includes('PERCENTAGE_OF_BASIC') || (calcType.includes('PERCENT') && basedOn === 'BASIC')) {
            monthly = this._round((ctx.basicMonthly * value) / 100);
        } else if (calcType === 'PERCENTAGE' || calcType.includes('PERCENT')) {
            const base = (basedOn === 'BASIC') ? ctx.basicMonthly : ctx.monthlyCTC;
            monthly = this._round((base * value) / 100);
        } else {
            monthly = this._round(value);
        }

        // Hardcoded Rules for Statutory Retirals
        if (code === 'EMPLOYER_PF' || code === 'EMPLOYEE_PF' || code === 'PF') {
            monthly = Math.min(this._round(ctx.basicMonthly * 0.12), 1800);
        } else if (code === 'GRATUITY') {
            monthly = this._round(ctx.basicMonthly * 0.0481);
        } else if (code === 'PROFESSIONAL_TAX') {
            monthly = 200;
        }

        return {
            ...comp, // Preserve original fields (_id, earningType, etc.)
            code,
            name: comp.name || code,
            calculationType: calcType,
            value,
            basedOn,
            monthly,
            yearly: this._round(monthly * 12)
        };
    }

    static _isBasic(c) {
        if (!c) return false;
        const name = (c.name || '').toUpperCase();
        const code = (c.code || '').toUpperCase();
        return code === 'BASIC' || name === 'BASIC' || name === 'BASIC SALARY';
    }

    static _isSpecial(c) {
        if (!c) return false;
        const name = (c.name || '').toUpperCase();
        const code = (c.code || '').toUpperCase();
        return code === 'SPECIAL_ALLOWANCE' || name === 'SPECIAL ALLOWANCE' || name.includes('BALANCER');
    }

    static _deriveCode(c) {
        if (!c) return 'UNKNOWN';
        if (this._isBasic(c)) return 'BASIC';
        if (this._isSpecial(c)) return 'SPECIAL_ALLOWANCE';

        let raw = (c.code || c.name || '').toUpperCase().trim();
        if (raw.includes('PF') || raw.includes('PROVIDENT')) {
            if (raw.includes('EMPLOYER')) return 'EMPLOYER_PF';
            return 'EMPLOYEE_PF';
        }
        if (raw.includes('GRATUITY')) return 'GRATUITY';
        if (raw.includes('PROFESSIONAL TAX') || raw === 'PT') return 'PROFESSIONAL_TAX';

        return raw.replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
    }

    static _safeNum(v) {
        const n = parseFloat(v);
        return isNaN(n) ? 0 : this._round(n);
    }

    static _round(v) {
        return Math.round((v + Number.EPSILON) * 100) / 100;
    }

    static _emptyResult(ctc) {
        return {
            annualCTC: ctc,
            earnings: [], deductions: [], benefits: [],
            totals: { grossMonthly: 0, grossYearly: 0, deductionMonthly: 0, deductionYearly: 0, netMonthly: 0, netYearly: 0, ctcYearly: ctc }
        };
    }
}

module.exports = SalaryCalculationEngine;

