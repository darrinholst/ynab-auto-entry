const ynab = require('ynab');

const MATCHERS = [
    {
        regexp: /Account ending in (\d+).*on (\d{2}\/\d{2}\/\d{4}), at (.*), .*in the amount of (\S+)/s,
        fields: {who: 1, when: 2, where: 3, amount: 4},
    },
    {
        regexp: /Location ?: ?([^,]*).*Date ?: ?(\d{2}\/\d{2}\/\d{4}).*Amount ?: ?(\S+)/s,
        fields: {who: 1, when: 2, where: 1, amount: 3},
    },
];

module.exports = async function(context, req) {
    try {
        const {budgetId, accountId} = req.query;
        const {parts, fields} = findMatcher(req.body.toString());
        const who = parts[fields.who];
        const when = parts[fields.when];
        const where = parts[fields.where];
        const amount = parts[fields.amount];

        const transaction = {
            account_id: accountId,
            date: new Date(when).toISOString().split('T')[0],
            amount: -amount.replace(/\D/g, '') * 10,
            payee_name: where,
            memo: who,
        };

        console.log(transaction);

        const api = new ynab.API(process.env.YNAB_TOKEN);
        await api.transactions.createTransaction(budgetId, {transaction});
        context.res = {status: 200};
    } catch (e) {
        context.log(e);
        context.res = {status: 400};
    }
};

function findMatcher(body) {
    const matcher = MATCHERS.find(({regexp}) => regexp.test(body));
    if (!matcher) throw new Error(body);
    return {...matcher, parts: matcher.regexp.exec(body)};
}
