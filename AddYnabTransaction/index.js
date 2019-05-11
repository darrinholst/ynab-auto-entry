const {API} = require('ynab');

module.exports = async function(context, req) {
    if (!validateRequest(req.query)) return (context.res = {status: 400});

    try {
        const {budgetId} = req.query;
        const transaction = buildTransaction(req.query);
        await ynab().transactions.createTransaction(budgetId, {transaction});
        context.res = {status: 204};
    } catch (e) {
        context.res = {status: 500, body: JSON.stringify(e, null, 2)};
    }
};

function ynab() {
    return new API(process.env.YNAB_TOKEN);
}

function validateRequest({budgetId, accountId, when, amount, where, who}) {
    return who && when && where && amount && accountId && budgetId;
}

function buildTransaction({accountId, when, amount, where, who}) {
    return {
        account_id: accountId,
        date: new Date(when).toISOString().split('T')[0],
        amount: -amount.replace(/\D/g, '') * 10,
        payee_name: where,
        memo: who
    };
}
