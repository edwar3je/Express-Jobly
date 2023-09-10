"use strict";

const db = require("../db");
const { sqlForPartialUpdate } = require("../helpers/sql");
const {
    NotFoundError,
    BadRequestError,
    UnauthorizedError,
} = require("../expressError");

/** Related functions for jobs. */

class Job {
    /** Create a job (from data), update db, return new job data.
     * 
     * data should be { title, salary, equity, companyHandle }
     * 
     * Returns { id, title, salary, equity, companyHandle }
     * 
     * Throws BadRequestError if the company handle is not in the database.
     * 
     * NOTE: For some reason, equity is converted into a string rather than a number.
     *       To avoid further issues, always convert equity to a number upon calling it in a function/method.
     */

    static async create({ title, salary, equity, companyHandle }) {
        
        const companyCheck = await db.query(
                `SELECT handle
                FROM companies
                WHERE handle = $1`,
                [companyHandle]);

        if (!companyCheck.rows[0])
            throw new BadRequestError(`Company not found: ${companyHandle}`);

        const result = await db.query(
               `INSERT INTO jobs
               (title, salary, equity, company_handle)
               VALUES ($1, $2, $3, $4)
               RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
            [
                title,
                salary,
                String(equity),
                companyHandle,
            ],
        );
        const job = result.rows[0];

        return job;
    }

    /** Find all jobs.
     * 
     * Returns [{ id, title, salary, equity, companyHandle }, ...]
     */
    
    static async findAll() {
        const result = await db.query(
            `SELECT id,
                    title,
                    salary,
                    equity,
                    company_handle AS "companyHandle"
            FROM jobs
            ORDER BY title`,
        );

        return result.rows;
    }

    /** Given an id, returns data about job.
     * 
     * Returns { id, title, salary, equity, companyHandle }
     * 
     * Throws NotFoundError if not found.
     */

    static async get(id) {
        const jobRes = await db.query(
            `SELECT id,
                    title,
                    salary,
                    equity,
                    company_handle AS "companyHandle"
            FROM jobs
            WHERE id = $1`,
            [id],
        );

        const job = jobRes.rows[0];

        if(!job) throw new NotFoundError(`No job`);

        return job;
    }

    /** Returns an array of objects that contain job information filtered by the options passed through the method.
     * 
     * Options object can have anywhere between 1 to 3 keys. Available keys include: title (string), minSalary(integer) and hasEquity(boolean)
     * 
     * For each property in options, filter is passed through the result of "Company.findAll()" to produce a filtered array.
     * Throws NotFoundError if length of final filtered array is 0.
     * 
     */

    static async filterJobs(options) {
        const { title, minSalary, hasEquity } = options;
        const data = await Job.findAll();

        let filter1;
        let filter2;
        let results;

        if (title){
            filter1 = data.filter(function(job){
                return job.title.toLowerCase().includes(title.toLowerCase())
            });
        }
        else {
            filter1 = data
        }

        if (minSalary){
            filter2 = filter1.filter(function(job){
                return job.salary >= minSalary
            });
        }
        else {
            filter2 = filter1
        }

        if (hasEquity){
            results = filter2.filter(function(job){
                return Number(job.equity) > 0
            })
        }
        else {
            results = filter2
        }

        if (results.length === 0){
            throw new NotFoundError(`No jobs match the desired criteria`);
        }
        return results
    }

    /** Update job data with `data`.
     * 
     * This is a "partial update" --- it's fine if data doesn't contain all the
     * fields; this only changes provided ones.
     * 
     * Data can include: {title, salary, equity}
     * 
     * Returns {id, title, salary, equity, companyHandle}
     * 
     * Throws NotFoundError if not found.
     */
    static async update(id, data) {
        const { setCols, values } = sqlForPartialUpdate(
            data,
            {
                companyHandle: "company_handle",
            });
        const handleVarIdx = "$" + (values.length + 1);

        const querySql = `UPDATE jobs
                          SET ${setCols}
                          WHERE id = ${handleVarIdx}
                          RETURNING id,
                                    title,
                                    salary,
                                    equity,
                                    company_handle AS "companyHandle"`;
        const result = await db.query(querySql, [...values, id]);
        const job = result.rows[0];

        if (!job) throw new NotFoundError(`No job`);

        return job;
    }

    /** Delete given job from database; returns undefined.
     * 
     * Throws NotFoundError if job is not found.
     */

    static async remove(id) {
        const result = await db.query(
            `DELETE
            FROM jobs
            WHERE id = $1
            RETURNING title`,
            [id]);
        const job = result.rows[0];

        if (!job) throw new NotFoundError(`No job`);

        return { msg: `job deleted`};
    }
}


module.exports = Job;