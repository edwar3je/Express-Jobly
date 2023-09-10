const { sqlForPartialUpdate } = require("./sql");

describe("sqlForPartialUpdate", function () {
    test("Creates a successful object", () => {
        const data = {
            firstName: 'Aliya',
            age: 8
        };
        const colNames = {
            firstName: 'first_name',
            age: 'age'
        };
        expect(sqlForPartialUpdate(data, colNames)).toEqual({
            setCols: `"first_name"=$1, "age"=$2`,
            values: ['Aliya', 8]
        })
    });
    
    test("Throws an error if no data is provided", () => {
        const data = {};
        const colNames = {
            firstName: 'first_name',
            age: 'age'
        };
        expect(() => {sqlForPartialUpdate(data, colNames)}).toThrow("No data")
    });
})