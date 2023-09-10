"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {
    const newJob = {
        title: "new",
        salary: 50000,
        equity: 0.5,
        companyHandle: "c1"
    };

    test("works", async function () {
        let job = await Job.create(newJob);
        expect(job).toEqual({
            id: expect.any(Number),
            title: "new",
            salary: 50000,
            equity: "0.5",
            companyHandle: "c1"
        });

        const result = await db.query(
            `SELECT id, title, salary, equity, company_handle
            FROM jobs
            WHERE title = 'new'`);
        expect(result.rows).toEqual([
            {
                id: expect.any(Number),
                title: "new",
                salary: 50000,
                equity: "0.5",
                company_handle: "c1",
            },
        ]);
    });

    test("bad request if companyHandle is not in companies table", async function () {
        try {
            await Job.create({
                title: "new",
                salary: 50000,
                equity: 0.5,
                companyHandle: "notahandle",
            });
            fail();
        } catch (err) {
            expect(err instanceof BadRequestError).toBeTruthy();
        }
    });
});

/************************************** findAll */

// There appear to be issues with retrieving jobs generated in "_testCommon.js" (not the case for other model tests)

describe("findAll", function () {
    test("works: no filter", async function () {
        let jobs = await Job.findAll();
        expect(jobs).toEqual([
            {
                id: expect.any(Number),
                title: "j1",
                salary: 50000,
                equity: "0.5",
                companyHandle: "c1"
            },
            {
                id: expect.any(Number),
                title: "j2",
                salary: 100000,
                equity: "0.9",
                companyHandle: "c2"
            },
            {
                id: expect.any(Number),
                title: "j3",
                salary: 150000,
                equity: "0",
                companyHandle: "c3"
            }
        ]);
    });
});

/************************************** get */

describe("get", function () {
    test("works", async function () {
        const job = await db.query(`SELECT id from jobs WHERE title = 'j1'`);
        const searchJob = await Job.get(job.rows[0].id);
        expect(searchJob).toEqual({
            id: expect.any(Number),
            title: "j1",
            salary: 50000,
            equity: "0.5",
            companyHandle: "c1",
        });
    });

    test("not found if id is not in database", async function () {
        try {
            await Job.get(-1);
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
})

/************************************** filterJobs */

describe("filterJobs", function () {
    test("works (shows all results)", async function () {
        let options = {title: "j", minSalary: 50000, hasEquity: false};
        let result = await Job.filterJobs(options);
        expect(result).toEqual([
            {
                id: expect.any(Number),
                title: "j1",
                salary: 50000,
                equity: "0.5",
                companyHandle: "c1",
            },
            {
                id: expect.any(Number),
                title: "j2",
                salary: 100000,
                equity: "0.9",
                companyHandle: "c2",
            },
            {
                id: expect.any(Number),
                title: "j3",
                salary: 150000,
                equity: "0",
                companyHandle: "c3",
            }
        ]);
    });

    test("works (partial option information provided)", async function () {
        let options = {title: "j"};
        let result = await Job.filterJobs(options);
        expect(result).toEqual([
            {
                id: expect.any(Number),
                title: "j1",
                salary: 50000,
                equity: "0.5",
                companyHandle: "c1",
            },
            {
                id: expect.any(Number),
                title: "j2",
                salary: 100000,
                equity: "0.9",
                companyHandle: "c2",
            },
            {
                id: expect.any(Number),
                title: "j3",
                salary: 150000,
                equity: "0",
                companyHandle: "c3",
            }
        ]);
    });

    test("works (gets some results (specific title))", async function () {
        let options = {title: "J1"};
        let result = await Job.filterJobs(options);
        expect(result).toEqual([
            {
                id: expect.any(Number),
                title: "j1",
                salary: 50000,
                equity: "0.5",
                companyHandle: "c1",
            }
        ]);
    });

    test("works (gets some results (minSalary))", async function () {
        let options = {minSalary: 100000};
        let result = await Job.filterJobs(options);
        expect(result).toEqual([
            {
                id: expect.any(Number),
                title: "j2",
                salary: 100000,
                equity: "0.9",
                companyHandle: "c2",
            },
            {
                id: expect.any(Number),
                title: "j3",
                salary: 150000,
                equity: "0",
                companyHandle: "c3",
            }
        ]);
    });

    test("works (gets some results (hasEquity))", async function () {
        let options = {hasEquity: true};
        let result = await Job.filterJobs(options);
        expect(result).toEqual([
            {
                id: expect.any(Number),
                title: "j1",
                salary: 50000,
                equity: "0.5",
                companyHandle: "c1",
            },
            {
                id: expect.any(Number),
                title: "j2",
                salary: 100000,
                equity: "0.9",
                companyHandle: "c2",
            }
        ]);
    });

    test("throws an error if no results match the criteria", async function () {
        try {
            let options = {title: "m"};
            await Job.filterJobs(options);
        fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});

/************************************** update */

describe("update", function () {
    const updateData = {
        title: "J1",
        salary: 10,
        equity: "0.9",
    };
    
    test("works", async function () {
        const job = await db.query(`SELECT id from jobs WHERE title = 'j1'`);
        let updatedJob = await Job.update(job.rows[0].id, updateData);
        expect(updatedJob).toEqual({
            id: expect.any(Number),
            title: "J1",
            salary: 10,
            equity: "0.9",
            companyHandle: "c1",
        });
    });

    test("works: null fields (except for title)", async function () {
        const job = await db.query(`SELECT id from jobs WHERE title = 'j1'`);
        let updatedJob = await Job.update(job.rows[0].id, {
            salary: null,
            equity: null
        });
        expect(updatedJob).toEqual({
            id: expect.any(Number),
            title: "j1",
            salary: null,
            equity: null,
            companyHandle: "c1",
        });
    });

    test("not found if no such job", async function () {
        try {
            await Job.update(-1, updateData);
            fail();
        } catch (err) {
            expect (err instanceof NotFoundError).toBeTruthy();
        }
    });

    test("bad request with no data", async function () {
        try {
            const job = await db.query(`SELECT id from jobs WHERE title = 'j1'`);
            await Job.update(job.rows[0].id, {});
            fail();
        } catch (err) {
            expect (err instanceof BadRequestError).toBeTruthy();
        }
    })
});

/************************************** remove */

describe("remove", function () {
    test("works", async function () {
        const job = await db.query(`SELECT id from jobs WHERE title = 'j1'`);
        let removeJob = await Job.remove(job.rows[0].id);
        expect(removeJob).toEqual({msg: `job deleted`});
    });

    test("not found if id is not in database (must be a number)", async function () {
        try {
            await Job.remove(-1);
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});