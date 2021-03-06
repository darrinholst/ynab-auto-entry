const chai = require('chai');
const sinonChai = require('sinon-chai');
const dirtyChai = require('dirty-chai');
const sinon = require('sinon');
const ynab = require('ynab');

const f = require('./index');

chai.use(sinonChai);
chai.use(dirtyChai);
const {expect} = chai;

describe('ParseAndAdd', () => {
    const EXAMPLE_1 = `
      Account ending in 1234
      on 8/5/1972, at Who's Lounge, in the amount of $452.99 fumullins
    `;
    const EXAMPLE_2 = `
      <p>A purchase exceeding the amount you specified has occurred</p>
      <p>Location : Who's Lounge, Madrid, IA<BR>Transaction Date : 08/05/1972<BR>Purchase Amount : $452.99</p>
    `;
    const BUILD_EXAMPLE = (payee) => `
      Account ending in 1234
      on 08/05/1972, at ${payee}, in the amount of $452.99 fumullins
    `;

    let context;
    let request;
    let ynabApi;

    beforeEach(() => {
        sinon.useFakeTimers(1586389116831);
        ynabApi = {transactions: {createTransaction: sinon.stub()}};
        sinon.stub(ynab, 'API').returns(ynabApi);
        context = {log: sinon.stub()};
        request = {query: {budgetId: 'budget-id'}};
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should add transaction from matcher 1', async () => {
        request.body = EXAMPLE_1;

        await f(context, request);

        expect(context.res).to.eql({status: 200});
        expect(ynabApi.transactions.createTransaction)
            .calledOnce()
            .calledWith('budget-id', {
                transaction: {
                    account_id: 'a90346df-e8d2-4b12-b534-3d90d15dcf5a',
                    amount: -452990,
                    date: '1972-08-05',
                    memo: '18:38 1234',
                    payee_name: "Who's Lounge",
                },
            });
    });

    it('should add transaction from matcher 2', async () => {
        request.body = EXAMPLE_2;

        await f(context, request);

        expect(context.res).to.eql({status: 200});
        expect(ynabApi.transactions.createTransaction)
            .calledOnce()
            .calledWith('budget-id', {
                transaction: {
                    account_id: 'a4fa5bab-e050-4488-970c-c4429214f89b',
                    amount: -452990,
                    date: '1972-08-05',
                    memo: "18:38 Who's Lounge",
                    payee_name: "Who's Lounge",
                },
            });
    });

    [
        ['FAREWAY STORES', 'Fareway'],
        ['DOLLAR-GENERAL', 'Dollar Store'],
        ['HY-VEE #1234', 'Hy-Vee'],
        ['Microsoft*Xbox', 'Microsoft'],
        ["Casey's General", "Casey's"],
    ].forEach(([actual, expected]) => {
        it(`should normalize the ${expected} payee`, async () => {
            request.body = BUILD_EXAMPLE(actual);

            await f(context, request);

            expect(ynabApi.transactions.createTransaction)
                .calledOnce()
                .calledWith('budget-id', {
                    transaction: {
                        account_id: 'a90346df-e8d2-4b12-b534-3d90d15dcf5a',
                        amount: -452990,
                        date: '1972-08-05',
                        memo: '18:38 1234',
                        payee_name: expected,
                    },
                });
        });
    });
});
