const ynab = require('ynab');
const {DateTime} = require('luxon');

const MATCHERS = [
    {
        accountId: 'a90346df-e8d2-4b12-b534-3d90d15dcf5a',
        regexp: /Account ending in (\d+).*on (\d{1,2}\/\d{1,2}\/\d{4}), at (.*), .*in the amount of (\S+)/s,
        fields: {who: 1, when: 2, where: 3, amount: 4},
    },
    {
        accountId: 'a4fa5bab-e050-4488-970c-c4429214f89b',
        regexp: /Location ?: ?([^,]*).*Date ?: ?(\d{1,2}\/\d{1,2}\/\d{4}).*Amount ?: ?(\S+)/s,
        fields: {who: 1, when: 2, where: 1, amount: 3},
    },
];

module.exports = async function (context, req) {
    try {
        context.log('Running...');
        const {budgetId} = req.query;
        const {accountId, parts, fields} = findMatcher(req.body.toString());
        const who = parts[fields.who];
        const when = parts[fields.when];
        const where = parts[fields.where];
        const amount = parts[fields.amount];
        const transactionTime = DateTime.local()
            .setZone('America/Chicago')
            .toLocaleString(DateTime.TIME_24_SIMPLE);

        context.log(`Matched to ${accountId}`);
        const transaction = {
            account_id: accountId,
            date: new Date(when).toISOString().split('T')[0],
            amount: -amount.replace(/\D/g, '') * 10,
            payee_name: normalizePayee(where),
            memo: `${transactionTime} ${who}`,
        };

        const api = new ynab.API(process.env.YNAB_TOKEN);
        await api.transactions.createTransaction(budgetId, {transaction});
        context.res = {status: 200};
    } catch (e) {
        context.log(e);
        context.res = {status: 400};
    }
};

function normalizePayee(payee) {
    const normalized = [
        ['^amazon', 'Amazon'],
        ['^amzn', 'Amazon'],
        ['^apple.com', 'Apple'],
        ['^casey', "Casey's"],
        ['^dollar', 'Dollar Store'],
        ['^fareway', 'Fareway'],
        ['^fleet', 'Fleet Farm'],
        ['^harland', 'Ace Hardware'],
        ['^hy-vee', 'Hy-Vee'],
        ['^lowe', "Lowe's"],
        ['^mcdonald', 'McDonalds'],
        ['^menards', 'Menards'],
        ['^orscheln', 'Orschelens'],
        ['^petsmart', 'Petsmart'],
        ['^sams', 'Sams Club'],
        ['^target', 'Target'],
        ['^wal-mart', 'Walmart'],
        ['^wm super', 'Walmart'],
        ['ampride', 'Ampride'],
        ['car wash', 'Car Wash'],
        ['home depot', 'Home Depot'],
        ['petco', 'Petco'],
        ['xbox', 'Microsoft'],
        ['chuys', 'Chuys'],
    ].find(([regex]) => new RegExp(regex, 'i').test(payee));

    return normalized ? normalized[1] : payee;
}

function findMatcher(body) {
    const matcher = MATCHERS.find(({regexp}) => regexp.test(body));
    if (!matcher) throw new Error(body);
    return {...matcher, parts: matcher.regexp.exec(body)};
}
