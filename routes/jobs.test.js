"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const Job = require("../models/job");

const { BadRequestError, NotFoundError } = require("../expressError");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  u2Token,
  u3Token,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /jobs */

describe("POST /jobs", function () {
  const newJob = {
    title: "new",
    salary: 50000,
    equity: 0.5,
    companyHandle: "c1",
  };

  test("ok for users (admins)", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send(newJob)
        .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      job: {
        id: expect.any(Number),
        title: "new",
        salary: 50000,
        equity: "0.5",
        companyHandle: "c1",
      }
    });
  });

  test("unauthorized (isAdmin is false)", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send(newJob)
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("unauthorized (isAdmin is undefined)", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send(newJob)
        .set("authorization", `Bearer ${u3Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("bad request with missing data", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send({
          title: "something else",
          salary: 15,
          companyHandle: "c1"
        })
        .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request if companyHandle is not in database", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send({
          title: "new",
          salary: 15,
          equity: 0.5,
          companyHandle: "notACompany"
        })
        .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid data", async function () {
    const resp = await request(app)
        .post("/companies")
        .send({
          title: "new",
          salary: "not a number",
          equity: 0.5,
          companyHandle: "c1"
        })
        .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /jobs */

describe("GET /jobs", function () {
  const allData = {companies: [
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
  ]}
  
  test("ok for anon (no filter)", async function () {
    const resp = await request(app).get("/jobs");
    expect(resp.body).toEqual({
      jobs:
        [
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
        ]
    });
  });

  test("works (filter: full info provided)", async function () {
    const resp = await request(app).get(`/jobs?title=j&minSalary=10000&hasEquity=false`);
    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual(allData)
  });

  test("works (filter: partial info provided (returns all))", async function () {
    const resp = await request(app).get(`/jobs?title=j`);
    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual(allData)
  });

  test("works (filter: partial info provided (returns 1))", async function () {
    const resp = await request(app).get(`/jobs?title=j1`);
    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({companies: [
        {
          id: expect.any(Number),
          title: "j1",
          salary: 50000,
          equity: "0.5",
          companyHandle: "c1",
        }
      ]})
  });

  test("throws an error if a string is passed in either minSalary or hasEquity", async function () {
    const resp1 = await request(app).get(`/jobs?minSalary=notasalary`);
    const resp2 = await request(app).get(`/jobs?hasEquity=notaboolean`);
    expect(resp1.statusCode).toEqual(400);
    expect(resp2.statusCode).toEqual(400);
  });

  test("throws an error if there are no jobs after filtering", async function () {
    const resp = await request(app).get(`/jobs?title=f1&minSalary=1000000&hasEquity=true`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** GET /jobs/id/:id */

describe("GET /jobs/:id", function () {
  test("works for anon", async function () {
    const someJob = await db.query(`SELECT * FROM jobs WHERE title = 'j1'`);
    const resp = await request(app).get(`/jobs/${someJob.rows[0].id}`);
    expect(resp.body).toEqual({
      job:
        {
          id: someJob.rows[0].id,
          title: "j1",
          salary: 50000,
          equity: "0.5",
          companyHandle: "c1"
        }
    })
  });

  test("not found for no such job", async function () {
    const resp = await request(app).get(`/jobs/-1`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /jobs/id/:id */

describe("PATCH /jobs/:id", function () {
  test("works for users", async function () {
    const someData = await db.query(`SELECT * FROM jobs WHERE title = 'j1'`);
    const resp = await request(app)
        .patch(`/jobs/${someData.rows[0].id}`)
        .send({
          title: 'J1',
        })
        .set("authorization", `Bearer ${u2Token}`);
    expect(resp.body).toEqual({
      job: {
        id: expect.any(Number),
        title: "J1",
        salary: 50000,
        equity: "0.5",
        companyHandle: "c1",
      }
    });
  });

  test("unauth for anon", async function () {
    const someData = await db.query(`SELECT id FROM jobs WHERE title = 'j1'`);
    const resp = await request(app)
        .patch(`/jobs/${someData.rows[0].id}`)
        .send({
          title: "J1",
        });
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for nonadmin (isAdmin is false)", async function () {
    const someData = await db.query(`SELECT id FROM jobs WHERE title = 'j1'`);
    const resp = await request(app)
        .patch(`/jobs/${someData.rows[0].id}`)
        .send({
          title: "J1",
        })
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for nonadmin (isAdmin is null/undefined)", async function () {
    const someData = await db.query(`SELECT id FROM jobs WHERE title = 'j1'`);
    const resp = await request(app)
        .patch(`/jobs/${someData.rows[0].id}`)
        .send({
          title: "J1",
        })
        .set("authorization", `Bearer ${u3Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found on no such job", async function () {
    const resp = await request(app)
        .patch(`/jobs/-1`)
        .send({
          title: "J1",
        })
        .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request on id change attempt", async function () {
    const someData = await db.query(`SELECT id FROM jobs WHERE title = 'j1'`);
    const resp = await request(app)
        .patch(`/jobs/${someData.rows[0].id}`)
        .send({
          id: 58,
        })
        .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request on invalid data", async function () {
    const someData = await db.query(`SELECT id FROM jobs WHERE title = 'j1'`);
    const resp = await request(app)
        .patch(`/jobs/${someData.rows[0].id}`)
        .send({
          salary: "not a number",
        })
        .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** DELETE /jobs/id/:id */

describe("DELETE /jobs/:id", function () {
  test("works for users", async function () {
    const someData = await db.query(`SELECT id FROM jobs WHERE title = 'j1'`);
    const resp = await request(app)
        .delete(`/jobs/${someData.rows[0].id}`)
        .set("authorization", `Bearer ${u2Token}`);
    expect(resp.body).toEqual({ deleted: "job" });
  });

  test("unauth for anon", async function () {
    const someData = await db.query(`SELECT id FROM jobs WHERE title = 'j1'`);
    const resp = await request(app)
        .delete(`/jobs/${someData.rows[0].id}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for nonadmin (isAdmin is false)", async function () {
    const someData = await db.query(`SELECT id FROM jobs WHERE title = 'j1'`);
    const resp = await request(app)
        .delete(`/jobs/${someData.rows[0].id}`)
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for nonadmin (isAdmin is null/undefined)", async function () {
    const someData = await db.query(`SELECT id FROM jobs WHERE title = 'j1'`);
    const resp = await request(app)
        .delete(`/jobs/${someData.rows[0].id}`)
        .set("authorization", `Bearer ${u3Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found for no such job", async function () {
    const resp = await request(app)
        .delete(`/jobs/-1`)
        .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(404);
  });
});